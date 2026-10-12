import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Debt, DebtType, DebtCategory } from '../types/finance';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: Debt | null;
}

const DEBT_CATEGORIES: DebtCategory[] = [
  'Tarjeta de Crédito',
  'Préstamo Bancario',
  'Préstamo Personal / Familiar',
  'Prendario / Auto',
  'Hipotecario',
  'Electrodomésticos / Tecnología',
  'Servicios / Impuestos',
  'Comercial',
  'Otro',
];

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  debtToEdit,
}) => {
  const { addDebt, updateDebt, config } = useFinance();
  const currency = config.currency || '$';

  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('a_pagar');
  const [category, setCategory] = useState<string>('Tarjeta de Crédito');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('10');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (debtToEdit) {
      setName(debtToEdit.name);
      setType(debtToEdit.type);
      setCategory(debtToEdit.category);
      setTotalAmount(String(debtToEdit.totalAmount || ''));
      setInstallmentAmount(String(debtToEdit.installmentAmount || ''));
      setTotalInstallments(String(debtToEdit.totalInstallments || '12'));
      setPaidInstallments(String(debtToEdit.paidInstallments || '0'));
      setDueDayOfMonth(String(debtToEdit.dueDayOfMonth || '10'));
      setNotes(debtToEdit.notes || '');
    } else {
      setName('');
      setType('a_pagar');
      setCategory('Tarjeta de Crédito');
      setTotalAmount('');
      setInstallmentAmount('');
      setTotalInstallments('12');
      setPaidInstallments('0');
      setDueDayOfMonth('10');
      setNotes('');
    }
  }, [debtToEdit, isOpen]);

  // Si cambia el total y las cuotas, auto-completar la cuota
  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    const tot = parseFloat(val);
    const inst = parseInt(totalInstallments, 10);
    if (!isNaN(tot) && tot > 0 && !isNaN(inst) && inst > 0) {
      setInstallmentAmount(String(Math.round(tot / inst)));
    }
  };

  const handleTotalInstallmentsChange = (val: string) => {
    setTotalInstallments(val);
    const tot = parseFloat(totalAmount);
    const inst = parseInt(val, 10);
    if (!isNaN(tot) && tot > 0 && !isNaN(inst) && inst > 0) {
      setInstallmentAmount(String(Math.round(tot / inst)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedInstAmount = parseFloat(installmentAmount) || 0;
    const parsedTotalInst = parseInt(totalInstallments, 10) || 1;
    const parsedPaidInst = parseInt(paidInstallments, 10) || 0;
    const parsedTotalAmount = parseFloat(totalAmount) || parsedInstAmount * parsedTotalInst;

    if (parsedInstAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const isCompleted = parsedPaidInst >= parsedTotalInst;
      const debtPayload = {
        name: name.trim(),
        type,
        category,
        totalAmount: parsedTotalAmount,
        installmentAmount: parsedInstAmount,
        totalInstallments: parsedTotalInst,
        paidInstallments: parsedPaidInst,
        dueDayOfMonth: parseInt(dueDayOfMonth, 10) || 10,
        status: isCompleted ? ('saldada' as const) : ('activa' as const),
        notes: notes.trim(),
      };

      if (debtToEdit) {
        await updateDebt(debtToEdit.id, debtPayload);
      } else {
        await addDebt(debtPayload);
      }
      onClose();
    } catch (err) {
      console.error('Error guardando deuda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {debtToEdit ? 'Editar Deuda en Cuotas' : 'Nueva Deuda o Financiación'}
              </h3>
              <p className="text-xs text-rose-100">
                Registrá deudas arrastradas o nuevas para proyectar su liquidación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo: A pagar vs A cobrar */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('a_pagar')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                type === 'a_pagar'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Deuda a Pagar (Pasivo)
            </button>
            <button
              type="button"
              onClick={() => setType('a_cobrar')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                type === 'a_cobrar'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Deuda a Cobrar (A favor)
            </button>
          </div>

          {/* Nombre / Concepto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre o Concepto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Tarjeta Visa - Smart TV 55, Préstamo Banco Galicia..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {DEBT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Cuotas: Totales vs Ya pagadas (arrastradas) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                Cuotas Totales <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalInstallments}
                onChange={(e) => handleTotalInstallmentsChange(e.target.value)}
                placeholder="Ej: 12"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Cuotas ya pagadas
              </label>
              <input
                type="number"
                min="0"
                max={totalInstallments}
                value={paidInstallments}
                onChange={(e) => setPaidInstallments(e.target.value)}
                placeholder="Ej: 5 (arrastrada)"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-amber-700 mt-0.5 block">
                {parseInt(paidInstallments, 10) > 0 ? 'Deuda en curso arrastrada' : 'Empieza en cuota 1'}
              </span>
            </div>
          </div>

          {/* Montos: Monto por cuota y Monto total financiado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto por Cuota <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400">{currency}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="35000"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Financiado (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400">{currency}</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder="420000"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Día de vencimiento del mes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Día de Vencimiento de la Cuota (1 al 31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDayOfMonth}
              onChange={(e) => setDueDayOfMonth(e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles de la tarjeta, banco, tasa o condiciones..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : debtToEdit ? 'Actualizar Deuda' : 'Guardar Deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
