import React from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, hasPromptEvent, isInstalled, isIOS, triggerInstall } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasPromptEvent) {
      const installed = await triggerInstall();
      if (installed) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Instalar GASTONAPP
              </h3>
              <p className="text-xs text-slate-500">Acceso rápido desde tu celular</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4">
          {isInstalled ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">¡GASTONAPP ya está instalada!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Ya tienes la aplicación instalada en tu dispositivo. Puedes abrirla directamente desde el icono en tu pantalla de inicio.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Entendido
              </button>
            </div>
          ) : (
            <>
              {/* Beneficios */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pantalla completa</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Experiencia limpia de app nativa sin barras del navegador.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Carga ultrarrápida</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Acceso instantáneo con caché local y sin consumir espacio.
                  </p>
                </div>
              </div>

              {/* Botón directo si el navegador soporta prompt automático (Chrome Android / Desktop) */}
              {hasPromptEvent ? (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar en el Teléfono</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Se añadirá automáticamente el icono a tu cajón de apps o pantalla principal.
                  </p>
                </div>
              ) : isIOS ? (
                /* Instrucciones específicas para iPhone / iPad (Safari) */
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 text-xs text-indigo-950">
                    <p className="font-semibold text-indigo-900">
                      Pasos para instalar en iPhone o iPad (Safari):
                    </p>
                    <ol className="space-y-2 text-[12px] text-slate-700 list-decimal list-inside pl-1">
                      <li className="leading-snug">
                        Toca el botón <span className="font-bold inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800"><Share className="w-3 h-3 text-sky-600 inline" /> Compartir</span> en la barra inferior de Safari.
                      </li>
                      <li className="leading-snug">
                        Desplázate hacia abajo y selecciona <span className="font-bold inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800"><PlusSquare className="w-3 h-3 text-slate-700 inline" /> Agregar a pantalla de inicio</span>.
                      </li>
                      <li className="leading-snug">
                        Toca <span className="font-bold text-slate-900">Agregar</span> en la esquina superior derecha.
                      </li>
                    </ol>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                /* Instrucciones para Android / Navegadores sin evento de instalación directa */
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Cómo instalar desde el menú de tu navegador:
                    </p>
                    <ol className="space-y-1.5 text-[12px] list-decimal list-inside pl-1">
                      <li>Abre el menú de opciones tocando los tres puntos (⋮) arriba a la derecha.</li>
                      <li>Selecciona <span className="font-semibold text-slate-900">"Instalar aplicación"</span> o <span className="font-semibold text-slate-900">"Agregar a la pantalla principal"</span>.</li>
                      <li>Confirma la instalación.</li>
                    </ol>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
