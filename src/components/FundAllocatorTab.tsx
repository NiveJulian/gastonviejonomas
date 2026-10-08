import React, { useState } from 'react';
import {
  PieChart,
  ShieldCheck,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { detectCategoryGaps, generateAllocationProposal } from '../utils/fundAllocator';
import { calculateFinancialTotals } from '../utils/rulesEngine';
import { formatMoney } from '../utils/helpers';
import confetti from 'canvas-confetti';

export const FundAllocatorTab: React.FC = () => {
  const { expenses, savings, config, updateSavingsAmount } = useFinance();
  const totals = calculateFinancialTotals(expenses, savings, config);

  const [customAmountStr, setCustomAmountStr] = useState('');
  const [isApplied, setIsApplied] = useState(false);

  const customAmount = customAmountStr ? parseFloat(customAmountStr) : undefined;
  const gaps = detectCategoryGaps(expenses, savings, config);
  const proposal = generateAllocationProposal(expenses, savings, config, customAmount);

  const handleApplyAllocation = async () => {
    // Aplicar los aportes a cada meta de ahorro real
    for (const item of proposal.items) {
      if (item.type === 'emergency' || item.type === 'goal') {
        const goal = savings.find((s) => s.id === item.targetId);
        if (goal) {
          const newAmount = goal.currentAmount + item.suggestedAmount;
          await updateSavingsAmount(goal.id, newAmount);
        }
      }
    }

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 5000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Rebalanceador Inteligente de Fondos
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Destino Automático de Fondos
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Detecta automáticamente qué categorías de tu hogar o metas de ahorro están desfinanciadas
              y propone la distribución matemática óptima de tu excedente libre.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 shrink-0 text-right sm:text-left">
            <span className="text-[11px] text-slate-300 font-semibold block uppercase">
              Dinero Libre del Mes
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {formatMoney(totals.freeCashFlow, config.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: DIAGNÓSTICO DE BRECHAS / CATEGORÍAS FALTANTES */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Categorías que Requieren Atención Financiera
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {gaps.length} brechas detectadas
          </span>
        </div>

        {gaps.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm">¡Tus finanzas están completamente balanceadas!</h4>
            <p className="text-xs text-emerald-700 mt-1">
              Tu fondo de emergencia está completo y tus metas de ahorro avanzan al día.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {gap.type === 'emergency_fund' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Target className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                      {gap.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        gap.urgency === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : gap.urgency === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {gap.urgency === 'high'
                        ? 'Prioridad Alta'
                        : gap.urgency === 'medium'
                        ? 'Prioridad Media'
                        : 'Prioridad Baja'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{gap.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Monto Faltante:</span>
                  <span className="font-bold text-rose-600">
                    {formatMoney(gap.deficit, config.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: SIMULADOR Y PROPUESTA DE DISTRIBUCIÓN */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Propuesta de Asignación de Fondos
            </h3>
            <p className="text-xs text-slate-500">
              Distribución calculada según prioridades de seguridad y metas
            </p>
          </div>

          {/* Ajuste manual de monto (ej: cobro de aguinaldo o bono) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Monto a distribuir:</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                {config.currency}
              </span>
              <input
                type="number"
                placeholder={totals.freeCashFlow.toString()}
                value={customAmountStr}
                onChange={(e) => setCustomAmountStr(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
            {customAmountStr && (
              <button
                onClick={() => setCustomAmountStr('')}
                className="p-1 text-slate-400 hover:text-slate-700"
                title="Restablecer al dinero libre del mes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {proposal.items.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl">
            {proposal.summaryMessage}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {proposal.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">{item.targetName}</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                        {item.percentage}%
                      </span>
                    </div>

                    <div className="text-lg font-black text-slate-900 mt-2">
                      {formatMoney(item.suggestedAmount, config.currency)}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen y Botón de Aplicar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span>Total a destinar: </span>
                <strong className="text-slate-900 font-bold text-sm">
                  {formatMoney(proposal.availableToAllocate, config.currency)}
                </strong>
              </div>

              {isApplied ? (
                <div className="px-5 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Fondos asignados exitosamente a tus metas!</span>
                </div>
              ) : (
                <button
                  onClick={handleApplyAllocation}
                  disabled={proposal.availableToAllocate <= 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar Distribución Inteligente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
