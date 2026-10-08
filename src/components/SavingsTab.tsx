import React, { useState } from 'react';
import {
  PiggyBank,
  ShieldCheck,
  PlusCircle,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Target,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { SavingsGoal } from '../types/finance';
import { formatMoney, formatDate } from '../utils/helpers';
import { calculateFinancialTotals } from '../utils/rulesEngine';

export const SavingsTab: React.FC = () => {
  const { savings, addSavingsGoal, updateSavingsAmount, deleteSavingsGoal, config, expenses } =
    useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  // Modal para agregar/quitar saldo rápido
  const [adjustGoalId, setAdjustGoalId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add');

  const totals = calculateFinancialTotals(expenses, savings, config);

  const emergencyGoals = savings.filter((s) => s.isEmergencyFund);
  const otherGoals = savings.filter((s) => !s.isEmergencyFund);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = currentAmount ? parseFloat(currentAmount) : 0;

    if (!name.trim() || isNaN(target) || target <= 0) {
      alert('Ingresa un nombre y monto objetivo válidos.');
      return;
    }

    await addSavingsGoal({
      name: name.trim(),
      isEmergencyFund,
      targetAmount: target,
      currentAmount: isNaN(current) ? 0 : current,
      deadline: deadline || undefined,
      notes: notes.trim(),
    });

    setName('');
    setIsEmergencyFund(false);
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setNotes('');
    setIsModalOpen(false);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustGoalId) return;

    const goal = savings.find((s) => s.id === adjustGoalId);
    if (!goal) return;

    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta <= 0) return;

    const newAmount =
      adjustMode === 'add'
        ? goal.currentAmount + delta
        : Math.max(0, goal.currentAmount - delta);

    await updateSavingsAmount(adjustGoalId, newAmount);
    setAdjustGoalId(null);
    setAdjustDelta('');
  };

  const handleDelete = async (id: string, goalName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la meta "${goalName}"?`)) {
      await deleteSavingsGoal(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ahorros y Fondo de Emergencia</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Establece metas de ahorro y protege tu reserva intocable contra compras impulsivas
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nueva Meta de Ahorro</span>
        </button>
      </div>

      {/* SECCIÓN 1: FONDO DE EMERGENCIA INTOCABLE */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Fondo de Emergencia (Intocable)</h3>
                <p className="text-xs text-slate-300">
                  Reserva blindada para imprevistos de salud, vivienda o trabajo. El validador nunca te dejará tocarlo para compras de ocio.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Regla de Oro Activa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-slate-300 uppercase font-bold block">
                Acumulado en Emergencia
              </span>
              <span className="text-2xl font-black text-emerald-400 block mt-1">
                {formatMoney(totals.emergencyFundBalance, config.currency)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-slate-300 uppercase font-bold block">
                Objetivo Mínimo Seguro
              </span>
              <span className="text-2xl font-black text-white block mt-1">
                {formatMoney(totals.emergencyFundMinimum, config.currency)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
              <span className="text-[11px] text-slate-300 uppercase font-bold block">
                Estado de Cobertura
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-white">
                  {totals.emergencyFundMinimum > 0
                    ? `${Math.min(100, Math.round((totals.emergencyFundBalance / totals.emergencyFundMinimum) * 100))}%`
                    : '100%'}
                </span>
                <span className="text-xs text-slate-300">
                  {totals.emergencyFundBalance >= totals.emergencyFundMinimum
                    ? '🛡️ Protegido'
                    : '⚠️ En Construcción'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: METAS DE AHORRO ESPECÍFICAS */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Metas de Ahorro Personales
        </h3>

        {savings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            <PiggyBank className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No tienes metas de ahorro registradas.</p>
            <p className="text-xs mt-1">Crea metas como "Vacaciones", "Auto", "Reparaciones" o un "Fondo de Emergencia".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savings.map((goal) => {
              const percent = goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;

              return (
                <div
                  key={goal.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    goal.isEmergencyFund ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{goal.name}</span>
                        {goal.isEmergencyFund && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Emergencia
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(goal.id, goal.name)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-slate-500 mt-1">{goal.notes}</p>
                    )}

                    {/* Barra de progreso */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">
                          {formatMoney(goal.currentAmount, config.currency)}
                        </span>
                        <span className="text-slate-500">
                          Meta: {formatMoney(goal.targetAmount, config.currency)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            goal.isEmergencyFund ? 'bg-emerald-600' : 'bg-teal-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones de aporte/retiro */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {goal.deadline ? (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Límite: {formatDate(goal.deadline)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Sin fecha límite</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setAdjustGoalId(goal.id);
                          setAdjustMode('subtract');
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                        title="Retirar dinero"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setAdjustGoalId(goal.id);
                          setAdjustMode('add');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                        title="Aportar dinero"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aportar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Meta de Ahorro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Crear Meta de Ahorro</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Vacaciones 2027, Fondo de Emergencia, Reparaciones..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="emergencyCheckbox"
                  checked={isEmergencyFund}
                  onChange={(e) => setIsEmergencyFund(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="emergencyCheckbox" className="text-xs font-medium text-slate-800 cursor-pointer">
                  Marcar como <strong>Fondo de Emergencia Intocable</strong>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Objetivo *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Saldo Inicial
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Límite (Opcional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas</label>
                <input
                  type="text"
                  placeholder="Detalles sobre esta meta"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Crear Meta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido de Aporte / Retiro */}
      {adjustGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {adjustMode === 'add' ? 'Aportar a la Meta' : 'Retirar de la Meta'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa el monto que deseas {adjustMode === 'add' ? 'sumar' : 'restar'}:
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <input
                type="number"
                required
                autoFocus
                step="any"
                placeholder="0.00"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-base font-bold text-slate-900"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustGoalId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
