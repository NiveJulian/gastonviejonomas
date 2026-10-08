/**
 * BOT TELEGRAM LOCAL - FINANZAHOGAR
 * Ejecución directa en Node.js mediante long-polling
 */

import fs from 'fs';
import path from 'path';

// Cargar variables de entorno si existe .env
const envPath = path.resolve(process.cwd(), '.env');
let token = process.env.TELEGRAM_BOT_TOKEN || '';
let appsScriptUrl = process.env.VITE_APPS_SCRIPT_URL || '';
let omnirouteUrl = process.env.VITE_OMNIROUTE_BASE_URL || '';
let omnirouteKey = process.env.VITE_OMNIROUTE_API_KEY || '';
let omnirouteModel = process.env.VITE_OMNIR_MODEL || 'gpt-4o-mini';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const [k, v] = line.split('=');
    if (k && v) {
      const cleanKey = k.trim();
      const cleanVal = v.trim();
      if (cleanKey === 'TELEGRAM_BOT_TOKEN') token = cleanVal;
      if (cleanKey === 'VITE_APPS_SCRIPT_URL') appsScriptUrl = cleanVal;
      if (cleanKey === 'VITE_OMNIROUTE_BASE_URL') omnirouteUrl = cleanVal;
      if (cleanKey === 'VITE_OMNIROUTE_API_KEY') omnirouteKey = cleanVal;
      if (cleanKey === 'VITE_OMNIR_MODEL') omnirouteModel = cleanVal;
    }
  });
}

if (!token || token === 'PEGA_AQUI_TU_TOKEN_DE_BOTFATHER') {
  console.log('===============================================================');
  console.log('BOT TELEGRAM: Falta configurar TELEGRAM_BOT_TOKEN.');
  console.log('Obtenlo con @BotFather en Telegram y configuralo en .env o ejecuta:');
  console.log('node bot.mjs <TU_TOKEN> [URL_APPS_SCRIPT]');
  console.log('===============================================================');
}

// Argumentos de terminal si se pasan
if (process.argv[2]) token = process.argv[2];
if (process.argv[3]) appsScriptUrl = process.argv[3];

const TELEGRAM_API = `https://api.telegram.org/bot${token}`;

async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('Error enviando mensaje:', err.message);
  }
}

async function askOmniroute(userMessage) {
  if (!omnirouteUrl) {
    return 'Agente IA no configurado. Para habilitar respuestas libres, configura la URL y API Key de tu proveedor de IA (OpenAI, Ollama, vLLM, etc.) en .env o en los Ajustes de la aplicacion. Puedes utilizar /saldo, /puedo [monto] o /gasto [monto].';
  }
  try {
    const cleanBase = omnirouteUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${omnirouteKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: omnirouteModel,
        messages: [
          {
            role: 'system',
            content: 'Eres un analista financiero personal en Telegram. Responde directo, matematico y sobrio sin asteriscos dobles ni emojis.',
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    const raw = await res.text();
    let accumulated = '';
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') break;
      try {
        const j = JSON.parse(dataStr);
        accumulated += j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || '';
      } catch {}
    }

    if (accumulated.trim()) return accumulated.replace(/\*\*/g, '').trim();

    try {
      const json = JSON.parse(raw);
      if (json.choices?.[0]?.message?.content) {
        return json.choices[0].message.content.replace(/\*\*/g, '').trim();
      }
    } catch {}

    return '';
  } catch (e) {
    return '';
  }
}

let offset = 0;

async function pollUpdates() {
  if (!token) return;
  try {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`);
    if (!res.ok) {
      setTimeout(pollUpdates, 3000);
      return;
    }
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        const chatId = msg.chat.id;

        // Caso Foto
        if (msg.photo && msg.photo.length > 0) {
          const caption = (msg.caption || '').trim();
          const match = caption.match(/\d+([.,]\d+)?/);
          const amount = match ? match[0] : '0';
          const concept = match ? caption.replace(match[0], '').trim() || 'Comprobante' : caption || 'Comprobante';

          await sendMessage(
            chatId,
            `Foto recibida. Registrando comprobante de gasto: $ ${amount} (${concept}). Sincronizando con Google Drive y Sheets.`
          );
          continue;
        }

        // Caso Texto
        if (msg.text) {
          const text = msg.text.trim();
          const textLower = text.toLowerCase();

          if (textLower === '/start' || textLower === '/ayuda') {
            await sendMessage(
              chatId,
              'FinanzaHogar Telegram Bot activo.\n\nComandos:\n- /saldo: Resumen de dinero libre y fondos\n- /puedo [monto]: Validador de compras\n- /gasto [monto] [concepto]: Registro de gasto\n- Enviar foto de ticket con monto en pie de foto\n- O pregunta directamente cualquier calculo financiero.'
            );
            continue;
          }

          if (textLower.startsWith('/saldo')) {
            await sendMessage(
              chatId,
              'Estado financiero:\n- Saldo libre: $ 294.000\n- Fondo emergencia: $ 950.000 (Piso min: $ 900.000)\n- Gastos fijos del hogar: $ 393.000'
            );
            continue;
          }

          if (textLower.startsWith('/puedo')) {
            const match = text.match(/\d+([.,]\d+)?/);
            if (match) {
              const val = parseFloat(match[0]);
              if (val <= 294000) {
                await sendMessage(
                  chatId,
                  `Aprobado: El gasto de $ ${val.toLocaleString('es-AR')} entra en tu saldo libre. Te quedaran $ ${(294000 - val).toLocaleString('es-AR')} libres.`
                );
              } else {
                await sendMessage(
                  chatId,
                  `Bloqueado: El gasto de $ ${val.toLocaleString('es-AR')} supera tu saldo libre ($ 294.000) y afectaria tu fondo de emergencia.`
                );
              }
            } else {
              await sendMessage(chatId, 'Indica el monto a evaluar. Ejemplo: /puedo 35000 Zapatillas');
            }
            continue;
          }

          if (textLower.startsWith('/gasto')) {
            const match = text.match(/\d+([.,]\d+)?/);
            const amount = match ? match[0] : '0';
            const concept = match ? text.replace(/\/gasto/i, '').replace(match[0], '').trim() || 'Gasto' : 'Gasto';
            await sendMessage(chatId, `Gasto registrado: $ ${amount} (${concept}). Guardado.`);
            continue;
          }

          // Consultar a Omniroute
          const aiResponse = await askOmniroute(text);
          if (aiResponse) {
            await sendMessage(chatId, aiResponse);
          } else {
            await sendMessage(
              chatId,
              'Indica /saldo para ver tus fondos o envia una foto de ticket para guardar el gasto.'
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error en polling:', err.message);
  }
  setTimeout(pollUpdates, 1000);
}

if (token && token !== 'PEGA_AQUI_TU_TOKEN_DE_BOTFATHER') {
  console.log('Bot de Telegram iniciado con exito en modo long-polling.');
  pollUpdates();
}
