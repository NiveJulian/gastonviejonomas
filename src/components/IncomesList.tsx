import React, { useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Income } from '../types/finance';
import { formatMoney, formatDate, getCurrentYearMonth } from '../utils/helpers';

interface IncomesListProps {
  onOpenIncomeModal?: () => void;
}

export const IncomesList: React.FC<IncomesListProps> = ({ onOpenIncomeModal }) => {
  const { incomes, deleteIncome, config } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());

  // Filtrado
  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.notes && inc.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMonth = selectedMonth ? inc.date.startsWith(selectedMonth) : true;

    return matchesSearch && matchesMonth;
  });

  const totalFiltered = filteredIncomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

  const handleDelete = async (id: string, desc: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el ingreso "${desc}"?`)) {
      await deleteIncome(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ingresos</h2>
          <p className="text-xs text-slate-500">
            Registro de sueldos, cobros freelance, rentas y entradas extras de dinero
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenIncomeModal && (
            <button
              onClick={onOpenIncomeModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cargar Ingreso</span>
            </button>
          )}

          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block leading-tight">
                Total Ingresos ({selectedMonth || 'Histórico'})
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800">
                {formatMoney(totalFiltered, config.currency)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto, categoría o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Mes */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
            />
          </div>

          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Lista o Tabla de Ingresos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredIncomes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No se encontraron ingresos registrados</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Carga tus ingresos fijos o variables para contrastarlos automáticamente contra tus gastos.
              </p>
            </div>
            {onOpenIncomeModal && (
              <button
                onClick={onOpenIncomeModal}
                className="mt-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Primer Ingreso</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Medio</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(inc.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <span>{inc.description}</span>
                        {inc.notes && (
                          <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                            {inc.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        {inc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{inc.paymentMethod || 'Transferencia'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 whitespace-nowrap text-sm">
                      +{formatMoney(inc.amount, config.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(inc.id, inc.description)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar ingreso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};