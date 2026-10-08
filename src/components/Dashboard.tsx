import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  PlusCircle,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatDate, getCurrentYearMonth } from '../utils/helpers';
import { calculateFinancialTotals } from '../utils/rulesEngine';

// Chart.js imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface DashboardProps {
  onOpenExpenseModal: () => void;
  onOpenIncomeModal?: () => void;
  onOpenEvaluator: () => void;
  onNavigateTab: (tab: 'evaluator' | 'expenses' | 'investments' | 'savings' | 'incomes') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenExpenseModal,
  onOpenIncomeModal,
  onOpenEvaluator,
  onNavigateTab,
}) => {
  const { expenses, incomes, investments, savings, config, googleUser, loginWithGoogle } = useFinance();
  const totals = calculateFinancialTotals(expenses, savings, config, incomes);

  const totalInvestments = investments.reduce((sum, i) => sum + Number(i.currentValue || 0), 0);
  const netWorth = totals.totalSavingsBalance + totalInvestments + totals.freeCashFlow;

  // Gastos por categoría para el gráfico de torta/dona
  const currentYM = getCurrentYearMonth();
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentYM));

  const categoryMap: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount || 0);
  });

  const categoryLabels = Object.keys(categoryMap);
  const categoryValues = Object.values(categoryMap);

  const colors = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#06b6d4', '#64748b', '#14b8a6', '#f97316', '#6366f1',
  ];

  const doughnutData = {
    labels: categoryLabels.length > 0 ? categoryLabels : ['Sin gastos este mes'],
    datasets: [
      {
        data: categoryValues.length > 0 ? categoryValues : [1],
        backgroundColor: categoryValues.length > 0 ? colors.slice(0, categoryLabels.length) : ['#e2e8f0'],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          font: { size: 10 },
        },
      },
    },
    cutout: '70%',
  };

  return (
    <div className="space-y-6">
      {/* Banner de Invitación a Vincular con Google */}
      {!googleUser && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Inicio sin base de datos
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                Vincula tu cuenta de Google para iniciar tus finanzas
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Al vincularte, el sistema crea automáticamente tu propia hoja de cálculo en Google Sheets y una carpeta en Google Drive para resguardar tus comprobantes de gastos.
              </p>
            </div>

            <button
              onClick={loginWithGoogle}
              className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg transition-transform active:scale-95 shrink-0"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>Vincular con Google ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner Principal / Saldo Libre */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Presupuesto Mensual ({currentYM})
            </span>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {formatMoney(totals.freeCashFlow, config.currency)}
              </h1>
              <span className="text-xs text-slate-300">
                {totals.freeCashFlow > 0
                  ? 'de excedente libre para gastar o ahorrar'
                  : config.monthlyIncome === 0
                  ? 'ingreso no configurado ($ 0)'
                  : 'presupuesto agotado'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ingreso mensual:{' '}
              <span className="text-emerald-300 font-medium">
                {formatMoney(totals.effectiveMonthlyIncome, config.currency)}
              </span>
              {totals.currentMonthTotalIncomes > 0 ? ` (${formatMoney(totals.currentMonthTotalIncomes, config.currency)} registrados)` : ''} | Gastado:{' '}
              {formatMoney(totals.currentMonthTotalExpenses, config.currency)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenIncomeModal && (
              <button
                onClick={onOpenIncomeModal}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Ingreso</span>
              </button>
            )}
            <button
              onClick={onOpenExpenseModal}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Gasto</span>
            </button>
            <button
              onClick={onOpenEvaluator}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>¿Puedo comprar?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Ingresos del Mes */}
        <div
          onClick={() => onNavigateTab('incomes')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ingresos del Mes
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">
            {formatMoney(totals.effectiveMonthlyIncome, config.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totals.currentMonthTotalIncomes > 0 ? `${formatMoney(totals.currentMonthTotalIncomes, config.currency)} en ${currentYM}` : 'Base configurada'}
          </span>
        </div>

        {/* Gastos Fijos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gastos Fijos Hogar
          </span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totals.currentMonthFixedExpenses, config.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Alquiler, servicios, etc.</span>
        </div>

        {/* Gastos Variables */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gastos Variables
          </span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totals.currentMonthVariableExpenses, config.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Supermercado, salidas</span>
        </div>

        {/* Fondo de Emergencia */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fondo Emergencia
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">
            {formatMoney(totals.emergencyFundBalance, config.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Intocable para caprichos</span>
        </div>

        {/* Total Inversiones */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Inversiones Activas
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-indigo-900 mt-1">
            {formatMoney(totalInvestments, config.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Plazos fijos, fondos, etc.</span>
        </div>
      </div>

      {/* Sección Gráfico y Últimos Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribución de Gastos */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Distribución de Gastos ({currentYM})</h3>
            <p className="text-xs text-slate-500 mb-4">Proporción por categoría en el mes actual</p>
          </div>
          <div className="h-60 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Total este mes:</span>
            <span className="font-bold text-slate-900">
              {formatMoney(totals.currentMonthTotalExpenses, config.currency)}
            </span>
          </div>
        </div>

        {/* Últimos Gastos con comprobantes en Drive */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Últimos Gastos Registrados</h3>
                <p className="text-xs text-slate-500">Comprobantes y facturas almacenadas</p>
              </div>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Ver todos ({expenses.length})
              </button>
            </div>

            <div className="space-y-3">
              {expenses.slice(0, 5).map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        exp.type === 'fijo'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exp.type === 'fijo' ? 'F' : 'V'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {exp.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(exp.date)} • {exp.category}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatMoney(exp.amount, config.currency)}
                    </p>
                    {exp.receiptUrl ? (
                      <a
                        href={exp.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-600 hover:underline flex items-center justify-end gap-1 mt-0.5"
                      >
                        <span>Comprobante Drive</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sin foto</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">¿Quieres revisar si te alcanza para un gusto?</span>
            <button
              onClick={onOpenEvaluator}
              className="text-amber-800 font-bold flex items-center gap-1 hover:underline"
            >
              <span>Abrir Validador</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
