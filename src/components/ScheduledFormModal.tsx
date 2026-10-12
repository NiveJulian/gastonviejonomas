import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type {
  ExpenseCategory,
  IncomeCategory,
  ExpenseType,
  RecurrenceType,
  ScheduledExpense,
  ScheduledIncome,
} from '../types/finance';

interface ScheduledFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: ScheduledExpense | ScheduledIncome | null;
  defaultType?: 'expense' | 'income';
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Vivienda (Alquiler/Hipoteca)',
  'Servicios (Luz, Agua, Gas, Internet)',
  'Supermercado y Alimentos',
  'Salud y Farmacia',
  'Transporte y Combustible',
  'Educación',
  'Mascotas',
  'Ocio y Salidas',
  'Ropa y Calzado',
  'Tecnología y Hogar',
  'Suscripciones y Apps',
  'Mantenimiento del Hogar',
  'Otros Gastos',
];

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Sueldo / Salario',
  'Honorarios / Freelance',
  'Ventas / Negocio',
  'Rentas / Alquileres',
  'Rendimientos / Inversiones',
  'Aguinaldo / Bono',
  'Regalo / Extra',
  'Otros Ingresos',
];

export const ScheduledFormModal: React.FC<ScheduledFormModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  defaultType = 'expense',
}) => {
  const { addScheduledExpense, updateScheduledExpense, addScheduledIncome, updateScheduledIncome } =
    useFinance();

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Servicios (Luz, Agua, Gas, Internet)');
  const [expenseType, setExpenseType] = useState<ExpenseType>('fijo');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('mensual');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoDebit, setAutoDebit] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Débito Automático');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setDescription(editingItem.description);
      setAmount(editingItem.amount.toString());
      setCategory(editingItem.category);
      setRecurrence(editingItem.recurrence);
      setNotes(editingItem.notes || '');
      setNotifyDaysBefore(editingItem.notifyDaysBefore !== undefined ? editingItem.notifyDaysBefore : 1);

      if ('dueDate' in editingItem) {
        setTransactionType('expense');
        setTargetDate(editingItem.dueDate);
        setExpenseType(editingItem.type);
        setAutoDebit(editingItem.autoDebit);
        setPaymentMethod(editingItem.paymentMethod);
      } else {
        setTransactionType('income');
        setTargetDate(editingItem.expectedDate);
        setPaymentMethod(editingItem.paymentMethod || 'Transferencia');
      }
    } else {
      setTransactionType(defaultType);
      setDescription('');
      setAmount('');
      setCategory(
        defaultType === 'expense'
          ? 'Servicios (Luz, Agua, Gas, Internet)'
          : 'Sueldo / Salario'
      );
      setExpenseType('fijo');
      setRecurrence('mensual');
      setTargetDate(new Date().toISOString().split('T')[0]);
      setAutoDebit(true);
      setPaymentMethod(defaultType === 'expense' ? 'Débito Automático' : 'Transferencia');
      setNotifyDaysBefore(1);
      setNotes('');
      setError(null);
    }
  }, [editingItem, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Por favor ingresa una descripción.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (!targetDate) {
      setError('Por favor selecciona una fecha de vencimiento o cobro.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const [y, m, d] = targetDate.split('-').map(Number);
    const dayOfMonth = d || 1;

    try {
      if (transactionType === 'expense') {
        const payload = {
          description: description.trim(),
          amount: parsedAmount,
          category,
          type: expenseType,
          recurrence,
          dueDate: targetDate,
          dayOfMonth,
          autoDebit,
          paymentMethod: paymentMethod.trim() || (autoDebit ? 'Débito Automático' : 'Efectivo'),
          notifyDaysBefore,
          status: 'pendiente' as const,
          notes: notes.trim() || undefined,
        };

        if (editingItem && 'dueDate' in editingItem) {
          await updateScheduledExpense(editingItem.id, payload);
        } else {
          await addScheduledExpense(payload);
        }
      } else {
        const payload = {
          description: description.trim(),
          amount: parsedAmount,
          category,
          recurrence,
          expectedDate: targetDate,
          dayOfMonth,
          paymentMethod: paymentMethod.trim() || 'Transferencia',
          notifyDaysBefore,
          status: 'pendiente' as const,
          notes: notes.trim() || undefined,
        };

        if (editingItem && 'expectedDate' in editingItem) {
          await updateScheduledIncome(editingItem.id, payload);
        } else {
          await addScheduledIncome(payload);
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar movimiento programado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white shadow-xs ${
                transactionType === 'expense' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem
                  ? 'Editar Movimiento Programado'
                  : transactionType === 'expense'
                  ? 'Programar Gasto / Débito'
                  : 'Programar Ingreso / Cobro'}
              </h3>
              <p className="text-xs text-slate-500">
                Recibe notificaciones antes de que se debite o cobre el dinero
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tipo de Transacción (solo si es nuevo) */}
        {!editingItem && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('expense');
                  setCategory('Servicios (Luz, Agua, Gas, Internet)');
                  setPaymentMethod('Débito Automático');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  transactionType === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gasto / Débito
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType('income');
                  setCategory('Sueldo / Salario');
                  setPaymentMethod('Transferencia');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  transactionType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ingreso / Cobro
              </button>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción del movimiento:
            </label>
            <input
              type="text"
              required
              placeholder={
                transactionType === 'expense'
                  ? 'ej. Alquiler depto, Netflix, Seguro auto, Tarjeta Visa'
                  : 'ej. Sueldo empresa, Cliente diseño, Alquiler cochera'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium"
            />
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($):</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {transactionType === 'expense' ? 'Fecha de Débito / Vencimiento:' : 'Fecha Esperada de Cobro:'}
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Categoría y Periodicidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría:</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium text-slate-800"
                >
                  {transactionType === 'expense'
                    ? EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    : INCOME_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Frecuencia / Recurrencia:</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium text-slate-800"
                >
                  <option value="mensual">Mensual (Se repite cada mes)</option>
                  <option value="quincenal">Quincenal (Cada 15 días)</option>
                  <option value="semanal">Semanal (Cada 7 días)</option>
                  <option value="anual">Anual (Una vez al año)</option>
                  <option value="una_vez">Una sola vez (Vencimiento único)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Opciones Específicas de Gasto */}
          {transactionType === 'expense' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${autoDebit ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">¿Es Débito Automático?</span>
                    <span className="text-[11px] text-slate-500">
                      Se descuenta solo de tu cuenta bancaria o tarjeta
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDebit}
                    onChange={(e) => setAutoDebit(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Tipo de gasto:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpenseType('fijo')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      expenseType === 'fijo'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    Fijo / Esencial
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('variable')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      expenseType === 'variable'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    Variable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Método de Pago / Cobro y Preaviso de Alerta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {transactionType === 'expense' ? 'Medio de Pago / Cuenta:' : 'Medio de Cobro:'}
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={transactionType === 'expense' ? 'ej. Débito automático, Visa Galicia' : 'ej. Banco Santander'}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avisarme con anticipación:</label>
              <div className="relative">
                <Bell className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={notifyDaysBefore}
                  onChange={(e) => setNotifyDaysBefore(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white font-medium text-slate-800"
                >
                  <option value={0}>El mismo día</option>
                  <option value={1}>1 día antes (Recomendado)</option>
                  <option value={2}>2 días antes</option>
                  <option value={3}>3 días antes</option>
                  <option value={5}>5 días antes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notas u observaciones (opcional):</label>
            <textarea
              rows={2}
              placeholder="ej. Se debita los días 10 de cada mes, número de cliente 48291..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Botones */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 font-bold text-xs rounded-xl text-white shadow-xs transition-colors flex items-center gap-1.5 ${
                transactionType === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : editingItem ? 'Actualizar' : 'Guardar Programado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
