/**
 * SERVICIO DE BOT TELEGRAM EN EL NAVEGADOR
 * Permite a cualquier usuario conectar su bot de Telegram en 1 solo clic
 * pegando el token de @BotFather, sin tocar servidores, webhooks ni Apps Script.
 */

import type { Expense, Income, SavingsGoal } from '../types/finance';

interface BotHandlers {
  getExpenses: () => Expense[];
  getIncomes?: () => Income[];
  getSavings: () => SavingsGoal[];
  getMonthlyIncome: () => number;
  getCurrency: () => string;
  addExpense: (expense: Omit<Expense, 'id'>, receiptBase64?: string, receiptFilename?: string) => Promise<void>;
  addIncome?: (income: Omit<Income, 'id'>) => Promise<void>;
  askAdvisor?: (query: string) => Promise<string>;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting' | 'error', errorMsg?: string) => void;
}

let isRunning = false;
let pollingAbortController: AbortController | null = null;
let currentOffset = 0;

export function isBrowserBotRunning(): boolean {
  return isRunning;
}

/**
 * Enviar mensaje al chat de Telegram
 */
export async function sendTelegramMessage(token: string, chatId: number | string, text: string): Promise<boolean> {
  try {
    const cleanToken = token.trim();
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error enviando mensaje a Telegram:', err);
    return false;
  }
}

/**
 * Descarga una foto enviada por Telegram y la convierte a Base64
 */
async function downloadTelegramPhotoAsBase64(token: string, fileId: string): Promise<{ base64: string; filename: string } | null> {
  try {
    const cleanToken = token.trim();
    const fileRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) return null;

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${cleanToken}/${filePath}`;
    const imgRes = await fetch(downloadUrl);
    const blob = await imgRes.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string) || '';
        const ext = filePath.split('.').pop() || 'jpg';
        resolve({
          base64,
          filename: `ticket_tg_${Date.now()}.${ext}`,
        });
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Detiene el receptor del bot en el navegador
 */
export function stopBrowserTelegramBot() {
  isRunning = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
}

/**
 * Inicia la recepcion de mensajes directa desde el navegador
 */
export async function startBrowserTelegramBot(token: string, handlers: BotHandlers) {
  const cleanToken = token.trim();
  if (!cleanToken) {
    handlers.onStatusChange?.('error', 'Token de Telegram vacio');
    return;
  }

  // Detener instancia previa si existiera
  stopBrowserTelegramBot();
  isRunning = true;
  handlers.onStatusChange?.('connecting');

  // 1. Eliminar cualquier Webhook previo para permitir el modo de escucha directa
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook?drop_pending_updates=true`);
  } catch {}

  // 2. Verificar datos del bot
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      isRunning = false;
      handlers.onStatusChange?.('error', meData.description || 'Token invalido');
      return;
    }
  } catch (err: any) {
    isRunning = false;
    handlers.onStatusChange?.('error', err.message || 'Error de conexion con Telegram');
    return;
  }

  handlers.onStatusChange?.('connected');

  // Bucle de escucha
  const poll = async () => {
    if (!isRunning) return;

    pollingAbortController = new AbortController();

    try {
      const url = `https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${currentOffset}&timeout=25`;
      const res = await fetch(url, { signal: pollingAbortController.signal });
      if (!res.ok) {
        if (isRunning) setTimeout(poll, 3000);
        return;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          currentOffset = update.update_id + 1;
          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;

          // 1. Caso FOTO (Ticket / Factura)
          if (msg.photo && msg.photo.length > 0) {
            const photoObj = msg.photo[msg.photo.length - 1];
            const caption = (msg.caption || '').trim();
            const numberMatch = caption.match(/\d+([.,]\d+)?/);
            const amount = numberMatch ? parseFloat(numberMatch[0].replace(',', '.')) : 0;
            const concept = numberMatch
              ? caption.replace(numberMatch[0], '').trim() || 'Comprobante'
              : caption || 'Comprobante';

            const photoData = await downloadTelegramPhotoAsBase64(cleanToken, photoObj.file_id);

            await handlers.addExpense(
              {
                date: new Date().toISOString().split('T')[0],
                description: concept,
                category: 'Varios',
                type: 'variable',
                amount: amount,
                paymentMethod: 'Telegram',
                notes: 'Ticket recibido por Telegram Bot',
              },
              photoData?.base64,
              photoData?.filename
            );

            const curr = handlers.getCurrency();
            if (amount > 0) {
              await sendTelegramMessage(
                cleanToken,
                chatId,
                `Gasto registrado: ${curr} ${amount.toLocaleString('es-AR')} (${concept}). Guardado en tu panel.`
              );
            } else {
              await sendTelegramMessage(
                cleanToken,
                chatId,
                `Comprobante guardado en tu panel. Para registrar el importe escribe: /gasto [monto] ${concept}`
              );
            }
            continue;
          }

          // 2. Caso TEXTO
          if (msg.text) {
            const text = msg.text.trim();
            const textLower = text.toLowerCase();

            // Comando /start o /ayuda
            if (textLower === '/start' || textLower === '/ayuda' || textLower === 'ayuda') {
              const helpText =
                'GASTONAPP Bot activo y conectado en vivo.\n\n' +
                'Comandos disponibles:\n' +
                '1. /saldo - Consulta tu dinero libre, ingresos y fondos\n' +
                '2. /puedo [monto] [concepto] - Validador de compras\n' +
                '3. /gasto [monto] [concepto] - Registrar gasto por texto\n' +
                '4. /ingreso [monto] [concepto] - Registrar ingreso por texto\n' +
                '5. Enviar foto de factura con el monto en el pie de foto\n\n' +
                'Tambien puedes hacerme cualquier consulta o calculo financiero.';
              await sendTelegramMessage(cleanToken, chatId, helpText);
              continue;
            }

            // Calculo de saldos actuales
            const configuredIncome = handlers.getMonthlyIncome();
            const incomesList = handlers.getIncomes ? handlers.getIncomes() : [];
            const expenses = handlers.getExpenses();
            const curr = handlers.getCurrency();
            const currentYM = new Date().toISOString().substring(0, 7);

            let totalIncomeThisMonth = 0;
            incomesList.forEach((inc) => {
              if (inc.date.startsWith(currentYM)) {
                totalIncomeThisMonth += Number(inc.amount) || 0;
              }
            });
            const effectiveIncome = totalIncomeThisMonth > 0 ? totalIncomeThisMonth : configuredIncome;

            let totalSpentThisMonth = 0;
            let fixedSpentThisMonth = 0;
            expenses.forEach((e) => {
              if (e.date.startsWith(currentYM)) {
                totalSpentThisMonth += Number(e.amount) || 0;
                if (e.type === 'fijo') fixedSpentThisMonth += Number(e.amount) || 0;
              }
            });

            const freeCash = Math.max(0, effectiveIncome - totalSpentThisMonth);

            const savings = handlers.getSavings();
            let emergencyFundTotal = 0;
            savings.forEach((s) => {
              if (s.isEmergencyFund) emergencyFundTotal += Number(s.currentAmount) || 0;
            });

            // Comando /saldo
            if (textLower === '/saldo' || textLower === '/resumen' || textLower === 'saldo') {
              const report =
                `Estado financiero GASTONAPP (${currentYM}):\n` +
                `- Ingresos del mes: ${curr} ${effectiveIncome.toLocaleString('es-AR')}${totalIncomeThisMonth > 0 ? ' (registrados)' : ' (base)'}\n` +
                `- Saldo libre disponible: ${curr} ${freeCash.toLocaleString('es-AR')}\n` +
                `- Total gastado este mes: ${curr} ${totalSpentThisMonth.toLocaleString('es-AR')}\n` +
                `- Gastos fijos del hogar: ${curr} ${fixedSpentThisMonth.toLocaleString('es-AR')}\n` +
                `- Fondo de emergencia: ${curr} ${emergencyFundTotal.toLocaleString('es-AR')}`;
              await sendTelegramMessage(cleanToken, chatId, report);
              continue;
            }

            // Comando /puedo [monto] [concepto]
            if (textLower.startsWith('/puedo') || textLower.startsWith('puedo')) {
              const match = text.match(/\d+([.,]\d+)?/);
              if (!match) {
                await sendTelegramMessage(cleanToken, chatId, 'Indica el monto a evaluar antes de que te juzgue. Ejemplo: /puedo 35000 Zapatillas');
                continue;
              }

              const purchaseAmt = parseFloat(match[0].replace(',', '.'));
              const now = new Date();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const daysLeft = Math.max(1, daysInMonth - now.getDate());

              if (purchaseAmt <= freeCash) {
                const rest = freeCash - purchaseAmt;
                const dailyRest = Math.round(rest / daysLeft);
                await sendTelegramMessage(
                  cleanToken,
                  chatId,
                  `Aprobado a regañadientes: Milagro de San Lionel Messi, te da el cuero. El gasto de ${curr} ${purchaseAmt.toLocaleString('es-AR')} entra en tu saldo libre. Te quedan ${curr} ${rest.toLocaleString('es-AR')} para los ${daysLeft} dias que faltan de mes (${curr} ${dailyRest.toLocaleString('es-AR')}/dia). No te vas a morir de hambre y la pelota no se mancha, pero deja de inventar gastos absurdos. ¡Vamoooo Messi!`
                );
              } else {
                const deficit = purchaseAmt - freeCash;
                await sendTelegramMessage(
                  cleanToken,
                  chatId,
                  `BLOQUEADO POR LA SCALONETA: ¡¿Que miras, bobo?! ¡Anda pa alla y guarda esa tarjeta! Ese gasto de ${curr} ${purchaseAmt.toLocaleString('es-AR')} supera tu saldo libre (${curr} ${freeCash.toLocaleString('es-AR')}) por un deficit de -${curr} ${deficit.toLocaleString('es-AR')}. Te faltan ${daysLeft} dias para terminar el mes. Como decia el Diego, te estas cortando las piernas solo: vas a quedar en la lona comiendo aire. Veredicto: NI EN PEDO.`
                );
              }
              continue;
            }

            // Comando /ingreso [monto] [concepto]
            if (textLower.startsWith('/ingreso') || textLower.startsWith('ingreso ')) {
              const match = text.match(/\d+([.,]\d+)?/);
              if (match) {
                const amt = parseFloat(match[0].replace(',', '.'));
                const concept = text.replace(/\/ingreso/i, '').replace(/ingreso/i, '').replace(match[0], '').trim() || 'Ingreso';
                if (handlers.addIncome) {
                  await handlers.addIncome({
                    date: new Date().toISOString().split('T')[0],
                    description: concept,
                    category: 'Sueldo',
                    amount: amt,
                    paymentMethod: 'Transferencia',
                    notes: 'Cargado por comando de Telegram',
                  });

                  await sendTelegramMessage(
                    cleanToken,
                    chatId,
                    `Ingreso registrado: ${curr} ${amt.toLocaleString('es-AR')} (${concept}). Actualizado en tu panel GASTONAPP.`
                  );
                  continue;
                }
              } else {
                await sendTelegramMessage(
                  cleanToken,
                  chatId,
                  'Indica el monto a registrar. Ejemplo: /ingreso 500000 Sueldo'
                );
                continue;
              }
            }

            // Comando /gasto [monto] [concepto]
            if (textLower.startsWith('/gasto') || textLower.startsWith('gasto ')) {
              const match = text.match(/\d+([.,]\d+)?/);
              if (match) {
                const amt = parseFloat(match[0].replace(',', '.'));
                const concept = text.replace(/\/gasto/i, '').replace(/gasto/i, '').replace(match[0], '').trim() || 'Gasto';
                await handlers.addExpense({
                  date: new Date().toISOString().split('T')[0],
                  description: concept,
                  category: 'Varios',
                  type: 'variable',
                  amount: amt,
                  paymentMethod: 'Telegram',
                  notes: 'Cargado por comando de Telegram',
                });

                await sendTelegramMessage(
                  cleanToken,
                  chatId,
                  `Gasto registrado: ${curr} ${amt.toLocaleString('es-AR')} (${concept}). Guardado en tu panel.`
                );
                continue;
              }
            }

            // Consulta general / Asesor IA
            if (handlers.askAdvisor) {
              try {
                const aiAnswer = await handlers.askAdvisor(text);
                if (aiAnswer) {
                  await sendTelegramMessage(cleanToken, chatId, aiAnswer);
                  continue;
                }
              } catch {}
            }

            await sendTelegramMessage(
              cleanToken,
              chatId,
              'Escribe /saldo para ver tus fondos, /puedo [monto] para evaluar una compra, o envia una foto de ticket para registrar un gasto.'
            );
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn('Telegram polling retry:', e.message);
    }

    if (isRunning) {
      setTimeout(poll, 1000);
    }
  };

  poll();
}