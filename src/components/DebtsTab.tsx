import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Edit3,
  Trash2,
  Sparkles,
  PieChart,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { calculateDebtTotals, getDebtDetails } from '../utils/debtCalculator';
import { formatMoney } from '../utils/helpers';
import { DebtFormModal } from './DebtFormModal';
import type { Debt } from '../types/finance';
import confetti from 'canvas-confetti';

export const DebtsTab: React.FC = () => {
  const {
    debts,
    config,
    updateConfig,
    deleteDebt,
    payDebtInstallment,
    collectDebtInstallment,
  } = useFinance();
  const currency = config.currency || '$';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
  const [filter, setFilter] = useState<'todas' | 'a_pagar' | 'a_cobrar' | 'saldadas'>('todas');

  // Configuración de destino de ingresos
  const [targetPercent, setTargetPercent] = useState<string>(
    config.debtRepaymentPercent ? String(config.debtRepaymentPercent) : '20'
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  const summary = calculateDebtTotals(
    debts,
    config.monthlyIncome,
    config.debtRepaymentBudget,
    config.debtRepaymentPercent
  );

  const handleOpenAdd = () => {
    setDebtToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (debt: Debt) => {
    setDebtToEdit(debt);
    setIsModalOpen(true);
  };

  const handlePayInstallment = async (debt: Debt) => {
    await payDebtInstallment(debt.id);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  const handleCollectInstallment = async (debt: Debt) => {
    await collectDebtInstallment(debt.id);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
  };

  const handleSaveDebtConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const pct = parseFloat(targetPercent) || 20;
      await updateConfig({ debtRepaymentPercent: pct });
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const filteredDebts = debts.filter((d) => {
    if (filter === 'a_pagar') return d.type === 'a_pagar' && d.status === 'activa';
    if (filter === 'a_cobrar') return d.type === 'a_cobrar' && d.status === 'activa';
    if (filter === 'saldadas') return d.status === 'saldada';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Deudas y Financiación en Cuotas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Planificá la liquidación de tus cuotas arrastradas y definí cuánto destinar de tus ingresos
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Deuda / Cuota
        </button>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Métrica 1: Cuotas Mensuales a Pagar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Compromiso del Mes
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {formatMoney(summary.monthlyInstallmentsToPay, currency)}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              {summary.incomeCommitmentPercent}% de tus ingresos mensuales
            </span>
          </div>
          <div className="mt-2 text-[11px] text-rose-700 font-medium">
            Equivale a {formatMoney(summary.dailyCommitmentToPay, currency)}/día
          </div>
        </div>

        {/* Métrica 2: Saldo Total a Liquidar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Total Pendiente
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {formatMoney(summary.totalDebtToPayRemaining, currency)}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              Libre estimado en {summary.maxMonthsToPayoff} meses
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            {summary.activeDebtsToPay.length} deuda{summary.activeDebtsToPay.length === 1 ? '' : 's'} en curso
          </div>
        </div>

        {/* Métrica 3: Progreso General Pagado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progreso de Liquidación
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-700">
              {summary.overallPayProgressPercent}%
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              {formatMoney(summary.totalPaidDebtToPay, currency)} ya pagados
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.overallPayProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Métrica 4: A Cobrar a Favor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              A Cobrar (A favor)
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-indigo-700">
              {formatMoney(summary.totalDebtToCollectRemaining, currency)}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              +{formatMoney(summary.monthlyInstallmentsToCollect, currency)}/mes a ingresar
            </span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-medium">
            {summary.activeDebtsToCollect.length} crédito{summary.activeDebtsToCollect.length === 1 ? '' : 's'} a tu favor
          </div>
        </div>
      </div>

      {/* Tarjeta de Configuración de Destino de Ingresos para Liquidar Deudas */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-400" />
              <h2 className="text-base sm:text-lg font-bold">
                Estrategia de Destino de Ingresos para Deudas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Definí qué porcentaje de tus ingresos mensuales tenés pensado destinar a pagar cuotas para que el agente IA calcule tu plan exacto
            </p>
          </div>

          <form onSubmit={handleSaveDebtConfig} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                min="5"
                max="80"
                value={targetPercent}
                onChange={(e) => setTargetPercent(e.target.value)}
                className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-bold text-sm text-center focus:ring-2 focus:ring-rose-400 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-white/60 font-bold">%</span>
            </div>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition active:scale-95 shadow"
            >
              {isSavingConfig ? 'Guardando...' : 'Fijar Destino'}
            </button>
          </form>
        </div>

        {configSuccess && (
          <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Configuración guardada en tu perfil y sincronizada con Google Sheets.
          </div>
        )}

        {/* Resumen del presupuesto de cuotas */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-white/60 block">Presupuesto mensual proyectado:</span>
            <span className="font-bold text-white text-sm">
              {formatMoney(summary.targetBudget, currency)}/mes
            </span>
          </div>
          <div>
            <span className="text-white/60 block">Cuotas a cubrir este mes:</span>
            <span className="font-bold text-rose-300 text-sm">
              {formatMoney(summary.monthlyInstallmentsToPay, currency)}/mes
            </span>
          </div>
          <div>
            <span className="text-white/60 block">Margen para acelerar pagos:</span>
            <span
              className={`font-bold text-sm ${
                summary.canAcceleratePayoff ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {summary.canAcceleratePayoff
                ? `+${formatMoney(summary.budgetSurplusOrDeficit, currency)}/mes libres`
                : 'Presupuesto justo para cuotas'}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros de Lista */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas ({debts.length})
          </button>
          <button
            onClick={() => setFilter('a_pagar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'a_pagar'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A Pagar ({summary.activeDebtsToPay.length})
          </button>
          <button
            onClick={() => setFilter('a_cobrar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'a_cobrar'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A Cobrar ({summary.activeDebtsToCollect.length})
          </button>
          <button
            onClick={() => setFilter('saldadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'saldadas'
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Saldadas ({debts.filter((d) => d.status === 'saldada').length})
          </button>
        </div>
      </div>

      {/* Listado de Deudas */}
      {filteredDebts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No hay deudas en esta sección</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Podés registrar una deuda que venís arrastrando o pedirle al Agente IA por chat "Tengo una deuda de la tarjeta" para armar el plan.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Agregar Deuda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((debt) => {
            const details = getDebtDetails(debt);
            const isToPay = debt.type === 'a_pagar';
            const isSaldada = debt.status === 'saldada';

            return (
              <div
                key={debt.id}
                className={`bg-white p-5 rounded-2xl border transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isSaldada
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isToPay
                    ? 'border-slate-200/80 hover:border-rose-300'
                    : 'border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                <div>
                  {/* Encabezado de la Deuda */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isToPay
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isToPay ? 'A Pagar' : 'A Cobrar'}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {debt.category}
                        </span>
                        {isSaldada && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            Saldada ✓
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-1">{debt.name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900 block">
                        {formatMoney(debt.installmentAmount, currency)}
                        <span className="text-xs text-slate-500 font-normal">/cuota</span>
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Día {debt.dueDayOfMonth || 10} del mes
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso de Cuotas */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700">
                        Cuota {debt.paidInstallments} de {debt.totalInstallments}
                      </span>
                      <span
                        className={`font-bold ${
                          isSaldada ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {details.percentPaid}% saldado
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSaldada
                            ? 'bg-emerald-500'
                            : isToPay
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${details.percentPaid}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>
                        Restan: <strong className="text-slate-700">{details.remainingInstallments} cuotas</strong>
                      </span>
                      <span>
                        Saldo: <strong className="text-slate-700">{formatMoney(details.remainingAmount, currency)}</strong>
                      </span>
                    </div>
                  </div>

                  {debt.notes && (
                    <p className="text-xs text-slate-500 mt-2.5 italic">
                      "{debt.notes}"
                    </p>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(debt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Editar Deuda"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDebt(debt.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Eliminar Deuda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isSaldada && (
                    <button
                      onClick={() => (isToPay ? handlePayInstallment(debt) : handleCollectInstallment(debt))}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm flex items-center gap-1.5 text-white ${
                        isToPay
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isToPay ? 'Pagar Cuota' : 'Cobrar Cuota'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Crear / Editar Deuda */}
      <DebtFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        debtToEdit={debtToEdit}
      />
    </div>
  );
};
