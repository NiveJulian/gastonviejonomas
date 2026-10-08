import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Info,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { evaluatePurchase } from '../utils/rulesEngine';
import { formatMoney } from '../utils/helpers';
import confetti from 'canvas-confetti';

interface PurchaseEvaluatorProps {
  onProceedToBuy?: (itemData: { description: string; amount: number; category: string }) => void;
}

export const PurchaseEvaluator: React.FC<PurchaseEvaluatorProps> = ({ onProceedToBuy }) => {
  const { expenses, incomes, savings, config } = useFinance();

  const [itemName, setItemName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Ocio y Salidas');
  const [necessity, setNecessity] = useState(2); // 1 a 5

  const purchaseAmount = parseFloat(amountStr) || 0;

  const evaluation = evaluatePurchase(
    purchaseAmount,
    itemName || 'Compra deseada',
    necessity,
    expenses,
    savings,
    config,
    incomes
  );

  const handleTriggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleBuy = () => {
    if (evaluation.verdict === 'APPROVED') {
      handleTriggerConfetti();
    }
    if (onProceedToBuy) {
      onProceedToBuy({
        description: itemName || 'Compra evaluada',
        amount: purchaseAmount,
        category,
      });
    }
  };

  const getVerdictStyle = () => {
    switch (evaluation.verdict) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-50 border-emerald-300',
          badge: 'bg-emerald-600 text-white',
          title: 'text-emerald-900',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />,
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 border-amber-300',
          badge: 'bg-amber-500 text-white',
          title: 'text-amber-900',
          icon: <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />,
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 border-rose-300',
          badge: 'bg-rose-600 text-white',
          title: 'text-rose-900',
          icon: <XCircle className="w-8 h-8 text-rose-600 shrink-0" />,
        };
    }
  };

  const style = getVerdictStyle();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 p-6 rounded-3xl border border-amber-200/60 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Validador de Compras Inteligente</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              ¿Quieres darte un gusto o comprar algo? Analiza si tus finanzas te lo permiten antes de sacar la plata.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Entrada */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-base">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            ¿Qué quieres comprar?
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre o Descripción del artículo
            </label>
            <input
              type="text"
              placeholder="Ej: Cafetera nueva, Zapatillas, Salida cena..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Precio / Monto estimado ({config.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-medium text-sm">
                {config.currency}
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                min="0"
                step="any"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-base font-semibold text-slate-800 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm bg-white"
            >
              <option value="Ocio y Salidas">Ocio y Salidas</option>
              <option value="Tecnología y Hogar">Tecnología y Hogar</option>
              <option value="Ropa y Calzado">Ropa y Calzado</option>
              <option value="Supermercado y Alimentos">Supermercado y Alimentos</option>
              <option value="Mantenimiento del Hogar">Mantenimiento del Hogar</option>
              <option value="Otros Gastos">Otros Gastos</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-600">
                Nivel de Necesidad / Urgencia:
              </label>
              <span className="text-xs font-bold text-slate-700">
                {necessity === 1 && '1 - Capricho o antojo'}
                {necessity === 2 && '2 - Deseo no urgente'}
                {necessity === 3 && '3 - Útil pero postergable'}
                {necessity === 4 && '4 - Muy importante'}
                {necessity === 5 && '5 - Urgente / Esencial'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={necessity}
              onChange={(e) => setNecessity(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Capricho</span>
              <span>Necesidad Básica</span>
            </div>
          </div>
        </div>

        {/* Veredicto y Análisis del Semáforo */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Dictamen del Semáforo Financiero
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.badge}`}>
                {evaluation.verdict === 'APPROVED' && 'Permitido'}
                {evaluation.verdict === 'WARNING' && 'Advertencia'}
                {evaluation.verdict === 'REJECTED' && 'Bloqueado'}
              </span>
            </div>

            {/* Tarjeta de resultado */}
            <div className={`p-4 rounded-2xl border ${style.bg} transition-all`}>
              <div className="flex items-start gap-3">
                {style.icon}
                <div className="space-y-1">
                  <h4 className={`text-base font-bold ${style.title}`}>{evaluation.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {evaluation.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Desglose de Impacto */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Excedente Libre</span>
                <span className="text-sm font-bold text-slate-800">
                  {formatMoney(evaluation.metrics.freeCashFlowBefore, config.currency)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Costo de la Compra</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatMoney(purchaseAmount, config.currency)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 font-medium block">Fondo Intocable</span>
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 inline" />
                  {formatMoney(evaluation.metrics.emergencyFundBalance, config.currency)}
                </span>
              </div>
            </div>

            {/* Consejos y Reglas */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Factores considerados:
              </span>
              <ul className="space-y-1.5">
                {evaluation.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Botón de Acción según dictamen */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            {evaluation.verdict === 'APPROVED' ? (
              <>
                <p className="text-xs text-slate-500">
                  Todo seguro. Puedes proceder con tranquilidad.
                </p>
                <button
                  onClick={handleBuy}
                  disabled={purchaseAmount <= 0}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <span>Comprar y Subir Comprobante</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : evaluation.verdict === 'WARNING' ? (
              <>
                <p className="text-xs text-amber-700">
                  Atención: Requiere gastar ahorros de otras metas.
                </p>
                <button
                  onClick={handleBuy}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Comprar de todos modos (Acepto el impacto)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between p-3 bg-rose-50 rounded-xl text-rose-800 text-xs font-medium border border-rose-200">
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Extracción no recomendada: comprometerías tu seguridad financiera básica.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
