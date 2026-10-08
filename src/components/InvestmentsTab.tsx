import React, { useState } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Trash2,
  PieChart,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Investment, InvestmentType } from '../types/finance';
import { formatMoney, formatDate } from '../utils/helpers';

const INVESTMENT_TYPES: InvestmentType[] = [
  'Plazo Fijo',
  'Fondos Comunes / FCI',
  'Acciones / CEDEARs',
  'Criptomonedas',
  'Dólares / Moneda Extranjera',
  'Bienes Raíces / Propiedades',
  'Otro',
];

export const InvestmentsTab: React.FC = () => {
  const { investments, addInvestment, deleteInvestment, config } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [asset, setAsset] = useState('');
  const [type, setType] = useState<InvestmentType>('Plazo Fijo');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [yieldPercent, setYieldPercent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Métricas totales
  const totalInvested = investments.reduce((sum, i) => sum + Number(i.investedAmount || 0), 0);
  const totalCurrent = investments.reduce((sum, i) => sum + Number(i.currentValue || 0), 0);
  const totalProfit = totalCurrent - totalInvested;
  const overallYield = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invAmt = parseFloat(investedAmount);
    const curVal = currentValue ? parseFloat(currentValue) : invAmt;

    if (!asset.trim() || isNaN(invAmt) || invAmt <= 0) {
      alert('Ingresa el activo y un monto válido invertido.');
      return;
    }

    const calcYield = yieldPercent ? parseFloat(yieldPercent) : invAmt > 0 ? ((curVal - invAmt) / invAmt) * 100 : 0;

    await addInvestment({
      asset: asset.trim(),
      type,
      investedAmount: invAmt,
      currentValue: curVal,
      yieldPercent: parseFloat(calcYield.toFixed(2)),
      date,
      notes: notes.trim(),
    });

    setAsset('');
    setInvestedAmount('');
    setCurrentValue('');
    setYieldPercent('');
    setNotes('');
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la inversión "${name}"?`)) {
      await deleteInvestment(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Portafolio de Inversiones</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Seguimiento de capital aportado, valor actual y rendimiento acumulado
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nueva Inversión</span>
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Invertido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Capital Invertido
          </span>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {formatMoney(totalInvested, config.currency)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Monto total aportado</span>
        </div>

        {/* Valor de Mercado Actual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Valor Actual Estimado
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totalCurrent, config.currency)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Patrimonio en activos</span>
        </div>

        {/* Rendimiento Neto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Rendimiento Neto
          </span>
          <div
            className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${
              totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {totalProfit >= 0 ? (
              <ArrowUpRight className="w-5 h-5 shrink-0" />
            ) : (
              <ArrowDownRight className="w-5 h-5 shrink-0" />
            )}
            <span>{formatMoney(totalProfit, config.currency)}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100">
              {overallYield >= 0 ? `+${overallYield.toFixed(1)}%` : `${overallYield.toFixed(1)}%`}
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Ganancia / pérdida global</span>
        </div>
      </div>

      {/* Lista de Activos */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Posiciones Activas</h3>
          <span className="text-xs text-slate-400">{investments.length} activos</span>
        </div>

        {investments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No tienes inversiones registradas.</p>
            <p className="text-xs mt-1">Agrega plazos fijos, fondos, acciones o criptomonedas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Activo / Instrumento</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Invertido</th>
                  <th className="py-3 px-4 text-right">Valor Actual</th>
                  <th className="py-3 px-4 text-right">Rendimiento</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {investments.map((inv) => {
                  const profit = inv.currentValue - inv.investedAmount;
                  const isPositive = profit >= 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{inv.asset}</span>
                        {inv.notes && <span className="text-[11px] text-slate-400">{inv.notes}</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
                          {inv.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatMoney(inv.investedAmount, config.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(inv.currentValue, config.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatMoney(profit, config.currency)}
                          {inv.yieldPercent !== undefined && (
                            <span className="text-[11px] font-normal text-slate-400 ml-1">
                              ({inv.yieldPercent}%)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(inv.id, inv.asset)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para agregar inversión */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Registrar Nueva Inversión</h3>
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
                  Nombre del Activo / Entidad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plazo Fijo Banco Nación, Apple CEDEAR, Bitcoin..."
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Activo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as InvestmentType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Invertido *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="0.00"
                    value={investedAmount}
                    onChange={(e) => setInvestedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Actual
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Igual al invertido"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rendimiento % Estimado
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ej: 8.5"
                    value={yieldPercent}
                    onChange={(e) => setYieldPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas</label>
                <input
                  type="text"
                  placeholder="Vencimiento, broker, etc."
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
