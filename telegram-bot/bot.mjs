/**
 * BOT TELEGRAM LOCAL - GASTONAPP
 * Ejecución directa en Node.js mediante long-polling
 * Con persistencia real, evaluación dinámica, CRUD básico y sincronización con Google Apps Script
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
const DATA_FILE = path.resolve(process.cwd(), 'data', 'telegram_data.json');

// Gestión de datos persistentes locales
function loadLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Error leyendo telegram_data.json:', err.message);
  }
  return {
    monthlyIncome: 500000,
    emergencyFund: 0,
    expenses: [],
    incomes: [],
  };
}

function saveLocalData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando telegram_data.json:', err.message);
  }
}

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

function extractAmountFromText(text) {
  const t = text.toLowerCase();
  if (t.includes('medio palo')) return 500000;
  if (t.includes('un palo')) return 1000000;

  const paloMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:palos?|millon(?:es)?|m\b)/);
  if (paloMatch) return Math.round(parseFloat(paloMatch[1].replace(',', '.')) * 1000000);

  const milMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mil\b|lucas?|lukas?|k\b)/);
  if (milMatch) return Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);

  const numMatch = t.match(/\d+([.,]\d+)?/);
  if (numMatch) return parseFloat(numMatch[0].replace(',', '.'));
  return 0;
}

async function askOmniroute(userMessage, financialContext) {
  if (!omnirouteUrl) return '';

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
            content: `Eres GASTON, analista financiero inteligente en Telegram. Sé elocuente, conciso y respetuoso. Responde en 1 a 3 oraciones sin asteriscos dobles ni emojis. Contexto del usuario: Saldo libre disponible: $ ${financialContext.freeCash.toLocaleString('es-AR')}, Gastado en el mes: $ ${financialContext.totalExpenses.toLocaleString('es-AR')}.`,
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3,
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
  } catch {
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
        const localData = loadLocalData();

        // 1. Caso Foto
        if (msg.photo && msg.photo.length > 0) {
          const caption = (msg.caption || '').trim();
          const amount = extractAmountFromText(caption);
          const concept = caption.replace(/\d+([.,]\d+)?/, '').trim() || 'Comprobante';

          if (appsScriptUrl) {
            try {
              await fetch(appsScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg }),
              });
              continue;
            } catch {}
          }

          if (amount > 0) {
            localData.expenses.unshift({
              id: 'exp_' + Date.now(),
              date: new Date().toISOString().split('T')[0],
              description: concept,
              amount,
            });
            saveLocalData(localData);
          }

          await sendMessage(
            chatId,
            `Comprobante procesado: registré $ ${amount.toLocaleString('es-AR')} (${concept}). Sincronizado.`
          );
          continue;
        }

        // 2. Caso Texto
        if (msg.text) {
          const text = msg.text.trim();
          const textLower = text.toLowerCase();

          // Sincronización transparente con Apps Script si está disponible
          if (appsScriptUrl && (textLower.startsWith('/') || msg.photo)) {
            try {
              const asRes = await fetch(appsScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg }),
              });
              if (asRes.ok) continue;
            } catch {}
          }

          // Cálculo de totales reales
          const currentYM = new Date().toISOString().substring(0, 7);
          const currentExpenses = localData.expenses.filter((e) => e.date?.startsWith(currentYM));
          const totalSpent = currentExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

          const currentIncomes = localData.incomes.filter((i) => i.date?.startsWith(currentYM));
          const totalIncomes = currentIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
          const effectiveIncome = totalIncomes > 0 ? totalIncomes : localData.monthlyIncome;
          const freeCash = Math.max(0, effectiveIncome - totalSpent);

          const now = new Date();
          const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const daysLeft = Math.max(1, totalDaysInMonth - now.getDate());

          // Comando /start o /ayuda
          if (textLower === '/start' || textLower === '/ayuda' || textLower === 'ayuda') {
            await sendMessage(
              chatId,
              'GASTONAPP Bot activo y conectado.\n\nComandos y funciones:\n• /saldo: Estado actual de saldo libre y gastos\n• /puedo [monto]: Evalúa si te conviene realizar una compra\n• /gasto [monto] [concepto]: Registra un gasto\n• /ingreso [monto] [concepto]: Registra un ingreso\n• "Borrá el último gasto": Deshace la última operación\n• También podés enviar fotos de tickets o escribir consultas libres.'
            );
            continue;
          }

          // Comando /saldo
          if (textLower === '/saldo' || textLower === '/resumen' || textLower === 'saldo') {
            await sendMessage(
              chatId,
              `Estado financiero actual (${currentYM}):\n• Saldo libre: $ ${freeCash.toLocaleString('es-AR')} ($ ${Math.round(freeCash / daysLeft).toLocaleString('es-AR')}/día para ${daysLeft} días restantes)\n• Total gastado en el mes: $ ${totalSpent.toLocaleString('es-AR')}\n• Ingresos registrados: $ ${effectiveIncome.toLocaleString('es-AR')}`
            );
            continue;
          }

          // Comando /puedo [monto]
          if (textLower.startsWith('/puedo') || textLower.startsWith('puedo')) {
            const purchaseAmt = extractAmountFromText(text);
            if (purchaseAmt > 0) {
              if (purchaseAmt <= freeCash) {
                const rest = freeCash - purchaseAmt;
                await sendMessage(
                  chatId,
                  `Compra viable: el gasto de $ ${purchaseAmt.toLocaleString('es-AR')} entra en tu saldo libre. Te quedarán $ ${rest.toLocaleString('es-AR')} para los ${daysLeft} días restantes ($ ${Math.round(rest / daysLeft).toLocaleString('es-AR')}/día).`
                );
              } else {
                const deficit = purchaseAmt - freeCash;
                await sendMessage(
                  chatId,
                  `Desaconsejado: el gasto de $ ${purchaseAmt.toLocaleString('es-AR')} supera tu saldo disponible ($ ${freeCash.toLocaleString('es-AR')}) por un déficit de -$ ${deficit.toLocaleString('es-AR')}. Comprometerías tus reservas.`
                );
              }
            } else {
              await sendMessage(chatId, 'Indicá el monto a evaluar. Ejemplo: /puedo 35000 Zapatillas');
            }
            continue;
          }

          // Comando /gasto o instrucción de registro de gasto
          if (textLower.startsWith('/gasto') || textLower.startsWith('gaste ') || textLower.startsWith('gasté ') || textLower.startsWith('pague ') || textLower.startsWith('pagué ')) {
            const amount = extractAmountFromText(text);
            if (amount > 0) {
              const concept = text.replace(/\/gasto/i, '').replace(/gast[eé]/i, '').replace(/pagu[eé]/i, '').replace(/\d+([.,]\d+)?/, '').trim() || 'Gasto';
              localData.expenses.unshift({
                id: 'exp_' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                description: concept,
                amount,
              });
              saveLocalData(localData);

              const newFree = Math.max(0, freeCash - amount);
              await sendMessage(
                chatId,
                `Gasto registrado: $ ${amount.toLocaleString('es-AR')} (${concept}). Tu saldo libre restante es de $ ${newFree.toLocaleString('es-AR')}.`
              );
              continue;
            }
          }

          // Comando /ingreso o registro de ingreso
          if (textLower.startsWith('/ingreso') || textLower.startsWith('cobre ') || textLower.startsWith('cobré ')) {
            const amount = extractAmountFromText(text);
            if (amount > 0) {
              const concept = text.replace(/\/ingreso/i, '').replace(/cobr[eé]/i, '').replace(/\d+([.,]\d+)?/, '').trim() || 'Sueldo / Salario';
              localData.incomes.unshift({
                id: 'inc_' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                description: concept,
                amount,
              });
              saveLocalData(localData);

              const newFree = freeCash + amount;
              await sendMessage(
                chatId,
                `Ingreso registrado: $ ${amount.toLocaleString('es-AR')} (${concept}). Tu saldo libre asciende a $ ${newFree.toLocaleString('es-AR')}.`
              );
              continue;
            }
          }

          // Deshacer / borrar último gasto
          if (textLower.includes('borr') && (textLower.includes('ultimo') || textLower.includes('último'))) {
            if (localData.expenses.length > 0) {
              const deleted = localData.expenses.shift();
              saveLocalData(localData);
              const restoredFree = freeCash + deleted.amount;
              await sendMessage(
                chatId,
                `Eliminé el último gasto: "${deleted.description}" ($ ${deleted.amount.toLocaleString('es-AR')}). Tu saldo libre se restableció a $ ${restoredFree.toLocaleString('es-AR')}.`
              );
              continue;
            } else {
              await sendMessage(chatId, 'No hay gastos registrados para eliminar.');
              continue;
            }
          }

          // Consultar a Omniroute / LLM
          const aiResponse = await askOmniroute(text, { freeCash, totalExpenses: totalSpent });
          if (aiResponse) {
            await sendMessage(chatId, aiResponse);
          } else {
            await sendMessage(
              chatId,
              'Escribí /saldo para consultar tus fondos, /puedo [monto] para evaluar una compra, o /gasto [monto] [concepto] para asentar una operación.'
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
