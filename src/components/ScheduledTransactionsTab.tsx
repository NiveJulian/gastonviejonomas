import React, { useState } from 'react';
import {
  Calendar,
  PlusCircle,
  Bell,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Edit2,
  DollarSign,
  CreditCard,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, formatDate } from '../utils/helpers';
import {
  getDaysDiff,
  getUpcomingScheduledExpenses,
  getUpcomingScheduledIncomes,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../services/notificationService';
import { ScheduledFormModal } from './ScheduledFormModal';
import type { ScheduledExpense, ScheduledIncome } from '../types/finance';

export const ScheduledTransactionsTab: React.FC = () => {
  const {
    scheduledExpenses,
    scheduledIncomes,
    deleteScheduledExpense,
    deleteScheduledIncome,
    executeScheduledExpense,
    executeScheduledIncome,
    checkScheduledNotifications,
    config,
  } = useFinance();

  const [activeFilter, setActiveFilter] = useState<'all' | 'expenses' | 'incomes' | 'auto_debit'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'expense' | 'income'>('expense');
  const [editingItem, setEditingItem] = useState<ScheduledExpense | ScheduledIncome | null>(null);

  const [testNotificationMsg, setTestNotificationMsg] = useState<string | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  );

  const currency = config.currency || '$';

  // Métricas calculadas
  const upcomingDebits7Days = getUpcomingScheduledExpenses(scheduledExpenses, 7);
  const upcomingIncomes7Days = getUpcomingScheduledIncomes(scheduledIncomes, 7);

  const totalDebits7Days = upcomingDebits7Days.reduce((sum, item) => sum + item.expense.amount, 0);
  const totalIncomes7Days = upcomingIncomes7Days.reduce((sum, item) => sum + item.income.amount, 0);
  const autoDebitCount = scheduledExpenses.filter((e) => e.autoDebit && e.status === 'pendiente').length;

  // Filtrado de items
  const filteredExpenses = scheduledExpenses.filter((e) => {
    if (activeFilter === 'incomes') return false;
    if (activeFilter === 'auto_debit') return e.autoDebit;
    return true;
  });

  const filteredIncomes = scheduledIncomes.filter(() => {
    if (activeFilter === 'expenses' || activeFilter === 'auto_debit') return false;
    return true;
  });

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      await checkScheduledNotifications(true);
      setTestNotificationMsg('¡Notificaciones activadas con éxito!');
      setTimeout(() => setTestNotificationMsg(null), 3000);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    setTestNotificationMsg(null);
    try {
      const res = await checkScheduledNotifications(true);
      if (res.browserSent > 0 || res.telegramSent > 0) {
        setTestNotificationMsg(
          `¡Alerta enviada! (${res.browserSent} al navegador${
            res.telegramSent > 0 ? `, ${res.telegramSent} a Telegram` : ''
          })`
        );
      } else {
        setTestNotificationMsg('No hay vencimientos pendientes en los próximos 3 días para alertar.');
      }
      setTimeout(() => setTestNotificationMsg(null), 4000);
    } catch {
      setTestNotificationMsg('Error al emitir notificaciones.');
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleOpenCreateModal = (type: 'expense' | 'income') => {
    setEditingItem(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: ScheduledExpense | ScheduledIncome) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (id: string, desc: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el gasto programado "${desc}"?`)) {
      await deleteScheduledExpense(id);
    }
  };

  const handleDeleteIncome = async (id: string, desc: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el ingreso programado "${desc}"?`)) {
      await deleteScheduledIncome(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera y Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Pagos y Cobros Programados
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Conocé exactamente cuándo se debitará tu plata y recibí alertas antes de cada vencimiento
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de Permiso de Notificaciones */}
          {isNotificationSupported() && (
            <button
              onClick={notificationPermission === 'granted' ? handleTestNotification : handleRequestPermission}
              disabled={isTestingNotification}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                notificationPermission === 'granted'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>
                {notificationPermission === 'granted'
                  ? isTestingNotification
                    ? 'Comprobando...'
                    : 'Probar Alerta'
                  : 'Activar Alertas Web'}
              </span>
            </button>
          )}

          <button
            onClick={() => handleOpenCreateModal('expense')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Programar Débito</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('income')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Programar Cobro</span>
          </button>
        </div>
      </div>

      {testNotificationMsg && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold">{testNotificationMsg}</span>
        </div>
      )}

      {/* Tarjetas de Métricas de Vencimientos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Débitos Próximos (7 días)
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600">
            {formatMoney(totalDebits7Days, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {upcomingDebits7Days.length}{' '}
            {upcomingDebits7Days.length === 1 ? 'pago pendiente' : 'pagos pendientes'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cobros Próximos (7 días)
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            {formatMoney(totalIncomes7Days, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {upcomingIncomes7Days.length}{' '}
            {upcomingIncomes7Days.length === 1 ? 'ingreso esperado' : 'ingresos esperados'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Débitos Automáticos
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{autoDebitCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Suscripciones y servicios con cobro directo</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Flujo Neto Proyectado
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl sm:text-2xl font-black ${
              totalIncomes7Days - totalDebits7Days >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}
          >
            {formatMoney(totalIncomes7Days - totalDebits7Days, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Balance esperado para los próximos 7 días</p>
        </div>
      </div>

      {/* Selector de Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todos ({scheduledExpenses.length + scheduledIncomes.length})
        </button>
        <button
          onClick={() => setActiveFilter('expenses')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeFilter === 'expenses'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Débitos / Gastos ({scheduledExpenses.length})
        </button>
        <button
          onClick={() => setActiveFilter('incomes')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeFilter === 'incomes'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Cobros / Ingresos ({scheduledIncomes.length})
        </button>
        <button
          onClick={() => setActiveFilter('auto_debit')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeFilter === 'auto_debit'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ⚡ Débito Automático ({autoDebitCount})
        </button>
      </div>

      {/* Lista de Movimientos Programados */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 && filteredIncomes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 p-6 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No hay movimientos programados todavía</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Registrá tus débitos recurrentes (alquiler, luz, Netflix, tarjetas) o ingresos futuros para que Gaston te avise con anticipación y nunca te quedes sin saldo.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => handleOpenCreateModal('expense')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                + Programar Débito
              </button>
              <button
                onClick={() => handleOpenCreateModal('income')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                + Programar Cobro
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tarjetas de Gastos Programados */}
            {filteredExpenses.map((expense) => {
              const daysRemaining = getDaysDiff(expense.dueDate);
              const isOverdue = daysRemaining < 0;
              const isToday = daysRemaining === 0;
              const isTomorrow = daysRemaining === 1;

              return (
                <div
                  key={expense.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3 relative overflow-hidden ${
                    isToday
                      ? 'border-rose-400 ring-2 ring-rose-200'
                      : isOverdue
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Countdown Badge */}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isToday
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isTomorrow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {isToday
                            ? '¡SE DEBITA HOY!'
                            : isTomorrow
                            ? 'SE DEBITA MAÑANA'
                            : isOverdue
                            ? `VENCIDO HACE ${Math.abs(daysRemaining)} DÍAS`
                            : `En ${daysRemaining} días`}
                        </span>

                        {expense.autoDebit && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-amber-600" /> Débito Auto
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {expense.recurrence}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm truncate">{expense.description}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{expense.paymentMethod}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-rose-600">
                        -{formatMoney(expense.amount, currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Vence: {formatDate(expense.dueDate)}
                      </p>
                    </div>
                  </div>

                  {expense.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl italic">
                      "{expense.notes}"
                    </p>
                  )}

                  {/* Acciones de la tarjeta */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => executeScheduledExpense(expense.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Registrar como gasto debitado hoy en la cuenta"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{expense.autoDebit ? 'Ya se debitó' : 'Marcar pagado'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditItem(expense)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar movimiento programado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id, expense.description)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar movimiento programado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tarjetas de Ingresos Programados */}
            {filteredIncomes.map((income) => {
              const daysRemaining = getDaysDiff(income.expectedDate);
              const isOverdue = daysRemaining < 0;
              const isToday = daysRemaining === 0;
              const isTomorrow = daysRemaining === 1;

              return (
                <div
                  key={income.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3 relative overflow-hidden ${
                    isToday
                      ? 'border-emerald-400 ring-2 ring-emerald-200'
                      : isOverdue
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isToday
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : isTomorrow
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : isOverdue
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {isToday
                            ? '¡COBRO ESPERADO HOY!'
                            : isTomorrow
                            ? 'COBRO ESPERADO MAÑANA'
                            : isOverdue
                            ? `PENDIENTE HACE ${Math.abs(daysRemaining)} DÍAS`
                            : `En ${daysRemaining} días`}
                        </span>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {income.recurrence}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm truncate">{income.description}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                        <span>{income.category}</span>
                        {income.paymentMethod && (
                          <>
                            <span>•</span>
                            <span>{income.paymentMethod}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-emerald-600">
                        +{formatMoney(income.amount, currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Esperado: {formatDate(income.expectedDate)}
                      </p>
                    </div>
                  </div>

                  {income.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl italic">
                      "{income.notes}"
                    </p>
                  )}

                  {/* Acciones de la tarjeta */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => executeScheduledIncome(income.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Registrar cobro impactado hoy en la cuenta"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Ya cobrado</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditItem(income)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar movimiento programado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(income.id, income.description)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar movimiento programado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar */}
      {isModalOpen && (
        <ScheduledFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingItem={editingItem}
          defaultType={modalDefaultType}
        />
      )}
    </div>
  );
};
