import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface FormatDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormatDataModal: React.FC<FormatDataModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    expenses,
    incomes,
    investments,
    savings,
    formatAllData,
    exportDataJson,
  } = useFinance();

  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedSuccess, setFormattedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFormat = async () => {
    setIsFormatting(true);
    await formatAllData();
    setIsFormatting(false);
    setFormattedSuccess(true);
    setTimeout(() => {
      setFormattedSuccess(false);
      onClose();
    }, 1500);
  };

  const totalRecords =
    expenses.length + incomes.length + investments.length + savings.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                Formatear Todos los Datos
              </h3>
              <p className="text-xs text-rose-600 font-medium">
                Reinicio a cero del sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isFormatting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {formattedSuccess ? (
            <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-emerald-900">
                Datos formateados exitosamente
              </p>
              <p className="text-xs text-emerald-700">
                Todos los registros han sido restablecidos a cero.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Esta accion eliminara definitivamente todos los registros y restablecera la configuracion a cero. El almacenamiento local sera vaciado por completo.
                </p>
              </div>

              {/* Conteo de registros que se borraran */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Registros a formatear ({totalRecords} en total)
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span>Gastos:</span>
                    <span className="font-bold text-slate-900">{expenses.length}</span>
                  </div>
                  <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span>Ingresos:</span>
                    <span className="font-bold text-slate-900">{incomes.length}</span>
                  </div>
                  <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span>Inversiones:</span>
                    <span className="font-bold text-slate-900">{investments.length}</span>
                  </div>
                  <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span>Metas Ahorro:</span>
                    <span className="font-bold text-slate-900">{savings.length}</span>
                  </div>
                </div>
              </div>

              {/* Boton de Respaldo Preventivo */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <span className="text-slate-600">¿Deseas guardar copia antes?</span>
                <button
                  type="button"
                  onClick={exportDataJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar JSON</span>
                </button>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isFormatting}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFormat}
                  disabled={isFormatting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isFormatting ? 'Formateando...' : 'Formatear Todo'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
