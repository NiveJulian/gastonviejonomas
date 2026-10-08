import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Settings,
  Sparkles,
  PieChart,
  Home,
  TrendingUp,
  PiggyBank,
  Layers,
  Compass,
  Bot,
  Users,
  LogOut,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  Shield,
  Send,
  ArrowUpRight,
  Trash2,
  Download,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/helpers';
import { calculateFinancialTotals } from '../utils/rulesEngine';

export type NavTab =
  | 'dashboard'
  | 'evaluator'
  | 'incomes'
  | 'expenses'
  | 'investments'
  | 'savings'
  | 'allocator'
  | 'comfort';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenFormatModal: () => void;
  onOpenEvaluatorModal: () => void;
  onOpenShareModal: () => void;
  onOpenInstallModal: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenExpenseModal,
  onOpenIncomeModal,
  onOpenSettingsModal,
  onOpenFormatModal,
  onOpenEvaluatorModal,
  onOpenShareModal,
  onOpenInstallModal,
  onToggleChat,
  isChatOpen,
}) => {
  const {
    config,
    expenses,
    incomes,
    savings,
    isSyncing,
    syncError,
    googleUser,
    loginWithGoogle,
    logoutGoogle,
    syncDirectWithGoogle,
    telegramBotStatus,
  } = useFinance();

  const totals = calculateFinancialTotals(expenses, savings, config, incomes);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar sidebar al cambiar de pestaña
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const navItems: {
    id: NavTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    color: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Resumen financiero general',
      icon: PieChart,
      color: 'text-slate-700',
    },
    {
      id: 'incomes',
      label: 'Ingresos',
      description: 'Sueldos, honorarios y extras',
      icon: ArrowUpRight,
      badge: incomes.length,
      color: 'text-emerald-600',
    },
    {
      id: 'expenses',
      label: 'Gastos del Hogar',
      description: 'Historial y comprobantes',
      icon: Home,
      badge: expenses.length,
      color: 'text-rose-600',
    },
    {
      id: 'investments',
      label: 'Inversiones',
      description: 'Plazos fijos, FCI y CEDEARs',
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
    {
      id: 'savings',
      label: 'Ahorros & Emergencia',
      description: 'Metas y colchón intocable',
      icon: PiggyBank,
      color: 'text-sky-600',
    },
    {
      id: 'evaluator',
      label: '¿Puedo comprarlo?',
      description: 'Validador de compras',
      icon: Sparkles,
      color: 'text-amber-600',
    },
    {
      id: 'allocator',
      label: 'Destinar Fondos',
      description: 'Rebalanceo inteligente',
      icon: Layers,
      color: 'text-teal-600',
    },
    {
      id: 'comfort',
      label: 'Calculadora Confort',
      description: 'Regla 50/30/20 y holgura',
      icon: Compass,
      color: 'text-indigo-600',
    },
  ];

  const currentTabItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. TOP NAVBAR PRINCIPAL (LIMPIO Y COMPACTO)               */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15">
            {/* Izquierda: Botón Sidebar + Logo + Vista Actual */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                title="Abrir menú de navegación"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <div
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-900 tracking-tight">GASTONAPP</span>
                  {googleUser && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:block" title="Sheets conectado" />
                  )}
                </div>
              </div>

              {/* Píldora de vista activa en Desktop */}
              <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs font-semibold text-slate-600">
                <CurrentIcon className={`w-3.5 h-3.5 ${currentTabItem.color}`} />
                <span>{currentTabItem.label}</span>
              </div>
            </div>

            {/* Centro: Dinero Libre Rápido (Desktop) */}
            <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-xl text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-tight">
                  Dinero Libre
                </span>
                <span className={`font-bold ${totals.freeCashFlow > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatMoney(totals.freeCashFlow, config.currency)}
                </span>
              </div>
              <div className="h-5 w-[1px] bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-tight">
                  Fondo Emergencia
                </span>
                <span className="font-bold text-slate-700">
                  {formatMoney(totals.emergencyFundBalance, config.currency)}
                </span>
              </div>
            </div>

            {/* Derecha: Acciones Rápidas */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Botón "+ Ingreso" */}
              <button
                onClick={onOpenIncomeModal}
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all shadow-2xs"
                title="Cargar un nuevo ingreso"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Ingreso</span>
              </button>

              {/* Botón "+ Gasto" */}
              <button
                onClick={onOpenExpenseModal}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                title="Cargar un nuevo gasto"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Gasto</span>
              </button>

              {/* Botón "¿Puedo comprarlo?" */}
              <button
                onClick={onOpenEvaluatorModal}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/70 transition-colors shadow-2xs"
                title="Evaluar compra"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>¿Puedo?</span>
              </button>

              {/* Botón Asesor IA */}
              <button
                onClick={onToggleChat}
                className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition-all border shadow-2xs ${
                  isChatOpen
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
                }`}
                title="Asesor Financiero IA"
              >
                <Bot className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">Asesor IA</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              {/* Menú Desplegable de Cuenta / Google / Ajustes */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl border transition-all ${
                    googleUser
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Cuenta, Sincronización y Ajustes"
                >
                  {googleUser ? (
                    googleUser.picture ? (
                      <img
                        src={googleUser.picture}
                        alt={googleUser.name}
                        className="w-7 h-7 rounded-lg border border-slate-300 object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        {googleUser.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      <Settings className="w-4 h-4" />
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown flotante */}
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Encabezado del usuario */}
                    {googleUser ? (
                      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                        {googleUser.picture ? (
                          <img
                            src={googleUser.picture}
                            alt=""
                            className="w-9 h-9 rounded-full border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            {googleUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{googleUser.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{googleUser.email}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                            Sheets Conectado
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border-b border-slate-100">
                        <button
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            loginWithGoogle();
                          }}
                          className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 shadow-2xs"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                          <span>Vincular Google</span>
                        </button>
                      </div>
                    )}

                    {/* Acciones del menú */}
                    <div className="py-1 text-xs text-slate-700">
                      {googleUser && (
                        <>
                          <button
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              syncDirectWithGoogle();
                            }}
                            disabled={isSyncing}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                              <span>Sincronizar Datos</span>
                            </span>
                            {isSyncing && <span className="text-[10px] text-emerald-600">Sincronizando...</span>}
                          </button>

                          <button
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              onOpenShareModal();
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 transition-colors"
                          >
                            <Users className="w-4 h-4 text-slate-500" />
                            <span>Compartir Hoja</span>
                          </button>

                          {config.googleSpreadsheetId && (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${config.googleSpreadsheetId}/edit`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 transition-colors"
                              onClick={() => setIsAccountMenuOpen(false)}
                            >
                              <span className="flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-slate-400" />
                                <span>Abrir en Google Sheets</span>
                              </span>
                            </a>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onOpenSettingsModal();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-sky-500" />
                          <span>Bot de Telegram</span>
                        </span>
                        {telegramBotStatus === 'connected' ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Conectar</span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onOpenSettingsModal();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Ajustes & Parámetros</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          onOpenInstallModal();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 transition-colors font-medium"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>Instalar en el Celular</span>
                      </button>

                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenFormatModal();
                          }}
                          className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span>Formatear Datos a Cero</span>
                        </button>
                      </div>

                      {googleUser && (
                        <div className="pt-1 mt-1 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              logoutGoogle();
                            }}
                            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar sesión de Google</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SIDEBAR DRAWER (LATERAL DESPLEGABLE)                    */}
      {/* ========================================================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fondo semitransparente con blur */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Panel lateral */}
          <aside className="relative w-72 sm:w-80 bg-white h-full shadow-2xl z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              {/* Cabecera del Sidebar */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block leading-none">GASTONAPP</span>
                    <span className="text-[10px] text-slate-400">Panel de Control</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de navegación */}
              <div className="p-3 space-y-4">
                {/* Grupo 1: Finanzas Principales */}
                <div>
                  <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Control Financiero
                  </span>
                  <nav className="space-y-1">
                    {navItems.slice(0, 4).map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                            <div className="text-left">
                              <span className="block leading-tight">{item.label}</span>
                              <span className={`text-[10px] block leading-tight ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                {item.description}
                              </span>
                            </div>
                          </div>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[11px] px-2 py-0.2 rounded-full font-medium ${
                                isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Grupo 2: Herramientas de Decisión */}
                <div>
                  <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estrategia & Decisiones
                  </span>
                  <nav className="space-y-1">
                    {navItems.slice(4).map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                            <div className="text-left">
                              <span className="block leading-tight">{item.label}</span>
                              <span className={`text-[10px] block leading-tight ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                {item.description}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Grupo 3: Asistente & Compartir */}
                <div>
                  <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Asistente & Accesos
                  </span>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onToggleChat();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-900 hover:bg-indigo-50 transition-colors"
                    >
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>Asesor Financiero IA</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onOpenShareModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Compartir Datos</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onOpenSettingsModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Send className="w-4 h-4 text-sky-500" />
                        <span>Bot de Telegram</span>
                      </div>
                      {telegramBotStatus === 'connected' ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Conectar</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onOpenSettingsModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Ajustes & Parámetros</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onOpenInstallModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Instalar en el Celular</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onOpenFormatModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Formatear Datos a Cero</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Sidebar: Tarjeta de Resumen & Cuenta */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">Dinero Libre Mes</span>
                  <span className={`font-bold ${totals.freeCashFlow > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatMoney(totals.freeCashFlow, config.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">Fondo Emergencia</span>
                  <span className="font-bold text-slate-700">
                    {formatMoney(totals.emergencyFundBalance, config.currency)}
                  </span>
                </div>
              </div>

              {googleUser ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 min-w-0">
                    {googleUser.picture ? (
                      <img src={googleUser.picture} alt="" className="w-7 h-7 rounded-full shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {googleUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">{googleUser.name}</p>
                      <p className="text-[10px] text-slate-400 truncate leading-tight">{googleUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={logoutGoogle}
                    title="Cerrar sesión de Google"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    loginWithGoogle();
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
                >
                  Vincular Cuenta Google
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BARRA INFERIOR PARA MOBILE (THUMB-FRIENDLY & ELEGANTE)  */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 flex items-center justify-around">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        {/* Ingresos */}
        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'incomes' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 mb-0.5 text-emerald-600" />
          <span className="text-[10px]">Ingresos</span>
        </button>

        {/* Gastos */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'expenses' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Gastos</span>
        </button>

        {/* Botón Central: + Cargar Gasto (FAB) */}
        <button
          onClick={onOpenExpenseModal}
          className="flex flex-col items-center justify-center -mt-4 bg-emerald-600 hover:bg-emerald-700 text-white w-11 h-11 rounded-full shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 border-2 border-white"
          title="Cargar Gasto"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Validador */}
        <button
          onClick={() => setActiveTab('evaluator')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'evaluator' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-amber-600" />
          <span className="text-[10px]">¿Puedo?</span>
        </button>

        {/* Menú Sidebar */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Menú</span>
        </button>
      </div>
    </>
  );
};
