/**
 * Módulo de resolución de variables de entorno dinámicas.
 * En producción (Dokploy / Docker), lee de window.__ENV__ inyectado por server.mjs.
 * En desarrollo local (Vite dev), lee directamente de import.meta.env.
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export function getRuntimeEnv(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined' && window.__ENV__ && typeof window.__ENV__[key] === 'string') {
    const val = window.__ENV__[key].trim();
    if (val.length > 0) return val;
  }

  const metaEnv = ((import.meta as any).env?.[key] || '').trim();
  if (metaEnv.length > 0) return metaEnv;

  return defaultValue;
}
