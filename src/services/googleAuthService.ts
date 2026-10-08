import type { GoogleUser } from '../types/finance';
import { getRuntimeEnv } from '../utils/env';

declare const google: any;

const GOOGLE_SESSION_KEY = 'misfinanzas_google_user';
const GOOGLE_CLIENT_ID_KEY = 'misfinanzas_google_client_id';

// Client ID por defecto (variables de entorno de Dokploy o .env local)
export const DEFAULT_CLIENT_ID = getRuntimeEnv('VITE_GOOGLE_CLIENT_ID');

export function getStoredGoogleClientId(): string {
  const fromStorage = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
  if (fromStorage && fromStorage.trim().length > 0) {
    return fromStorage.trim();
  }
  return DEFAULT_CLIENT_ID;
}

export function setStoredGoogleClientId(clientId: string): void {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
}

/**
 * Obtiene la sesión guardada en localStorage si no ha expirado
 */
export function getStoredGoogleSession(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_SESSION_KEY);
    if (!raw) return null;
    const user: GoogleUser = JSON.parse(raw);

    // Verificar si el token sigue vigente (con 60 segundos de margen)
    const now = Date.now();
    if (user.tokenExpiresAt && user.tokenExpiresAt > now + 60000) {
      return user;
    }
    // Token expirado
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda la sesión de Google en el localStorage del navegador
 */
export function saveGoogleSession(user: GoogleUser): void {
  localStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify(user));
}

/**
 * Cierra la sesión de Google eliminando los datos del localStorage
 */
export function clearGoogleSession(): void {
  localStorage.removeItem(GOOGLE_SESSION_KEY);
}

/**
 * Abre el pop-up oficial de Google Identity Services para iniciar sesión y autorizar acceso
 */
export function promptGoogleLogin(): Promise<GoogleUser> {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts?.oauth2) {
      reject(new Error('La librería de Google Identity Services no está cargada todavía. Revisa tu conexión a internet.'));
      return;
    }

    const clientId = getStoredGoogleClientId();
    if (!clientId) {
      reject(
        new Error(
          'Falta configurar el Google Client ID. Agrégalo en tu archivo .env como VITE_GOOGLE_CLIENT_ID o en el menú de Ajustes.'
        )
      );
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      callback: async (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }

        const accessToken = tokenResponse.access_token;
        const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3600;
        const tokenExpiresAt = Date.now() + expiresIn * 1000;

        try {
          // Obtener perfil del usuario desde Google UserInfo API
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!profileRes.ok) {
            throw new Error('Error al obtener perfil de usuario de Google');
          }

          const profile = await profileRes.json();

          const googleUser: GoogleUser = {
            id: profile.sub || profile.id,
            email: profile.email,
            name: profile.name || profile.email,
            picture: profile.picture,
            accessToken,
            tokenExpiresAt,
          };

          // Guardar sesión en localStorage para persistencia
          saveGoogleSession(googleUser);
          resolve(googleUser);
        } catch (err: any) {
          reject(err);
        }
      },
    });

    // Iniciar flujo con solicitud de consentimiento
    tokenClient.requestAccessToken({ prompt: '' });
  });
}
