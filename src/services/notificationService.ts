import type { ScheduledExpense, ScheduledIncome, RecurrenceType } from '../types/finance';
import { formatMoney } from '../utils/helpers';
import { sendTelegramTestMessage } from './telegramService';

const NOTIFIED_CACHE_KEY = 'gaston_notified_scheduled_v1';

/**
 * Calcula la diferencia en días entre hoy y una fecha objetivo YYYY-MM-DD
 * Retorna 0 si es hoy, números positivos si es en el futuro, negativos si ya pasó.
 */
export function getDaysDiff(targetDateStr: string): number {
  if (!targetDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = targetDateStr.split('-').map(Number);
  const target = new Date(year, (month || 1) - 1, day || 1);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la próxima fecha de vencimiento según la periodicidad
 */
export function calculateNextDueDate(
  currentDateStr: string,
  recurrence: RecurrenceType,
  preferredDay?: number
): string {
  if (recurrence === 'una_vez') return currentDateStr;

  const [y, m, d] = (currentDateStr || new Date().toISOString().split('T')[0])
    .split('-')
    .map(Number);
  const date = new Date(y, m - 1, d || 1);

  switch (recurrence) {
    case 'semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'quincenal':
      date.setDate(date.getDate() + 15);
      break;
    case 'mensual': {
      // Sumar un mes
      const targetMonth = date.getMonth() + 1;
      date.setMonth(targetMonth);
      if (preferredDay) {
        // Asegurar que el día no exceda los días del mes
        const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(preferredDay, maxDays));
      }
      break;
    }
    case 'anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Comprueba si la API de Notificaciones del navegador está disponible
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Obtiene el permiso actual de notificaciones
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Solicita permisos de notificación al usuario
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error solicitando permisos de notificación:', err);
    return 'denied';
  }
}

/**
 * Envía una notificación nativa del navegador
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notification = new Notification(title, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('Error emitiendo notificación nativa:', err);
    return false;
  }
}

/**
 * Filtra los gastos programados que vencen en los próximos X días
 */
export function getUpcomingScheduledExpenses(
  expenses: ScheduledExpense[],
  withinDays = 7
): Array<{ expense: ScheduledExpense; daysRemaining: number }> {
  return expenses
    .filter((e) => e.status === 'pendiente')
    .map((expense) => ({
      expense,
      daysRemaining: getDaysDiff(expense.dueDate),
    }))
    .filter((item) => item.daysRemaining <= withinDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Filtra los ingresos programados que se esperan en los próximos X días
 */
export function getUpcomingScheduledIncomes(
  incomes: ScheduledIncome[],
  withinDays = 7
): Array<{ income: ScheduledIncome; daysRemaining: number }> {
  return incomes
    .filter((i) => i.status === 'pendiente')
    .map((income) => ({
      income,
      daysRemaining: getDaysDiff(income.expectedDate),
    }))
    .filter((item) => item.daysRemaining <= withinDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Comprueba y dispara notificaciones (Navegador y Telegram) de vencimientos
 */
export async function checkAndTriggerScheduledNotifications(params: {
  scheduledExpenses: ScheduledExpense[];
  scheduledIncomes: ScheduledIncome[];
  telegramToken?: string;
  telegramChatId?: string;
  currency?: string;
  force?: boolean;
}): Promise<{ browserSent: number; telegramSent: number }> {
  const {
    scheduledExpenses,
    scheduledIncomes,
    telegramToken,
    telegramChatId,
    currency = '$',
    force = false,
  } = params;

  let browserSent = 0;
  let telegramSent = 0;

  // Cache para evitar repetir notificaciones en el mismo día
  let notifiedCache: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
    if (raw) notifiedCache = JSON.parse(raw);
  } catch {}

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Revisar Gastos Programados
  const upcomingDebits = getUpcomingScheduledExpenses(scheduledExpenses, 3);

  for (const item of upcomingDebits) {
    const { expense, daysRemaining } = item;
    const notifyThreshold = expense.notifyDaysBefore !== undefined ? expense.notifyDaysBefore : 1;

    // Notificar si daysRemaining <= notifyThreshold
    if (daysRemaining <= notifyThreshold) {
      const cacheKey = `exp_${expense.id}_${expense.dueDate}_${daysRemaining}`;

      // Si ya fue notificado hoy y no es forzado, saltear
      if (!force && notifiedCache[cacheKey] === todayStr) {
        continue;
      }

      let timingLabel = '';
      if (daysRemaining <= 0) {
        timingLabel = expense.autoDebit ? '¡Se debita HOY!' : '¡Vence HOY!';
      } else if (daysRemaining === 1) {
        timingLabel = expense.autoDebit ? 'Se debita MAÑANA' : 'Vence MAÑANA';
      } else {
        timingLabel = expense.autoDebit
          ? `Se debita en ${daysRemaining} días`
          : `Vence en ${daysRemaining} días`;
      }

      const formattedAmount = formatMoney(expense.amount, currency);
      const title = `🔔 GastonApp: ${timingLabel}`;
      const body = `${expense.description}: ${formattedAmount} (${expense.paymentMethod || 'Débito'}). Revisá tener saldo en tu cuenta.`;

      // Enviar navegador
      const sentBrowser = sendBrowserNotification(title, { body });
      if (sentBrowser) browserSent++;

      // Enviar Telegram si está configurado
      if (telegramToken && telegramChatId) {
        const telegramMsg = `⚠️ *Recordatorio de Débito Gaston*\n\n👉 *${timingLabel}*: ${expense.description}\n💰 *Monto*: ${formattedAmount}\n💳 *Método*: ${expense.paymentMethod || 'Cuenta bancaria / Tarjeta'}\n🗓 *Fecha*: ${expense.dueDate}\n\n_Revisá tener saldo disponible para que no sea rechazado._`;
        try {
          await sendTelegramTestMessage(telegramToken, telegramChatId, telegramMsg);
          telegramSent++;
        } catch (e) {
          console.warn('Error enviando alerta por Telegram:', e);
        }
      }

      notifiedCache[cacheKey] = todayStr;
    }
  }

  // 2. Revisar Ingresos Programados
  const upcomingIncomes = getUpcomingScheduledIncomes(scheduledIncomes, 2);

  for (const item of upcomingIncomes) {
    const { income, daysRemaining } = item;
    const notifyThreshold = income.notifyDaysBefore !== undefined ? income.notifyDaysBefore : 1;

    if (daysRemaining <= notifyThreshold) {
      const cacheKey = `inc_${income.id}_${income.expectedDate}_${daysRemaining}`;
      if (!force && notifiedCache[cacheKey] === todayStr) {
        continue;
      }

      let timingLabel = '';
      if (daysRemaining <= 0) {
        timingLabel = 'Cobro esperado para HOY';
      } else if (daysRemaining === 1) {
        timingLabel = 'Cobro esperado para MAÑANA';
      } else {
        timingLabel = `Cobro esperado en ${daysRemaining} días`;
      }

      const formattedAmount = formatMoney(income.amount, currency);
      const title = `💰 GastonApp: ${timingLabel}`;
      const body = `${income.description}: ${formattedAmount}. Confirmá si ya ingresó el pago.`;

      const sentBrowser = sendBrowserNotification(title, { body });
      if (sentBrowser) browserSent++;

      if (telegramToken && telegramChatId) {
        const telegramMsg = `💵 *Aviso de Ingreso Programado Gaston*\n\n👉 *${timingLabel}*: ${income.description}\n💰 *Monto*: ${formattedAmount}\n🗓 *Fecha*: ${income.expectedDate}\n\n_Ingresá a GastonApp para asentarlo cuando impacte en tu cuenta._`;
        try {
          await sendTelegramTestMessage(telegramToken, telegramChatId, telegramMsg);
          telegramSent++;
        } catch {}
      }

      notifiedCache[cacheKey] = todayStr;
    }
  }

  // Persistir caché
  try {
    localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(notifiedCache));
  } catch {}

  return { browserSent, telegramSent };
}
