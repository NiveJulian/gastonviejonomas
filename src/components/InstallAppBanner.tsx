import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppBannerProps {
  onOpenModal: () => void;
}

const DISMISS_KEY = 'gastonapp_pwa_banner_dismissed';

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ onOpenModal }) => {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (isInstalled) {
      setIsDismissed(true);
      return;
    }
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsedDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      // Volver a mostrar sólo si pasaron más de 7 días
      if (elapsedDays < 7) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, [isInstalled]);

  if (isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-16 md:bottom-5 left-3 right-3 md:left-auto md:right-5 md:max-w-md z-30 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Instalar GASTONAPP</p>
            <p className="text-[11px] text-slate-300 truncate">
              Úsala como app en tu teléfono sin el navegador
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Descartar"
            aria-label="Descartar aviso de instalación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
