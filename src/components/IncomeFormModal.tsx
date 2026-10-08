import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Tag,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { IncomeCategory } from '../types/finance';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    description?: string;
    amount?: number;
    category?: string;
  };
}

const CATEGORIES: IncomeCategory[] = [
  'Sueldo / Salario',
  'Honorarios / Freelance',
  'Ventas / Negocio',
  'Rentas / Alquileres',
  'Rendimientos / Inversiones',
  'Aguinaldo / Bono',
  'Regalo / Extra',
  'Otros Ingresos',
];

const PAYMENT_METHODS = [
  'Transferencia / Banco',
  'Efectivo',
  'Billetera Virtual / Mercado Pago',
  'Cripto / Dólar',
  'Cheque',
  'Otro',
];

export const IncomeFormModal: React.FC<IncomeFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { addIncome, config } = useFinance();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Sueldo / Salario');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia / Banco');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar si viene de una sugerencia
  React.useEffect(() => {
    if (initialData) {
      if (initialData.description) setDescription(initialData.description);
      if (initialData.amount) setAmount(initialData.amount.toString());
      if (initialData.category) setCategory(initialData.category);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!description.trim()) {
      setError('Por favor indica un concepto para el ingreso.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await addIncome({
        date,
        description: description.trim(),
        category,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim(),
      });

      // Reset
      setDescription('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el ingreso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Cargar Ingreso</h3>
              <p className="text-xs text-emerald-100">Registra sueldos, cobros o entradas extras de dinero</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto del Ingreso ({config.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                <DollarSign className="w-4 h-4" />
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base font-bold text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* Concepto / Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto / Descripción
            </label>
            <input
              type="text"
              required
              placeholder="ej. Sueldo Mensual, Cobro Proyecto Freelance, Bono..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs sm:text-sm text-slate-800 transition-all"
            />
          </div>

          {/* Categoría y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Categoría</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white text-slate-800"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Fecha</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Medio de Cobro */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" />
              <span>Medio de Cobro</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white text-slate-800"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Notas o Detalles (Opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Detalle o referencia del cobro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-slate-800 resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Registrar Ingreso</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};