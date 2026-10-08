import React, { useState } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Image,
  Eye,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Expense } from '../types/finance';
import { formatMoney, formatDate, getCurrentYearMonth } from '../utils/helpers';

export const ExpensesList: React.FC = () => {
  const { expenses, deleteExpense, config } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [selectedType, setSelectedType] = useState<'all' | 'fijo' | 'variable'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filtrado
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMonth = selectedMonth ? e.date.startsWith(selectedMonth) : true;
    const matchesType = selectedType === 'all' ? true : e.type === selectedType;

    return matchesSearch && matchesMonth && matchesType;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalFixed = filteredExpenses
    .filter((e) => e.type === 'fijo')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalVariable = filteredExpenses
    .filter((e) => e.type === 'variable')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleDelete = async (id: string, desc: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el gasto "${desc}"?`)) {
      await deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gastos del Hogar</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Seguimiento de compras, facturas y comprobantes almacenados en Google Drive
          </p>
        </div>

        {/* Resumen del mes filtrado */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gastado</span>
            <span className="text-base font-bold text-slate-900">
              {formatMoney(totalFiltered, config.currency)}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="text-xs">
            <span className="text-slate-500 block">Fijos: <strong className="text-slate-800">{formatMoney(totalFixed, config.currency)}</strong></span>
            <span className="text-slate-500 block">Variables: <strong className="text-slate-800">{formatMoney(totalVariable, config.currency)}</strong></span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Selector de Mes */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white"
          />
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-xs text-slate-400 hover:text-slate-700 whitespace-nowrap"
            >
              Todos
            </button>
          )}
        </div>

        {/* Tipo Fijo / Variable */}
        <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedType('fijo')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === 'fijo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Fijos
          </button>
          <button
            onClick={() => setSelectedType('variable')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedType === 'variable' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Variables
          </button>
        </div>
      </div>

      {/* Lista / Tabla de Gastos */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No se encontraron gastos</h3>
          <p className="text-xs text-slate-400 mt-1">
            Intenta cambiar los filtros de búsqueda o agrega un nuevo gasto con el botón "+ Cargar Gasto".
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto / Categoría</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Comprobante Drive</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Fecha */}
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>

                    {/* Descripción y Categoría */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{exp.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500">{exp.category}</span>
                        {exp.notes && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-xs">
                            • {exp.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          exp.type === 'fijo'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {exp.type}
                      </span>
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {exp.paymentMethod}
                    </td>

                    {/* Comprobante / Foto en Drive */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium border border-emerald-200 transition-colors"
                          title="Abrir en Google Drive"
                        >
                          <Image className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ver en Drive</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      ) : exp.receiptBase64 ? (
                        <button
                          onClick={() => setPreviewImage(exp.receiptBase64 || null)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ver Foto</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">— Sin foto —</span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(exp.amount, config.currency)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(exp.id, exp.description)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Previsualización de Foto Local */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl p-4 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-900 text-sm">Foto del Comprobante</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Comprobante completo"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
