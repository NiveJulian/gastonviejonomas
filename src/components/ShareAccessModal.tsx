import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  listSpreadsheetPermissions,
  shareSpreadsheetWithUser,
  revokeSpreadsheetPermission,
} from '../services/googleDirectService';
import type { DrivePermission } from '../types/finance';

interface ShareAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAccessModal: React.FC<ShareAccessModalProps> = ({ isOpen, onClose }) => {
  const { googleUser, config } = useFinance();
  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [emailToShare, setEmailToShare] = useState('');
  const [roleToShare, setRoleToShare] = useState<'reader' | 'writer'>('reader');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const spreadsheetId = config.googleSpreadsheetId;
  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  const loadPermissions = async () => {
    if (!googleUser?.accessToken || !spreadsheetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const perms = await listSpreadsheetPermissions(googleUser.accessToken, spreadsheetId);
      setPermissions(perms);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los colaboradores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && googleUser && spreadsheetId) {
      loadPermissions();
    }
  }, [isOpen, googleUser, spreadsheetId]);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToShare.trim() || !googleUser?.accessToken || !spreadsheetId) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await shareSpreadsheetWithUser(
        googleUser.accessToken,
        spreadsheetId,
        emailToShare.trim(),
        roleToShare
      );
      setSuccessMsg(`Acceso concedido con éxito a ${emailToShare.trim()}`);
      setEmailToShare('');
      await loadPermissions();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al conceder acceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (perm: DrivePermission) => {
    if (!googleUser?.accessToken || !spreadsheetId) return;
    const nameOrEmail = perm.emailAddress || perm.displayName || 'este usuario';
    if (!window.confirm(`¿Seguro que deseas quitar el acceso a ${nameOrEmail}?`)) {
      return;
    }

    setError(null);
    try {
      await revokeSpreadsheetPermission(googleUser.accessToken, spreadsheetId, perm.id);
      setSuccessMsg(`Acceso revocado para ${nameOrEmail}`);
      await loadPermissions();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al revocar acceso');
    }
  };

  const handleCopyLink = () => {
    if (sheetUrl) {
      navigator.clipboard.writeText(sheetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Compartir Datos y Acceso</h3>
              <p className="text-xs text-slate-500">
                Gestiona quién puede ver o editar tu Google Sheet directamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {!googleUser || !spreadsheetId ? (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-amber-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Google Sheets no vinculado</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para invitar a familiares o socios a ver y gestionar tus finanzas sin bases de datos, primero vincula tu cuenta de Google desde la barra superior.
              </p>
            </div>
          ) : (
            <>
              {/* Información sobre arquitectura sin bases de datos */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Sin intermediarios ni bases de datos externas</span>
                </div>
                <p className="leading-relaxed">
                  Los permisos se configuran de forma segura y directa en tu <strong>Google Drive</strong>. Puedes invitar a quien quieras como lector o editor, y retirar su acceso en cualquier momento.
                </p>
                {sheetUrl && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-medium text-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Enlace copiado' : 'Copiar enlace a la hoja'}</span>
                    </button>
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-medium text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Google Sheet</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Mensajes de estado */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Formulario invitar colaborador */}
              <form onSubmit={handleShare} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Invitar a un usuario por correo Gmail</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@gmail.com"
                    value={emailToShare}
                    onChange={(e) => setEmailToShare(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={roleToShare}
                      onChange={(e) => setRoleToShare(e.target.value as 'reader' | 'writer')}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none"
                    >
                      <option value="reader">Lector (Solo ver)</option>
                      <option value="writer">Editor (Ver y cargar)</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isSubmitting || !emailToShare.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                    >
                      {isSubmitting ? 'Invitando...' : 'Invitar'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista de usuarios con acceso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Personas con acceso ({permissions.length})</span>
                  <button
                    onClick={loadPermissions}
                    disabled={isLoading}
                    className="text-emerald-700 hover:underline text-[11px] font-medium"
                  >
                    {isLoading ? 'Actualizando...' : 'Refrescar'}
                  </button>
                </div>

                {isLoading && permissions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Cargando permisos de Google Drive...
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {permissions.map((perm) => {
                      const isOwner = perm.role === 'owner';
                      const isCurrentUser = perm.emailAddress === googleUser.email;
                      const isWriter = perm.role === 'writer';

                      return (
                        <div
                          key={perm.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {perm.photoLink ? (
                              <img
                                src={perm.photoLink}
                                alt={perm.displayName || ''}
                                className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {(perm.displayName || perm.emailAddress || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{perm.displayName || perm.emailAddress}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                                    Tú
                                  </span>
                                )}
                              </p>
                              {perm.emailAddress && (
                                <p className="text-[11px] text-slate-500 truncate">{perm.emailAddress}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isOwner
                                  ? 'bg-amber-100 text-amber-800'
                                  : isWriter
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isOwner ? (
                                'Propietario'
                              ) : isWriter ? (
                                <>
                                  <Edit3 className="w-3 h-3" /> Editor
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" /> Lector
                                </>
                              )}
                            </span>

                            {!isOwner && !isCurrentUser && (
                              <button
                                onClick={() => handleRevoke(perm)}
                                title="Revocar acceso"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
