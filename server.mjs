/**
 * GASTONAPP - SERVIDOR DE PRODUCCIÓN UNIFICADO (DOKPLOY / DOCKER)
 * 
 * Funciones principales:
 * 1. Servidor web HTTP ultraligero y nativo (sin dependencias npm externas).
 * 2. Soporte completo SPA (Single Page Application con fallback a index.html).
 * 3. Inyección dinámica de variables de entorno en /env-config.js en tiempo de ejecución.
 * 4. Endpoint de salud /api/health para monitoreo en Dokploy.
 * 5. Supervisor del agente de Telegram en segundo plano (telegram-bot/bot.mjs).
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(__dirname, 'dist');
const DATA_DIR = path.resolve(__dirname, 'data');
const TELEGRAM_BOT_SCRIPT = path.resolve(__dirname, 'telegram-bot', 'bot.mjs');

// Crear directorio de datos persistente si no existe
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[SERVER] No se pudo crear directorio data:', err.message);
  }
}

// MIME types para archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// -------------------------------------------------------------
// SUPERVISOR DEL AGENTE TELEGRAM
// -------------------------------------------------------------
let botProcess = null;
let isShuttingDown = false;
let botRestartTimer = null;
let agentStatus = { running: false, pid: null, startedAt: null, restarts: 0 };

function startTelegramAgent() {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

  if (!token || token === 'PEGA_AQUI_TU_TOKEN_DE_BOTFATHER') {
    console.log('[AGENTE] TELEGRAM_BOT_TOKEN no configurado. El agente de Telegram se activará cuando se defina la variable en Dokploy.');
    agentStatus = { running: false, pid: null, startedAt: null, restarts: agentStatus.restarts };
    return;
  }

  if (!fs.existsSync(TELEGRAM_BOT_SCRIPT)) {
    console.warn(`[AGENTE] No se encontró el script del bot en: ${TELEGRAM_BOT_SCRIPT}`);
    return;
  }

  console.log('[AGENTE] Iniciando agente de Telegram en segundo plano...');

  try {
    botProcess = spawn('node', [TELEGRAM_BOT_SCRIPT], {
      cwd: __dirname,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    agentStatus = {
      running: true,
      pid: botProcess.pid,
      startedAt: new Date().toISOString(),
      restarts: agentStatus.restarts,
    };

    botProcess.stdout.on('data', (data) => {
      const line = data.toString().trimEnd();
      if (line) console.log(`[AGENTE] ${line}`);
    });

    botProcess.stderr.on('data', (data) => {
      const line = data.toString().trimEnd();
      if (line) console.error(`[AGENTE ERROR] ${line}`);
    });

    botProcess.on('exit', (code, signal) => {
      botProcess = null;
      agentStatus.running = false;
      agentStatus.pid = null;

      if (!isShuttingDown) {
        agentStatus.restarts++;
        console.warn(`[AGENTE] Proceso finalizó (código: ${code}, señal: ${signal}). Reiniciando en 5 segundos...`);
        clearTimeout(botRestartTimer);
        botRestartTimer = setTimeout(() => {
          if (!isShuttingDown) startTelegramAgent();
        }, 5000);
      }
    });
  } catch (err) {
    console.error('[AGENTE] Error al levantar el proceso del bot:', err.message);
  }
}

// -------------------------------------------------------------
// SERVIDOR WEB HTTP
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  // CORS y cabeceras de seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. ENDPOINT DE SALUD (Dokploy Healthcheck)
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'ok',
        app: 'gastonapp',
        timestamp: new Date().toISOString(),
        agent: agentStatus,
      })
    );
    return;
  }

  // 2. ENDPOINT DINÁMICO DE VARIABLES DE ENTORNO (/env-config.js)
  // Permite que la configuración en Dokploy se inyecte al cliente sin reconstruir
  if (pathname === '/env-config.js') {
    const envPayload = {
      VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || '',
      VITE_OMNIROUTE_BASE_URL: process.env.VITE_OMNIROUTE_BASE_URL || '',
      VITE_OMNIROUTE_API_KEY: process.env.VITE_OMNIROUTE_API_KEY || '',
      VITE_OMNIR_MODEL: process.env.VITE_OMNIR_MODEL || 'auto/best-fast',
      VITE_APPS_SCRIPT_URL: process.env.VITE_APPS_SCRIPT_URL || '',
    };

    const jsContent = `window.__ENV__ = Object.assign(window.__ENV__ || {}, ${JSON.stringify(envPayload, null, 2)});\n`;

    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(jsContent);
    return;
  }

  // 3. ARCHIVOS ESTÁTICOS Y FALLBACK SPA
  let filePath = path.join(DIST_DIR, pathname);

  // Normalizar ruta para evitar path traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (fileErr, fileStats) => {
      // Si el archivo no existe (ruta de cliente SPA como /ahorros, /inversiones, etc.), servir index.html
      if (fileErr || !fileStats.isFile()) {
        const indexPath = path.join(DIST_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Error: No se encontró index.html compilado en dist/');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          });
          res.end(indexData);
        });
        return;
      }

      // Archivo estático encontrado
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Cache prolongado para assets versionados con hash
      const isHashedAsset = pathname.startsWith('/assets/');
      const cacheControl = isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileStats.size,
        'Cache-Control': cacheControl,
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  });
});

// -------------------------------------------------------------
// INICIO Y APAGADO ORDENADO
// -------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`GASTONAPP corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Modo: Producción (Dokploy / Docker)`);
  console.log(`Directorio estático: ${DIST_DIR}`);
  console.log('====================================================');

  startTelegramAgent();
});

function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[SERVER] Señal ${signal} recibida. Cerrando ordenadamente...`);

  clearTimeout(botRestartTimer);

  if (botProcess) {
    console.log('[AGENTE] Deteniendo proceso del agente...');
    try {
      botProcess.kill('SIGTERM');
    } catch {}
  }

  server.close(() => {
    console.log('[SERVER] Servidor web cerrado.');
    process.exit(0);
  });

  // Forzar salida si demora más de 5 segundos
  setTimeout(() => {
    console.warn('[SERVER] Cierre forzado por tiempo límite.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
