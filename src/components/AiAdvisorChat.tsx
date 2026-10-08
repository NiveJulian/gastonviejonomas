import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { askFinancialAdvisor } from '../services/geminiService';
import type { ChatMessage } from '../types/finance';
import { formatMoney } from '../utils/helpers';
import confetti from 'canvas-confetti';

interface AiAdvisorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  'Quiero registrar un ingreso',
  '¿Puedo comprarme algo de $ 50.000 o me corto las piernas?',
  '¿Llego a fin de mes o ya estoy en el horno?',
  'Presupuestar nafta para el mes (cargo $ 18.000 cada 3 dias)',
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
    addExpense,
    addIncome,
  } = useFinance();

  const getWelcomeText = (user: typeof googleUser) => {
    if (!user || !user.name) {
      return '¡Che, pedazo de boludo! Ni siquiera estás logueado con Google. ¿Cómo querés que no crucemos los datos con cualquier fantasma si ni sé quién sos? Dejá de ser tan boludo, iniciá sesión con Google para blindar tus números en tu Google Drive y recién ahí te tiro la posta. ¡Vamoooo Messi!\n\n[ACTION:LOGIN_GOOGLE]';
    }
    return `¡Qué hacés, ${user.name}! Soy GASTON, tu asesor financiero ricotero, maradoniano y messiánico de pura cepa. Mis números están calibrados exclusivamente con tu cuenta de Google para no cruzar un solo dato. ¿En qué pensabas patinarte la guita hoy? ¡Vamoooo Messi!`;
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

  // Si el usuario inicia sesión mientras el chat está abierto, avisarle y darle la bienvenida
  useEffect(() => {
    if (!prevGoogleUserRef.current && googleUser?.name) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'login_detected_' + Date.now(),
          sender: 'assistant',
          text: `¡Por fin diste la cara, ${googleUser.name}! Ahora sí tenemos la cancha marcada y los datos en tu Google Drive sin cruzarse con nadie. ¿Qué querías consultar? ¡Vamoooo Messi!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    prevGoogleUserRef.current = googleUser;
  }, [googleUser]);

  if (!isOpen) return null;

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
      const responseText = await askFinancialAdvisor(
        query.trim(),
        messages,
        expenses,
        savings,
        investments,
        config,
        incomes,
        googleUser
      );

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: 'bot_err_' + Date.now(),
        sender: 'assistant',
        text: '¡Epa! Se me trabó el mate con la señal, pero acá la pelota no se mancha. Volvé a tirarme la consulta y te canto la justa. ¡Vamoooo Messi!',
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

  // Manejo de acciones interactivas embebidas en los mensajes
  const handleExecuteAction = async (actionString: string, messageId: string) => {
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

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));

      const confirmMsg: ChatMessage = {
        id: 'action_confirm_' + Date.now(),
        sender: 'assistant',
        text: `Accion ejecutada: Se creo la meta "${goalName}" con objetivo de ${formatMoney(
          targetAmount,
          config.currency
        )}. Registrada en Ahorros y Google Sheets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } else if (actionString.startsWith('CREATE_EXPENSE|')) {
      const parts = actionString.replace('CREATE_EXPENSE|', '').split('|');
      const desc = parts[0] || 'Gasto';
      const amount = parseFloat(parts[1]) || 10000;
      const category = parts[2] || 'Transporte y Combustible';

      await addExpense({
        description: desc,
        amount,
        category,
        type: 'variable',
        paymentMethod: 'Tarjeta / Transferencia',
        date: new Date().toISOString().split('T')[0],
      });

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));

      const confirmMsg: ChatMessage = {
        id: 'action_confirm_' + Date.now(),
        sender: 'assistant',
        text: `Accion ejecutada: Se registro el gasto "${desc}" por ${formatMoney(
          amount,
          config.currency
        )} en historial y Google Sheets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
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

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      setExecutedActions((prev) => ({ ...prev, [actionString]: true }));

      const confirmMsg: ChatMessage = {
        id: 'action_confirm_' + Date.now(),
        sender: 'assistant',
        text: `Accion ejecutada: Se registro el ingreso "${desc}" por ${formatMoney(
          amount,
          config.currency
        )} en tus ingresos y Google Sheets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } else if (actionString === 'LOGIN_GOOGLE') {
      await loginWithGoogle();
    }
  };

  // Renderiza el contenido del mensaje extrayendo las directivas [ACTION:...]
  const renderMessageContent = (msg: ChatMessage) => {
    const actionRegex = /\[ACTION:([^\]]+)\]/g;
    const actions: string[] = [];
    let match;

    while ((match = actionRegex.exec(msg.text)) !== null) {
      actions.push(match[1]);
    }

    const cleanText = msg.text.replace(actionRegex, '').trim();

    return (
      <div className="space-y-2.5">
        <div className="whitespace-pre-line leading-relaxed">{cleanText}</div>

        {/* Botones de acción ejecutable */}
        {actions.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            {actions.map((act, idx) => {
              if (act === 'LOGIN_GOOGLE') {
                return (
                  <button
                    key={idx}
                    onClick={() => handleExecuteAction(act, msg.id)}
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
                );
              }

              const isDone = !!executedActions[act];
              const isGoal = act.startsWith('CREATE_GOAL|');
              const isIncome = act.startsWith('CREATE_INCOME|');
              const parts = act.replace(/^(CREATE_GOAL|CREATE_EXPENSE|CREATE_INCOME)\|/, '').split('|');
              const label = parts[0];
              const amount = parseFloat(parts[1]) || 0;

              return (
                <button
                  key={idx}
                  onClick={() => handleExecuteAction(act, msg.id)}
                  disabled={isDone}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-xs ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isIncome
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isIncome ? (
                      <TrendingUp className="w-4 h-4 shrink-0 text-white" />
                    ) : isGoal ? (
                      <Target className="w-4 h-4 shrink-0 text-white" />
                    ) : (
                      <PlusCircle className="w-4 h-4 shrink-0 text-white" />
                    )}
                    <span>
                      {isDone
                        ? 'Registrado: '
                        : isGoal
                        ? 'Crear Meta: '
                        : isIncome
                        ? 'Cargar Ingreso: '
                        : 'Registrar Gasto: '}
                      <strong>{label}</strong> ({formatMoney(amount, config.currency)})
                    </span>
                  </span>

                  {!isDone && <ArrowRight className="w-4 h-4 shrink-0 ml-2" />}
                </button>
              );
            })}
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
                IA Activa
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {googleUser?.name ? `Cuenta: ${googleUser.name}` : 'No logueado con Google'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Reiniciar chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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
            <span>Calculando presupuesto con tus números...</span>
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
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors font-medium shrink-0"
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
          placeholder="Ej: Necesito calcular combustible o destinar plata..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors shrink-0 shadow-xs"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
