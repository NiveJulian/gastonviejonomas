import React, { useState } from 'react';
import {
  X,
  Settings,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Bot,
  Key,
  ExternalLink,
  Check,
  Server,
  Zap,
  FolderOpen,
  RefreshCw,
  LogOut,
  Folder,
  Send,
  MessageSquare,
  Smartphone,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  getTelegramBotInfo,
  setTelegramWebhook,
  sendTelegramTestMessage,
  type TelegramBotInfo,
} from '../services/telegramService';
import { testLlmConnection } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFormatModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenFormatModal,
}) => {
  const {
    config,
    updateConfig,
    syncWithGoogleSheets,
    isSyncing,
    syncError,
    googleUser,
    loginWithGoogle,
    logoutGoogle,
    syncDirectWithGoogle,
    telegramBotStatus,
    telegramBotError,
    connectTelegramBot,
    disconnectTelegramBot,
    exportDataJson,
    importDataJson,
  } = useFinance();

  const [monthlyIncome, setMonthlyIncome] = useState(config.monthlyIncome.toString());
  const [currency, setCurrency] = useState(config.currency);
  const [emergencyFundMinimum, setEmergencyFundMinimum] = useState(
    config.emergencyFundMinimum.toString()
  );
  const [googleClientId, setGoogleClientId] = useState(config.googleClientId || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || '');

  // Variables de Telegram Bot
  const [telegramBotToken, setTelegramBotToken] = useState(config.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId || '');
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; error?: boolean } | null>(null);

  // Variables de LLM / Agente propio del usuario (vacías por defecto para no exponer la IA provista)
  const [omnirouteBaseUrl, setOmnirouteBaseUrl] = useState(
    config.omnirouteBaseUrl && !config.omnirouteBaseUrl.includes('179.197.234.201')
      ? config.omnirouteBaseUrl
      : ''
  );
  const [omnirouteApiKey, setOmnirouteApiKey] = useState(
    config.omnirouteApiKey && !config.omnirouteApiKey.includes('sk-f1242990fcccde3e')
      ? config.omnirouteApiKey
      : ''
  );
  const [omnirouteModel, setOmnirouteModel] = useState(
    config.omnirouteModel && config.omnirouteModel !== 'auto/best-fast'
      ? config.omnirouteModel
      : ''
  );
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey || '');
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ text: string; error?: boolean } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const income = parseFloat(monthlyIncome) || 0;
    const emgMin = parseFloat(emergencyFundMinimum) || 0;

    await updateConfig({
      monthlyIncome: income,
      currency,
      emergencyFundMinimum: emgMin,
      googleClientId: googleClientId.trim(),
      appsScriptUrl: appsScriptUrl.trim(),
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
      omnirouteBaseUrl: omnirouteBaseUrl.trim(),
      omnirouteApiKey: omnirouteApiKey.trim(),
      omnirouteModel: omnirouteModel.trim(),
      geminiApiKey: geminiApiKey.trim(),
    });

    if (appsScriptUrl.trim()) {
      await syncWithGoogleSheets(appsScriptUrl.trim());
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestLlm = async () => {
    if (!omnirouteBaseUrl.trim()) {
      setLlmTestResult({ text: 'Ingresa primero la URL de tu servidor LLM.', error: true });
      return;
    }
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await testLlmConnection(
        omnirouteBaseUrl.trim(),
        omnirouteApiKey.trim(),
        omnirouteModel.trim()
      );
      setLlmTestResult({ text: res.message, error: !res.success });
    } catch (err: any) {
      setLlmTestResult({ text: err.message || 'Error al conectar con el servidor LLM.', error: true });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const handleVerifyBot = async () => {
    if (!telegramBotToken.trim()) {
      setBotError('Ingresa primero el Token del bot provisto por @BotFather.');
      return;
    }
    setIsCheckingBot(true);
    setBotError(null);
    try {
      const info = await getTelegramBotInfo(telegramBotToken.trim());
      setBotInfo(info);
    } catch (err: any) {
      setBotError(err.message || 'Token inválido o error al consultar Telegram.');
      setBotInfo(null);
    } finally {
      setIsCheckingBot(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!telegramBotToken.trim()) {
      setWebhookMsg({ text: 'Ingresa primero el Token de Telegram.', error: true });
      return;
    }
    const targetUrl = appsScriptUrl.trim() || config.appsScriptUrl;
    if (!targetUrl) {
      setWebhookMsg({
        text: 'Debes colocar la URL de tu Google Apps Script Web App en el bloque anterior.',
        error: true,
      });
      return;
    }

    setIsSettingWebhook(true);
    setWebhookMsg(null);
    try {
      const msg = await setTelegramWebhook(telegramBotToken.trim(), targetUrl);
      setWebhookMsg({ text: msg, error: false });
    } catch (err: any) {
      setWebhookMsg({ text: err.message || 'Error al vincular Webhook.', error: true });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setTestResult({ text: 'Ingresa el Token y tu Chat ID para enviar el mensaje.', error: true });
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      await sendTelegramTestMessage(
        telegramBotToken.trim(),
        telegramChatId.trim(),
        'FinanzaHogar: Notificación de prueba recibida exitosamente en tu teléfono.'
      );
      setTestResult({ text: '¡Mensaje enviado con éxito a tu Telegram!', error: false });
    } catch (err: any) {
      setTestResult({ text: err.message || 'Error enviando mensaje de prueba.', error: true });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTestSync = async () => {
    if (!appsScriptUrl.trim()) {
      alert('Por favor ingresa primero la URL de tu Google Apps Script.');
      return;
    }
    const success = await syncWithGoogleSheets(appsScriptUrl.trim());
    if (success) {
      alert('¡Conexión exitosa con tu Google Sheets y Google Drive!');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importDataJson(content);
      if (ok) {
        setImportStatus('¡Datos importados con éxito!');
      } else {
        setImportStatus('Error: Archivo de respaldo no válido.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Ajustes & Conexión</h3>
              <p className="text-xs text-slate-500">Google Sheets, Drive, Inteligencia Artificial y Parámetros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* SECCIÓN 1: ASESOR IA - CONFIGURACIÓN OPCIONAL DE MODELO PROPIO */}
          <div className="bg-indigo-50/70 rounded-2xl p-5 border border-indigo-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Configurar Modelo LLM Propio (Opcional)</h4>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" /> {omnirouteBaseUrl.trim() || geminiApiKey.trim() ? 'Modelo Propio' : 'IA Activa'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              La aplicación ya incluye inteligencia artificial activa y gratuita por defecto para el agente GASTON. Si deseas usar tu propia API de OpenAI, Groq, OpenRouter o un modelo local como Ollama, puedes ingresar tus credenciales aquí (reemplazará automáticamente la IA provista):
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Base de tu API (ej: https://api.openai.com/v1 o http://localhost:11434/v1)
                </label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={omnirouteBaseUrl}
                  onChange={(e) => setOmnirouteBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tu API Key (sk-...)
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={omnirouteApiKey}
                    onChange={(e) => setOmnirouteApiKey(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Modelo (ej: gpt-4o-mini, llama-3.3-70b-versatile)
                  </label>
                  <input
                    type="text"
                    placeholder="gpt-4o-mini"
                    value={omnirouteModel}
                    onChange={(e) => setOmnirouteModel(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none bg-white font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Botón de prueba de conexión */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestLlm}
                  disabled={isTestingLlm}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTestingLlm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verificando conexión...
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" /> Probar Conexión LLM
                    </>
                  )}
                </button>

                {llmTestResult && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                      llmTestResult.error
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800 font-semibold'
                    }`}
                  >
                    {llmTestResult.error ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {llmTestResult.text}
                  </span>
                )}
              </div>

              {/* Google Gemini API Key alternativa */}
              <div className="pt-2 border-t border-indigo-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clave API de Google Gemini (Opcional alternativa)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: VINCULACIÓN CON GOOGLE SHEETS & DRIVE */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">Conexión con Google Sheets & Drive</h4>
              </div>
              {googleUser ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vinculado con Google
                </span>
              ) : config.appsScriptUrl ? (
                syncError ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Error de conexión
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado a Apps Script
                  </span>
                )
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                  Modo Local (Sin sincronizar)
                </span>
              )}
            </div>

            {/* Sub-bloque 2.1: Conexión Directa Google OAuth (Recomendado sin bases de datos) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Conexión Directa Oficial (Sin Servidores ni Scripts)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Crea automáticamente las tablas de Gastos, Inversiones, Ahorros y carpeta de recibos en Drive
                  </span>
                </div>
              </div>

              {googleUser ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      {googleUser.picture ? (
                        <img
                          src={googleUser.picture}
                          alt={googleUser.name}
                          className="w-8 h-8 rounded-full border border-slate-300"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {googleUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{googleUser.name}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{googleUser.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => syncDirectWithGoogle()}
                        disabled={isSyncing}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={logoutGoogle}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg text-xs font-semibold text-rose-600 flex items-center gap-1 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Desvincular</span>
                      </button>
                    </div>
                  </div>

                  {/* Enlaces directos a Google Sheets y Drive */}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {config.googleSpreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${config.googleSpreadsheetId}/edit`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Abrir Hoja de Cálculo</span>
                        <ExternalLink className="w-3 h-3 text-emerald-500" />
                      </a>
                    )}
                    {config.googleDriveFolderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${config.googleDriveFolderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
                        <span>Carpeta de Comprobantes</span>
                        <ExternalLink className="w-3 h-3 text-sky-500" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={loginWithGoogle}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Vincular mi cuenta de Google ahora</span>
                  </button>
                </div>
              )}

              {/* Client ID opcional */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Google Client ID OAuth 2.0 (Opcional - usa predeterminado si se deja vacío)
                </label>
                <input
                  type="text"
                  placeholder="ej. 123456789-abc.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Sub-bloque 2.2: Conexión alternativa Apps Script Web App */}
            <details className="text-xs group">
              <summary className="font-semibold text-slate-700 cursor-pointer hover:text-slate-900 flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <span>Método alternativo: Google Apps Script Web App</span>
                <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL de tu Google Apps Script (Web App)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={appsScriptUrl}
                      onChange={(e) => setAppsScriptUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestSync}
                      disabled={isSyncing}
                      className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isSyncing ? 'Probando...' : 'Sincronizar'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1 text-slate-600">
                  <span className="font-bold text-slate-800 block">¿Cómo obtener la URL?</span>
                  <p>
                    Abre tu hoja en Google Sheets, ve a <strong>Extensiones → Apps Script</strong>, pega el código de <code>google-apps-script/Code.gs</code>, pulsa <strong>Implementar → Nueva implementación → Aplicación web</strong> (acceso: Cualquier usuario) y pega el enlace aquí.
                  </p>
                </div>
              </div>
            </details>
          </div>

          {/* SECCIÓN: TELEGRAM BOT PERSONAL (CONFIGURACIÓN ULTRA SIMPLE) */}
          <div className="bg-sky-50/70 rounded-2xl p-5 border border-sky-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  T
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bot de Telegram Personal</h4>
                  <p className="text-[11px] text-slate-500">Conéctalo en 2 simples pasos para registrar gastos y consultar saldos desde tu celular.</p>
                </div>
              </div>
              <div>
                {telegramBotStatus === 'connected' ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Conectado y escuchando
                  </span>
                ) : telegramBotStatus === 'connecting' ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Conectando...
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                    Desconectado
                  </span>
                )}
              </div>
            </div>

            {/* PASO 1 Y PASO 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* PASO 1 */}
              <div className="p-3.5 bg-white rounded-xl border border-sky-200/90 flex flex-col justify-between space-y-2.5">
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">Paso 1: Obtener el Bot</span>
                  <p className="text-xs text-slate-600 mt-1">
                    Crea tu bot en Telegram hablando con BotFather. Solo escríbele <code>/newbot</code> y te dará un Token.
                  </p>
                </div>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir @BotFather en Telegram</span>
                </a>
              </div>

              {/* PASO 2 */}
              <div className="p-3.5 bg-white rounded-xl border border-sky-200/90 flex flex-col justify-between space-y-2.5">
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">Paso 2: Pegar Token</span>
                  <p className="text-xs text-slate-600 mt-1">
                    Pega el Token que te dio BotFather a continuación:
                  </p>
                </div>
                <div className="space-y-1.5">
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIJKlmNoPQ..."
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-sky-200 focus:border-sky-500 outline-none bg-slate-50 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* BOTÓN PRINCIPAL DE CONEXIÓN */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-600">
                {telegramBotStatus === 'connected' ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    El bot está activo y responde tus mensajes en tiempo real.
                  </span>
                ) : (
                  <span>Presiona el botón para enlazar y activar el bot inmediatamente sin tocar código.</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {telegramBotStatus === 'connected' ? (
                  <button
                    type="button"
                    onClick={disconnectTelegramBot}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                  >
                    Desconectar Bot
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!telegramBotToken.trim()) {
                        setBotError('Pega primero el token de @BotFather en el Paso 2.');
                        return;
                      }
                      setBotError(null);
                      await connectTelegramBot(telegramBotToken.trim());
                      await handleVerifyBot();
                    }}
                    disabled={telegramBotStatus === 'connecting'}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>{telegramBotStatus === 'connecting' ? 'Conectando...' : 'Conectar Bot al Instante'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* ERROR EN LA CONEXIÓN DIRECTA */}
            {telegramBotError && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1 p-2 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{telegramBotError}</span>
              </p>
            )}

            {/* BOT INFORMACIÓN CONFIRMADA */}
            {botInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Bot verificado: <strong>{botInfo.first_name}</strong> (@{botInfo.username})
                  </span>
                </div>
                {botInfo.username && (
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white rounded-xl border border-emerald-300 font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 text-xs shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Probar en Telegram</span>
                  </a>
                )}
              </div>
            )}

            {/* OPCIONES AVANZADAS: MODO 24/7 EN LA NUBE (APPS SCRIPT) */}
            <details className="text-xs text-slate-500 pt-1 group">
              <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 list-none flex items-center justify-between p-2 rounded-xl bg-white/70 border border-sky-100">
                <span>¿Deseas que responda las 24 horas con tu computadora apagada? (Opcional - Apps Script)</span>
                <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 space-y-3 bg-white p-3.5 rounded-xl border border-sky-100 mt-2">
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  El modo por defecto funciona directamente en tu navegador mientras uses la aplicacion. Si deseas que responda de forma permanente en los servidores de Google:
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    URL de tu Google Apps Script Web App
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={appsScriptUrl}
                      onChange={(e) => setAppsScriptUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSetWebhook}
                      disabled={isSettingWebhook || !telegramBotToken.trim() || !appsScriptUrl.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isSettingWebhook ? 'Vinculando...' : 'Vincular Webhook en la Nube'}
                    </button>
                  </div>
                </div>

                {webhookMsg && (
                  <p
                    className={`text-xs font-medium p-2 rounded-lg ${
                      webhookMsg.error
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {webhookMsg.text}
                  </p>
                )}

                {/* Chat ID para notificaciones */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tu Chat ID personal (opcional, para avisos y alertas privadas)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ej. 987654321"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestMessage}
                      disabled={isSendingTest || !telegramBotToken.trim() || !telegramChatId.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingTest ? 'Enviando...' : 'Enviar Alerta de Prueba'}</span>
                    </button>
                  </div>
                  {testResult && (
                    <p className={`text-xs font-medium pt-1 ${testResult.error ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {testResult.text}
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>

          {/* SECCIÓN 3: PARÁMETROS FINANCIEROS */}
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Parámetros Financieros del Hogar</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ingreso Mensual Estimado
                </label>
                <input
                  type="number"
                  step="any"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda / Símbolo</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="$"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Piso Fondo Emergencia
                </label>
                <input
                  type="number"
                  step="any"
                  value={emergencyFundMinimum}
                  onChange={(e) => setEmergencyFundMinimum(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                />
              </div>
            </div>

              <div className="flex justify-between items-center pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Configuración guardada correctamente
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Guardar Ajustes
                </button>
              </div>
            </div>
          </form>

          {/* SECCIÓN 5: RESPALDO LOCAL JSON */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-800 block">Copia de Seguridad Offline</span>
              <span className="text-slate-400">Descarga o restaura todos tus datos en un archivo JSON</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportDataJson}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>

              <label className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Importar JSON</span>
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>
          {importStatus && (
            <p className="text-xs text-center font-semibold text-emerald-600">{importStatus}</p>
          )}

          {/* SECCIÓN 6: FORMATEO TOTAL A CERO */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Formatear Todos los Datos
                </span>
                <span className="text-rose-700/80">
                  Restablece todos los gastos, ingresos, inversiones y ahorros a cero en un solo clic.
                </span>
              </div>

              {onOpenFormatModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFormatModal();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Formatear a Cero</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
