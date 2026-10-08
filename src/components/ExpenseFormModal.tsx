import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { ExpenseCategory, ExpenseType } from '../types/finance';
import { compressImage } from '../utils/helpers';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    description?: string;
    amount?: number;
    category?: string;
  };
}

const CATEGORIES: ExpenseCategory[] = [
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

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { addExpense, config, isSyncing } = useFinance();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Supermercado y Alimentos');
  const [type, setType] = useState<ExpenseType>('variable');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta de Débito');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Foto de comprobante
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.description) setDescription(initialData.description);
      if (initialData.amount) setAmount(initialData.amount.toString());
      if (initialData.category) setCategory(initialData.category);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      setReceiptFileName(file.name);
      // Comprimir la imagen para acelerar la subida a Drive
      const base64 = await compressImage(file, 1200, 0.7);
      setReceiptPreview(base64);
    } catch (err) {
      console.error('Error al procesar la foto:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    setReceiptFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor completa la descripción y un monto válido.');
      return;
    }

    await addExpense(
      {
        description: description.trim(),
        amount: parsedAmount,
        category,
        type,
        paymentMethod,
        date,
        notes: notes.trim(),
      },
      receiptPreview || undefined,
      receiptFileName || `ticket_${Date.now()}.jpg`
    );

    // Limpiar formulario y cerrar
    setDescription('');
    setAmount('');
    setReceiptPreview(null);
    setReceiptFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Registrar Gasto del Hogar</h3>
              <p className="text-xs text-slate-500">Se sincronizará con Google Sheets y Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Monto y Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monto ({config.currency}) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                  {config.currency}
                </span>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Gasto</label>
              <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setType('variable')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    type === 'variable'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Variable
                </button>
                <button
                  type="button"
                  onClick={() => setType('fijo')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    type === 'fijo'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Fijo
                </button>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Concepto *</label>
            <input
              type="text"
              required
              placeholder="Ej: Compra Coto, Farmacia remedios, Pago de Edenor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>

          {/* Categoría y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs sm:text-sm bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs sm:text-sm bg-white"
            >
              <option value="Tarjeta de Débito">Tarjeta de Débito</option>
              <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
              <option value="Transferencia / Débito Automático">Transferencia / Débito Automático</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Mercado Pago / Billetera Virtual">Mercado Pago / Billetera Virtual</option>
            </select>
          </div>

          {/* Subida de Foto / Comprobante a Google Drive */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Foto de Ticket o Comprobante (Google Drive)
              </label>
              <span className="text-[11px] text-slate-400">Opcional</span>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {!receiptPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-emerald-50/50 group"
              >
                <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-emerald-600 transition-colors mb-1" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700 block">
                  Toca para tomar foto o adjuntar comprobante
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  JPG, PNG o WEBP (se subirá a tu Drive)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {receiptFileName || 'ticket.jpg'}
                  </p>
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Listo para subir a Drive
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Quitar foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas adicionales</label>
            <input
              type="text"
              placeholder="Ej: Cuota 2 de 3, reintegro pendiente, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessingImage}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Gasto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
