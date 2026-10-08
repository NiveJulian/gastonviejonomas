import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  TrendingUp,
  Shield,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { calculateComfortAnalysis } from '../utils/comfortCalculator';
import { calculateFinancialTotals } from '../utils/rulesEngine';
import { formatMoney } from '../utils/helpers';

export const ComfortCalculatorTab: React.FC = () => {
  const { expenses, savings, config } = useFinance();
  const comfort = calculateComfortAnalysis(expenses, savings, config);
  const totals = calculateFinancialTotals(expenses, savings, config);

  // Simulador interactivo
  const [simulatedIncome, setSimulatedIncome] = useState<number>(config.monthlyIncome || 0);
  const [simulatedFixedExpenses, setSimulatedFixedExpenses] = useState<number>(
    totals.currentMonthFixedExpenses || 0
  );

  // Recalcular con datos simulados
  const simulatedIdealIncome = simulatedFixedExpenses > 0 ? Math.round(simulatedFixedExpenses / 0.5) : 0;
  const simulatedGap = Math.max(0, simulatedIdealIncome - simulatedIncome);
  const simulatedComfortPercent = simulatedIdealIncome > 0
    ? Math.min(100, Math.round((simulatedIncome / simulatedIdealIncome) * 100))
    : (simulatedIncome > 0 ? 100 : 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado Principal */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              Calculadora de Confort Financiero
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¿Cuánto Deberías Ganar para Vivir Cómodo?
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              Basado en tus gastos esenciales reales del hogar y la <strong>Regla de Oro 50/30/20</strong>:
              tus necesidades no deben superar el 50% de tus ingresos, dejándote un 30% libre para ocio y un 20% para multiplicar tu patrimonio.
            </p>
          </div>

          {/* Tarjeta de la Cifra Clave */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-right sm:text-left shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200 block">
              Tu Ingreso Objetivo Ideal
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {formatMoney(comfort.goldenRuleRecommendation.idealMonthlyIncome, config.currency)}
            </div>
            <span className="text-xs text-white/80 mt-1 block">
              {comfort.goldenRuleRecommendation.gapToGoldenComfort === 0 ? (
                <span className="text-emerald-300 font-bold">¡Ya estás en la zona de confort!</span>
              ) : (
                <>Brecha a cubrir: <strong className="text-amber-200">{formatMoney(comfort.goldenRuleRecommendation.gapToGoldenComfort, config.currency)}</strong></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progreso hacia el Confort Dorado */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="font-semibold text-slate-700">Tu Nivel de Confort Actual:</span>
          <span className="font-extrabold text-slate-900">
            {comfort.currentComfortPercent}% del estándar óptimo 50/30/20
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              comfort.currentComfortPercent >= 100
                ? 'bg-emerald-500'
                : comfort.currentComfortPercent >= 75
                ? 'bg-teal-500'
                : comfort.currentComfortPercent >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${comfort.currentComfortPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          Tus gastos fijos reales son de{' '}
          <strong>{formatMoney(totals.currentMonthFixedExpenses, config.currency)}</strong>. Para que no pesen más del 50%, tu ingreso debería ser el doble.
        </p>
      </div>

      {/* LOS 4 NIVELES DE BIENESTAR FINANCIERO */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Los 4 Niveles de Bienestar Financiero
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comfort.levels.map((level) => (
            <div
              key={level.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                level.isCurrentStatus
                  ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{level.name}</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">{level.subtitle}</span>
                  </div>
                  {level.isCurrentStatus && (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                      Tu Nivel Actual
                    </span>
                  )}
                </div>

                <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Ingreso Necesario:</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatMoney(level.targetIncome, config.currency)}
                  </span>
                </div>

                {/* Desglose de distribución de ese nivel */}
                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Distribución de los fondos en este nivel:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <span className="text-[10px] text-blue-700 block font-semibold">Necesidades</span>
                      <span className="font-bold text-blue-900 text-xs">
                        {formatMoney(level.breakdown.essentials, config.currency)}
                      </span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <span className="text-[10px] text-amber-700 block font-semibold">Deseos/Ocio</span>
                      <span className="font-bold text-amber-900 text-xs">
                        {formatMoney(level.breakdown.lifestyle, config.currency)}
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Ahorro/Inv.</span>
                      <span className="font-bold text-emerald-900 text-xs">
                        {formatMoney(level.breakdown.savingsInvestment, config.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beneficios */}
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {level.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: SIMULADOR INTERACTIVO "QUÉ PASARÍA SI..." */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-600" />
            Simulador de Impacto en tu Confort Financiero
          </h3>
          <p className="text-xs text-slate-500">
            Ajusta los controles para ver cómo un aumento de sueldo o un recorte de gastos fijos impacta directamente en tu tranquilidad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Ingreso Mensual Simulado */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Ingreso Mensual Simulado:</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatMoney(simulatedIncome, config.currency)}
              </span>
            </div>
            <input
              type="range"
              min={Math.round(totals.currentMonthFixedExpenses * 0.8)}
              max={Math.round(totals.currentMonthFixedExpenses * 4)}
              step={10000}
              value={simulatedIncome}
              onChange={(e) => setSimulatedIncome(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Slider 2: Gastos Fijos Simulados */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Gastos Fijos Hogar Simulados:</span>
              <span className="font-bold text-rose-700 text-sm">
                {formatMoney(simulatedFixedExpenses, config.currency)}
              </span>
            </div>
            <input
              type="range"
              min={100000}
              max={1500000}
              step={10000}
              value={simulatedFixedExpenses}
              onChange={(e) => setSimulatedFixedExpenses(parseInt(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Resultado del simulador */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs text-slate-500 font-semibold block uppercase">
              Resultado con esta simulación
            </span>
            <p className="text-sm font-bold text-slate-800">
              Con gastos fijos de {formatMoney(simulatedFixedExpenses, config.currency)}, tu ingreso ideal 50/30/20 es{' '}
              <span className="text-indigo-600">{formatMoney(simulatedIdealIncome, config.currency)}</span>.
            </p>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <span className="text-xs text-slate-400 block">Nivel de Confort:</span>
            <span
              className={`text-xl font-black ${
                simulatedComfortPercent >= 100 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {simulatedComfortPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
