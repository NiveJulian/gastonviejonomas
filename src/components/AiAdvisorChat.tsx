import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { askFinancialAdvisor } from '../services/geminiService';
import { processAgentInstruction, type AgentExecutionContext } from '../services/agentEngine';
import type { ChatMessage } from '../types/finance';
import confetti from 'canvas-confetti';

interface AiAdvisorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  'Anotá un gasto de $ 15.000 en el súper',
  'Cobré 450.000 de sueldo',
  '¿Cuánto debería ganar por día para llegar a la meta?',
  '¿Cuánto vengo vendiendo en la semana por categoría?',
  'Calculá mi confort financiero (50/30/20)',
  '¿Cuánto ingresó y cuánto se gastó este mes?',
];

export const AiAdvisorChat: React.FC<AiAdvisorChatProps> = ({ isOpen, onClose }) => {
  const {
    expenses,
    incomes,
    savings,
    investments,
    config,
    googleUser,
    loginWithGoogle,
    addSavingsGoal,
    updateSavingsAmount,
    deleteSavingsGoal,
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    updateIncome,
    deleteIncome,
    addInvestment,
    deleteInvestment,
    updateConfig,
  } = useFinance();

  const getWelcomeText = (user: typeof googleUser) => {
    if (!user || !user.name) {
      return `¡Hola! Soy GASTON, tu agente y asesor financiero inteligente.

Puedo registrar gastos fijos y variables, cobros e ingresos, metas de ahorro y fondos de emergencia. Además, calculo tu nivel de confort financiero (50/30/20), automatizo cuánto deberías ganar por día para llegar a tu meta y analizo tus ventas semanales por categoría.

Tus datos están protegidos en este dispositivo. Si querés sincronizar con tu Google Drive y Sheets, podés iniciar sesión con Google cuando gustes.

[ACTION:LOGIN_GOOGLE]`;
    }
    const firstName = user.name.split(' ')[0];
    return `¡Hola, ${firstName}! Soy GASTON, tu agente y asesor financiero autónomo.

Todo lo que me pidas se procesará y ejecutará automáticamente en tu aplicación y en tu Google Sheets:
• "Anotá un gasto de 15.000 en el súper" o "Pagué 180k de alquiler"
• "Cobré 450.000 de sueldo" o "Ahorré 50k para el fondo de emergencia"
• "¿Cuánto debería ganar por día para llegar a la meta?"
• "¿Cuánto vengo vendiendo en la semana según la categoría?"
• "Calculá mi confort financiero (50/30/20)"
• "¿Cuánto ingresó y cuánto se gastó este mes?"

¿Qué movimiento querés registrar o consultar hoy?`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: getWelcomeText(googleUser),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevGoogleUserRef = useRef(googleUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Si el usuario inicia sesión mientras el chat está abierto, darle la bienvenida personalizada
  useEffect(() => {
    if (!prevGoogleUserRef.current && googleUser?.name) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'login_detected_' + Date.now(),
          sender: 'assistant',
          text: `¡Excelente, ${googleUser.name.split(' ')[0]}! Cuenta vinculada exitosamente. Tus operaciones se sincronizan ahora directamente con tu Google Drive y Sheets.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    prevGoogleUserRef.current = googleUser;
  }, [googleUser]);

  if (!isOpen) return null;

  // Manejo de acciones ejecutadas desde tags del LLM
  const handleExecuteAction = async (actionString: string) => {
    if (executedActions[actionString]) return;

    if (actionString.startsWith('CREATE_GOAL|')) {
      const parts = actionString.replace('CREATE_GOAL|', '').split('|');
      const goalName = parts[0] || 'Meta de Ahorro';
      const targetAmount = parseFloat(parts[1]) || 100000;
      const notes = parts[2] || 'Creada desde el Asesor IA';

      await addSavingsGoal({
        name: goalName,
        isEmergencyFund: false,
        targetAmount,
        currentAmount: 0,
        notes,
      });

      confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));
    } else if (actionString.startsWith('CREATE_EXPENSE|')) {
      const parts = actionString.replace('CREATE_EXPENSE|', '').split('|');
      const desc = parts[0] || 'Gasto';
      const amount = parseFloat(parts[1]) || 10000;
      const category = parts[2] || 'Otros Gastos';

      await addExpense({
        description: desc,
        amount,
        category,
        type: 'variable',
        paymentMethod: 'Tarjeta / Transferencia',
        date: new Date().toISOString().split('T')[0],
      });

      confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));
    } else if (actionString.startsWith('CREATE_INCOME|')) {
      const parts = actionString.replace('CREATE_INCOME|', '').split('|');
      const desc = parts[0] || 'Ingreso';
      const amount = parseFloat(parts[1]) || 0;
      const category = parts[2] || 'Sueldo / Salario';

      if (addIncome) {
        await addIncome({
          description: desc,
          amount,
          category,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Transferencia / Efectivo',
          notes: 'Registrado desde Asesor IA GASTON',
        });
      }

      confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));
    } else if (actionString === 'LOGIN_GOOGLE') {
      await loginWithGoogle();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const execCtx: AgentExecutionContext = {
        expenses,
        incomes,
        savings,
        investments,
        config,
        googleUser,
        addExpense,
        updateExpense,
        deleteExpense,
        addIncome,
        updateIncome,
        deleteIncome,
        addSavingsGoal,
        updateSavingsAmount,
        deleteSavingsGoal,
        addInvestment,
        deleteInvestment,
        updateConfig,
      };

      // 1. Procesar con el motor semántico de CRUD y aprendizaje continuo
      const execResult = await processAgentInstruction(query.trim(), execCtx);

      let responseText = execResult.reply;
      let actionBadge = execResult.actionExecuted?.summary;
      let actionType = execResult.actionExecuted?.type;

      if (execResult.actionExecuted) {
        if (
          execResult.actionExecuted.type === 'CREATE_EXPENSE' ||
          execResult.actionExecuted.type === 'CREATE_INCOME' ||
          execResult.actionExecuted.type === 'CREATE_GOAL' ||
          execResult.actionExecuted.type === 'ALLOCATE_SAVINGS' ||
          execResult.actionExecuted.type === 'UPDATE_EMERGENCY_FUND'
        ) {
          confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
        }
      } else {
        // 2. Si no fue una orden CRUD directa y hay LLM configurado, consultar al LLM
        const hasLlm =
          (config.omnirouteBaseUrl && config.omnirouteBaseUrl.trim()) ||
          (config.geminiApiKey && config.geminiApiKey.trim());

        if (hasLlm) {
          try {
            const llmReply = await askFinancialAdvisor(
              query.trim(),
              messages,
              expenses,
              savings,
              investments,
              config,
              incomes,
              googleUser
            );

            if (llmReply && llmReply.trim()) {
              responseText = llmReply;

              // Parsear y ejecutar automáticamente cualquier directiva [ACTION:...]
              const actionRegex = /\[ACTION:([^\]]+)\]/g;
              let match;
              while ((match = actionRegex.exec(llmReply)) !== null) {
                const actStr = match[1];
                await handleExecuteAction(actStr);
              }
              responseText = responseText.replace(actionRegex, '').trim();
            }
          } catch (err) {
            console.warn('Error en consulta LLM:', err);
          }
        }
      }

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: responseText,
        actionBadge,
        actionType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error procesando mensaje:', err);
      const errorMsg: ChatMessage = {
        id: 'bot_err_' + Date.now(),
        sender: 'assistant',
        text: 'Ocurrió un error al procesar la instrucción. Por favor, volvé a indicarme el movimiento que deseás realizar.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'assistant',
        text: getWelcomeText(googleUser),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setExecutedActions({});
  };

  // Renderiza el contenido del mensaje
  const renderMessageContent = (msg: ChatMessage) => {
    const actionRegex = /\[ACTION:([^\]]+)\]/g;
    const actions: string[] = [];
    let match;

    while ((match = actionRegex.exec(msg.text)) !== null) {
      actions.push(match[1]);
    }

    const cleanText = msg.text.replace(actionRegex, '').trim();

    return (
      <div className="space-y-2">
        <div className="whitespace-pre-line leading-relaxed">{cleanText}</div>

        {/* Badge de acción CRUD ejecutada automáticamente */}
        {msg.actionBadge && (
          <div className="pt-1.5 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                msg.actionType?.includes('DELETE')
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : msg.actionType?.includes('UPDATE') || msg.actionType?.includes('LEARN')
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {msg.actionType?.includes('DELETE') ? (
                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : msg.actionType?.includes('UPDATE') || msg.actionType?.includes('LEARN') ? (
                <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              <span>{msg.actionBadge}</span>
            </span>
          </div>
        )}

        {/* Botón de Google Login si se solicita */}
        {actions.includes('LOGIN_GOOGLE') && !googleUser && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => loginWithGoogle()}
              className="w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Iniciar Sesión con Google</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50 w-auto sm:w-full sm:max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh] sm:h-[650px] max-h-[92vh] transition-all animate-in fade-in slide-in-from-bottom-5">
      {/* Cabecera */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-slate-900 shadow-sm">
            <Sparkles className="w-5 h-5 fill-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">Asesor Financiero IA</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30">
                Agente Autónomo CRUD
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {googleUser?.name ? `Cuenta: ${googleUser.name}` : 'Modo local activo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Reiniciar chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white shadow-xs rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs'
              }`}
            >
              {renderMessageContent(msg)}
              <span
                className={`text-[10px] block mt-1.5 ${
                  msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 bg-white rounded-2xl border border-slate-200 w-fit">
            <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Procesando instrucción y actualizando tus finanzas...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preguntas Sugeridas */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors font-medium shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input de Envío */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ej: Anotá un gasto de 12.000, cobré 450k, o cambiá el último gasto..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors shrink-0 shadow-xs cursor-pointer"
          title="Enviar instrucción"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
