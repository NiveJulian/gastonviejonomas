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
  Link2,
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
  const { googleUser, config, connectSharedSpreadsheet, loginWithGoogle } = useFinance();
  const [activeTab, setActiveTab] = useState<'share' | 'connect'>('share');
  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states - Invitar
  const [emailToShare, setEmailToShare] = useState('');
  const [roleToShare, setRoleToShare] = useState<'reader' | 'writer'>('writer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAppInvite, setCopiedAppInvite] = useState(false);

  // Form states - Vincular existente
  const [sharedSheetInput, setSharedSheetInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const spreadsheetId = config.googleSpreadsheetId;
  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;
  const appInviteUrl = spreadsheetId
    ? `${window.location.origin}/?sheetId=${spreadsheetId}`
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

  const handleCopyAppInvite = () => {
    if (appInviteUrl) {
      navigator.clipboard.writeText(appInviteUrl);
      setCopiedAppInvite(true);
      setTimeout(() => setCopiedAppInvite(false), 2000);
    }
  };

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedSheetInput.trim()) return;

    setIsConnecting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await connectSharedSpreadsheet(sharedSheetInput.trim());
      if (res.success) {
        setSuccessMsg(res.message);
        setSharedSheetInput('');
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar la hoja compartida');
    } finally {
      setIsConnecting(false);
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
              <h3 className="font-bold text-slate-900 text-base">Compartir Datos y Colaboración</h3>
              <p className="text-xs text-slate-500">
                Gestiona permisos y sincronización compartida directamente en Google Sheets
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

        {/* Selector de pestañas */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('share');
              setError(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'share'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Compartir mi Hoja</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('connect');
              setError(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'connect'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Conectar Hoja Compartida</span>
          </button>
        </div>

        {/* Mensajes de estado globales en el modal */}
        <div className="px-6 pt-4 space-y-2">
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
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 pt-2 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'share' ? (
            /* TAB 1: COMPARTIR MI HOJA */
            !googleUser || !spreadsheetId ? (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-amber-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Google Sheets no vinculado</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Para invitar a familiares o socios a ver y gestionar tus finanzas sin bases de datos, primero vincula tu cuenta de Google.
                </p>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Vincular con Google ahora
                </button>
              </div>
            ) : (
              <>
                {/* Información sobre arquitectura sin intermediarios */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Colaboración en tiempo real en Google Drive</span>
                  </div>
                  <p className="leading-relaxed">
                    Tus datos se guardan directamente en tu cuenta de Google. Puedes invitar a colaboradores por correo o pasarles el enlace directo de invitación a GastonApp.
                  </p>
                  
                  {/* Botones de copia de enlaces */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {appInviteUrl && (
                      <button
                        type="button"
                        onClick={handleCopyAppInvite}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 font-semibold text-xs shadow-xs"
                      >
                        {copiedAppInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAppInvite ? '¡Enlace de App copiado!' : 'Copiar Invitación a GastonApp'}</span>
                      </button>
                    )}
                    {sheetUrl && (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-medium text-xs"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Enlace copiado' : 'Copiar URL Sheets'}</span>
                        </button>
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-emerald-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-medium text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Google Sheet</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

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
                        <option value="writer">Editor (Ver y registrar)</option>
                        <option value="reader">Lector (Solo ver)</option>
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
            )
          ) : (
            /* TAB 2: CONECTAR HOJA COMPARTIDA POR OTRO USUARIO */
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Link2 className="w-4 h-4 text-emerald-600" />
                  <span>Sincronizar con la hoja de otro usuario</span>
                </div>
                <p className="leading-relaxed">
                  Si un familiar o socio compartió su hoja de cálculo contigo por Google Drive o te pasó su enlace de GastonApp, puedes vincularla directamente aquí.
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                  <li>El propietario debe haber compartido su archivo contigo en Google Sheets o Drive.</li>
                  <li>Inicia sesión con tu cuenta de Google para verificar el permiso.</li>
                  <li>Pega el enlace completo o el ID de la hoja compartida abajo y presiona Vincular.</li>
                </ol>
              </div>

              {!googleUser && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold">Inicia sesión con tu cuenta de Google</p>
                    <p className="text-[11px] text-amber-800">
                      Google necesita verificar que tienes permiso de lectura o edición sobre la hoja compartida.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loginWithGoogle}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}

              <form onSubmit={handleConnectSheet} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  Enlace o ID de Google Sheets Compartido:
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/1A2B3C.../edit o ID"
                  value={sharedSheetInput}
                  onChange={(e) => setSharedSheetInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
                />

                <button
                  type="submit"
                  disabled={isConnecting || !sharedSheetInput.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{isConnecting ? 'Verificando y sincronizando...' : 'Vincular y Sincronizar Hoja'}</span>
                </button>
              </form>

              {config.googleSpreadsheetId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-semibold text-slate-800">Hoja vinculada actual: </span>
                    <span className="font-mono text-[11px] text-slate-500">{config.googleSpreadsheetId}</span>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${config.googleSpreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline shrink-0 text-xs font-medium ml-2 flex items-center gap-1"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
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
