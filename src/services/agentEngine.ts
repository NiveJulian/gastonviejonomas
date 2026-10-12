import type {
  Expense,
  Income,
  SavingsGoal,
  Investment,
  ScheduledExpense,
  ScheduledIncome,
  Debt,
  RecurrenceType,
  AppConfig,
  GoogleUser,
  ExpenseCategory,
  IncomeCategory,
  ExpenseType,
} from '../types/finance';
import { calculateFinancialTotals } from '../utils/rulesEngine';
import { calculateComfortAnalysis } from '../utils/comfortCalculator';
import { calculateDebtTotals, getDebtDetails } from '../utils/debtCalculator';
import { formatMoney } from '../utils/helpers';
import {
  inferExpenseCategory,
  inferIncomeCategory,
  recordAgentAction,
  getLastAgentAction,
  popLastAgentAction,
  extractLearningFromCorrection,
  addLearnedRule,
  getLearnedRulesPrompt,
  type AgentActionLog,
} from './agentLearningService';

export interface AgentExecutionContext {
  expenses: Expense[];
  incomes: Income[];
  savings: SavingsGoal[];
  investments: Investment[];
  scheduledExpenses?: ScheduledExpense[];
  scheduledIncomes?: ScheduledIncome[];
  debts?: Debt[];
  config: AppConfig;
  googleUser?: GoogleUser | null;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense?: (id: string, updated: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome?: (income: Omit<Income, 'id'>) => Promise<void>;
  updateIncome?: (id: string, updated: Partial<Income>) => Promise<void>;
  deleteIncome?: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsAmount?: (id: string, amount: number) => Promise<void>;
  deleteSavingsGoal?: (id: string) => Promise<void>;
  addInvestment?: (investment: Omit<Investment, 'id'>) => Promise<void>;
  deleteInvestment?: (id: string) => Promise<void>;
  updateConfig?: (newConfig: Partial<AppConfig>) => Promise<void>;
  addScheduledExpense?: (item: Omit<ScheduledExpense, 'id'>) => Promise<void>;
  addScheduledIncome?: (item: Omit<ScheduledIncome, 'id'>) => Promise<void>;
  executeScheduledExpense?: (id: string) => Promise<void>;
  executeScheduledIncome?: (id: string) => Promise<void>;
  addDebt?: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt?: (id: string, updated: Partial<Debt>) => Promise<void>;
  deleteDebt?: (id: string) => Promise<void>;
  payDebtInstallment?: (id: string) => Promise<void>;
  collectDebtInstallment?: (id: string) => Promise<void>;
}

export interface AgentExecutionResult {
  reply: string;
  actionExecuted?: {
    type:
      | 'CREATE_EXPENSE'
      | 'UPDATE_EXPENSE'
      | 'DELETE_EXPENSE'
      | 'CREATE_INCOME'
      | 'UPDATE_INCOME'
      | 'DELETE_INCOME'
      | 'CREATE_GOAL'
      | 'UPDATE_GOAL'
      | 'DELETE_GOAL'
      | 'ALLOCATE_SAVINGS'
      | 'UPDATE_EMERGENCY_FUND'
      | 'CALCULATE_COMFORT'
      | 'CALCULATE_DAILY_TARGET'
      | 'ANALYZE_WEEKLY_SALES'
      | 'CREATE_INVESTMENT'
      | 'SCHEDULE_EXPENSE'
      | 'SCHEDULE_INCOME'
      | 'EXECUTE_SCHEDULED'
      | 'CREATE_DEBT'
      | 'UPDATE_DEBT'
      | 'PAY_INSTALLMENT'
      | 'COLLECT_INSTALLMENT'
      | 'CALCULATE_DEBT_PLAN'
      | 'ASK_DEBT_DETAILS'
      | 'LEARN_RULE'
      | 'QUERY';
    summary: string;
    entityId?: string;
    data?: any;
  };
  learnedRule?: string;
}

/**
 * Extrae montos numéricos considerando modismos argentinos y formatos estándar
 */
export function extractAmount(text: string): number {
  const t = text.toLowerCase();

  // Expresiones de palos
  if (t.includes('medio palo')) return 500000;
  if (t.includes('un palo y medio')) return 1500000;
  if (t.includes('dos palos y medio')) return 2500000;

  const paloMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:palos?|millon(?:es)?|m\b)/);
  if (paloMatch) {
    const rawVal = paloMatch[1].replace(',', '.');
    const n = parseFloat(rawVal);
    if (!isNaN(n) && n > 0) return Math.round(n * 1000000);
  }

  // Lucas, mil, k
  const milMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mil\b|lucas?|lukas?|k\b)/);
  if (milMatch) {
    const rawVal = milMatch[1].replace(',', '.');
    const n = parseFloat(rawVal);
    if (!isNaN(n) && n > 0) return Math.round(n * 1000);
  }

  // Montos numéricos estándar ($ 15.000, 15000, 25.500, etc.)
  const numberRegex = /(?:(\$)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/g;
  let match: RegExpExecArray | null;
  const candidates: { val: number; score: number }[] = [];

  while ((match = numberRegex.exec(t)) !== null) {
    const hasDollar = !!match[1];
    const raw = match[2];
    let val = 0;

    if (raw.includes('.') && !raw.includes(',')) {
      const parts = raw.split('.');
      const isThousands = parts.slice(1).every((p) => p.length === 3);
      val = isThousands ? parseFloat(raw.replace(/\./g, '')) : parseFloat(raw);
    } else if (raw.includes('.') && raw.includes(',')) {
      val = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    } else if (raw.includes(',')) {
      val = parseFloat(raw.replace(',', '.'));
    } else {
      val = parseFloat(raw);
    }

    if (val > 0) {
      const matchIndex = match.index;
      const matchEnd = matchIndex + match[0].length;
      const textBefore = t.substring(Math.max(0, matchIndex - 20), matchIndex);
      const textAfter = t.substring(matchEnd, Math.min(t.length, matchEnd + 20));

      let score = 0;
      if (hasDollar) score += 100;
      if (/\b(pesos|mangos|ars)\b/.test(textAfter)) score += 50;
      if (/\b(ingreso|gasto|cobre|pague|comprar|sale|cuesta|monto|valor|precio)\b/.test(textBefore)) score += 40;
      if (/\b(dia|dias|cuota|cuotas|mes|meses|año|años)\b/.test(textAfter)) score -= 60;
      if (/\b(dia|dias|cada)\b/.test(textBefore)) score -= 40;
      if (val >= 1000) score += 20;

      candidates.push({ val: Math.round(val), score });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score || b.val - a.val);
    return candidates[0].val;
  }

  return 0;
}

/**
 * Limpia y extrae el concepto o descripción de un prompt
 */
function cleanDescription(text: string, amount: number): string {
  let clean = text
    .replace(/(?:por favor|che|gaston|gastón|anot[aá]|registr[aá]|carg[aá]|ingres[aá]|agreg[aá]|anotame|cargame|anota|registra|carga|guarda|guardame)/gi, '')
    .replace(/(?:un gasto de|un ingreso de|gasto de|ingreso de|gaste|gasté|pague|pagué|cobre|cobré|compre|compré|en concepto de|para)/gi, '')
    .replace(/(?:un gasto fijo de|gasto fijo de|gasto fijo|fijo de)/gi, '')
    .replace(/\b(?:pesos|mangos|ars|lucas|palos|k|mil)\b/gi, '')
    .trim();

  if (amount > 0) {
    // Quitar el número del monto
    const amountStr = amount.toString();
    clean = clean.replace(new RegExp(`\\$?\\s*${amountStr}`, 'g'), '');
    const formattedWithDot = amount.toLocaleString('es-AR');
    clean = clean.replace(new RegExp(`\\$?\\s*${formattedWithDot.replace(/\./g, '\\.')}`, 'g'), '');
  }

  clean = clean.replace(/\b\d+(?:[.,]\d+)?\b/g, '');
  clean = clean.replace(/\s+/g, ' ').replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();
  // Capitalizar primera letra
  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Varios';
}

/**
 * Limpia y extrae el nombre de una meta de ahorro o fondo
 */
function cleanGoalName(text: string, amount: number): string {
  let clean = text
    .replace(/(?:por favor|che|gaston|gastón|crear|armar|nueva meta|meta de ahorro|meta|objetivo|fondo de emergencia|fondo de reserva)/gi, '')
    .replace(/(?:de ahorro para|para|de|un|una)/gi, '')
    .replace(/\b(?:pesos|mangos|ars|lucas|palos|k|mil)\b/gi, '')
    .trim();

  if (amount > 0) {
    const amountStr = amount.toString();
    clean = clean.replace(new RegExp(`\\$?\\s*${amountStr}`, 'g'), '');
    const formattedWithDot = amount.toLocaleString('es-AR');
    clean = clean.replace(new RegExp(`\\$?\\s*${formattedWithDot.replace(/\./g, '\\.')}`, 'g'), '');
  }

  clean = clean.replace(/\b\d+(?:[.,]\d+)?\b/g, '');
  clean = clean.replace(/\s+/g, ' ').replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();
  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Meta Financiera';
}

/**
 * Extrae la fecha de vencimiento/programación según expresiones en lenguaje natural
 */
export function extractDueDate(text: string): { dueDate: string; dayOfMonth?: number } {
  const t = text.toLowerCase();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (t.includes('hoy')) {
    return { dueDate: todayStr, dayOfMonth: now.getDate() };
  }

  if (t.includes('mañana')) {
    const tm = new Date(now);
    tm.setDate(tm.getDate() + 1);
    return { dueDate: tm.toISOString().split('T')[0], dayOfMonth: tm.getDate() };
  }

  if (t.includes('pasado mañana')) {
    const pm = new Date(now);
    pm.setDate(pm.getDate() + 2);
    return { dueDate: pm.toISOString().split('T')[0], dayOfMonth: pm.getDate() };
  }

  // Formato ISO YYYY-MM-DD
  const isoMatch = t.match(/\b(20\d\d[-/]\d{1,2}[-/]\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1].replace(/\//g, '-'));
    if (!isNaN(d.getTime())) {
      return { dueDate: d.toISOString().split('T')[0], dayOfMonth: d.getDate() };
    }
  }

  // Formato DD/MM o DD/MM/YYYY
  const slashMatch = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d\d))?\b/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = slashMatch[3] ? parseInt(slashMatch[3], 10) : now.getFullYear();
    const targetDate = new Date(year, month, day);
    if (!isNaN(targetDate.getTime())) {
      return { dueDate: targetDate.toISOString().split('T')[0], dayOfMonth: day };
    }
  }

  // Expresiones de día del mes: "el 15", "el día 10", "el 5 de cada mes", "los 10"
  const dayMatch = t.match(/\b(?:el\s+(?:día\s+)?|dia\s+|los\s+)(\d{1,2})(?:\s*(?:de\s+cada\s+mes|\b))/);
  if (dayMatch) {
    const dayNum = parseInt(dayMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      let year = now.getFullYear();
      let month = now.getMonth();
      if (now.getDate() > dayNum) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
      const validDay = Math.min(dayNum, daysInTargetMonth);
      const computed = new Date(year, month, validDay);
      return {
        dueDate: computed.toISOString().split('T')[0],
        dayOfMonth: dayNum,
      };
    }
  }

  // Por defecto: 7 días a futuro
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { dueDate: inAWeek.toISOString().split('T')[0], dayOfMonth: inAWeek.getDate() };
}

/**
 * Extrae la recurrencia especificada
 */
export function extractRecurrence(text: string): RecurrenceType {
  const t = text.toLowerCase();
  if (t.includes('semanal') || t.includes('cada semana') || t.includes('todas las semanas')) return 'semanal';
  if (t.includes('quincenal') || t.includes('cada 15') || t.includes('cada quincena')) return 'quincenal';
  if (t.includes('anual') || t.includes('cada año') || t.includes('todos los años')) return 'anual';
  if (t.includes('una vez') || t.includes('una sola vez') || t.includes('unica vez') || t.includes('única vez') || t.includes('sola vez')) return 'una_vez';
  return 'mensual';
}

/**
 * Limpia y extrae la descripción de un gasto o ingreso programado
 */
function cleanScheduledDescription(text: string, amount: number): string {
  let clean = text
    .replace(/(?:por favor|che|gaston|gastón|anot[aá]|registr[aá]|carg[aá]|ingres[aá]|agreg[aá]|program[aá]|agend[aá])/gi, '')
    .replace(/(?:el débito de|el debito de|débito de|debito de|el débito automático de|el debito automatico de|débito automático de|debito automatico de)/gi, '')
    .replace(/(?:un gasto programado de|gasto programado de|un cobro programado de|cobro programado de|un ingreso programado de|ingreso programado de)/gi, '')
    .replace(/(?:un gasto de|un ingreso de|el cobro de|cobro de|el pago de|pago de)/gi, '')
    .replace(/(?:de cada mes|todos los meses|cada mes|mensual|quincenal|semanal|anual|una vez)/gi, '')
    .replace(/\b(?:pesos|mangos|ars|lucas|palos|k|mil)\b/gi, '')
    .replace(/\b(?:el\s+(?:día\s+)?|dia\s+|los\s+)?\d{1,2}(?:\s*(?:de\s+cada\s+mes|\b))?/gi, '')
    .replace(/\b(?:para el|el día|el dia|para|el)\b/gi, '')
    .trim();

  if (amount > 0) {
    const amountStr = amount.toString();
    clean = clean.replace(new RegExp(`\\$?\\s*${amountStr}`, 'g'), '');
    const formattedWithDot = amount.toLocaleString('es-AR');
    clean = clean.replace(new RegExp(`\\$?\\s*${formattedWithDot.replace(/\./g, '\\.')}`, 'g'), '');
  }

  clean = clean.replace(/\b\d+(?:[.,]\d+)?\b/g, '');
  clean = clean.replace(/\s+/g, ' ').replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();
  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Gasto Programado';
}

/**
 * Extrae número de cuotas totales y pagadas de un texto
 */
export function extractInstallments(text: string): {
  totalInstallments?: number;
  paidInstallments?: number;
} {
  const t = text.toLowerCase();
  let totalInstallments: number | undefined;
  let paidInstallments: number | undefined;

  // Cuotas fraccionarias: "ya pagué 5 de 12", "5 de 12 cuotas", "5/12 cuotas"
  const fractionMatch = t.match(/\b(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\s*(?:cuotas)?\b/);
  if (fractionMatch) {
    paidInstallments = parseInt(fractionMatch[1], 10);
    totalInstallments = parseInt(fractionMatch[2], 10);
    return { totalInstallments, paidInstallments };
  }

  // Cuotas pagadas / que viene arrastrando: "ya pagué 5", "vengo pagando 4 cuotas", "pagadas 6"
  const paidMatch = t.match(/\b(?:ya\s+pagu[eé]|vengo\s+pagando|llevo\s+pagando|pagu[eé]|pagadas?)\s*(\d{1,2})\s*(?:cuotas?)?\b/);
  if (paidMatch) {
    paidInstallments = parseInt(paidMatch[1], 10);
  }

  // Cuotas totales: "en 12 cuotas", "18 cuotas", "en 6 veces", "6 pagos"
  const totalMatch = t.match(/\b(?:en\s+)?(\d{1,2})\s*(?:cuotas|veces|pagos)\b/);
  if (totalMatch) {
    totalInstallments = parseInt(totalMatch[1], 10);
  }

  return { totalInstallments, paidInstallments };
}

/**
 * Extrae porcentaje de destino de ingresos (ej: 20%)
 */
export function extractIncomePercent(text: string): number | undefined {
  const match = text.match(/\b(\d{1,2})\s*%\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (val > 0 && val <= 100) return val;
  }
  return undefined;
}

/**
 * Limpia y extrae el nombre o concepto de una deuda
 */
export function cleanDebtName(text: string, amount: number): string {
  let clean = text
    .replace(/(?:por favor|che|gaston|gastón|anot[aá]|registr[aá]|carg[aá]|agreg[aá]|tengo una deuda de|tengo una deuda|deuda de|deuda con|préstamo de|prestamo de|préstamo con|prestamo con|debo)/gi, '')
    .replace(/(?:en cuotas de|cuotas de|cada cuota|por mes|mensual|la cuota de|cuota de)/gi, '')
    .replace(/(?:ya pagué|vengo pagando|llevo pagando|pagué|pagadas?)\s*\d{1,2}\s*(?:cuotas?)?/gi, '')
    .replace(/\b\d{1,2}\s*(?:de|\/)\s*\d{1,2}\s*(?:cuotas)?\b/gi, '')
    .replace(/\b(?:en\s+)?\d{1,2}\s*(?:cuotas|veces|pagos)\b/gi, '')
    .replace(/\b\d{1,2}\s*%\b/gi, '')
    .replace(/(?:quiero destinar|tengo pensado destinar|voy a destinar|destino|del ingreso|de lo que gano)/gi, '')
    .replace(/\b(?:pesos|mangos|ars|lucas|palos|k|mil)\b/gi, '')
    .trim();

  if (amount > 0) {
    const amountStr = amount.toString();
    clean = clean.replace(new RegExp(`\\$?\\s*${amountStr}`, 'g'), '');
    const formattedWithDot = amount.toLocaleString('es-AR');
    clean = clean.replace(new RegExp(`\\$?\\s*${formattedWithDot.replace(/\./g, '\\.')}`, 'g'), '');
  }

  clean = clean.replace(/\b\d+(?:[.,]\d+)?\b/g, '');
  clean = clean.replace(/\s+/g, ' ').replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();

  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Financiación en Cuotas';
}


/**
 * Motor de procesamiento y ejecución semántica del Agente GASTONAPP
 * Soporta CRUD completo (Create, Read, Update, Delete) + Aprendizaje de Errores + Respuestas Elocuentes
 */
export async function processAgentInstruction(
  userPrompt: string,
  ctx: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const prompt = userPrompt.trim();
  const lower = prompt.toLowerCase();
  const totals = calculateFinancialTotals(ctx.expenses, ctx.savings, ctx.config, ctx.incomes);
  const currency = ctx.config.currency || '$';
  const userName = ctx.googleUser?.name ? ctx.googleUser.name.split(' ')[0] : 'Campeón';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - now.getDate());

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  // ---------------------------------------------------------------------------
  // 1. DELETE / DESHACER (Eliminar último registro o gasto/ingreso específico)
  // ---------------------------------------------------------------------------
  const isDeleteIntent =
    lower.includes('borr') ||
    lower.includes('elimin') ||
    lower.includes('deshac') ||
    lower.includes('deshaz') ||
    lower.includes('quitar') ||
    lower.includes('sacar');

  if (isDeleteIntent) {
    const lastAction = getLastAgentAction();

    // Caso A: Deshacer o borrar el último registro ejecutado por el agente
    if (lower.includes('ultimo') || lower.includes('último') || lower.includes('recien') || lower.includes('recién') || lower.includes('deshacer') || lower.includes('deshacé')) {
      if (lastAction) {
        if (lastAction.type === 'expense') {
          await ctx.deleteExpense(lastAction.entityId);
          popLastAgentAction();

          // Si el usuario indicó error, aprender
          if (lower.includes('error') || lower.includes('equivoc') || lower.includes('mal')) {
            extractLearningFromCorrection(prompt, lastAction);
          }

          const newTotals = calculateFinancialTotals(
            ctx.expenses.filter((e) => e.id !== lastAction.entityId),
            ctx.savings,
            ctx.config,
            ctx.incomes
          );

          return {
            reply: `Listo, ${userName}: eliminé el gasto de "${lastAction.description}" por ${formatMoney(
              lastAction.amount,
              currency
            )}. Tu saldo libre disponible se reajustó a ${formatMoney(newTotals.freeCashFlow, currency)}.`,
            actionExecuted: {
              type: 'DELETE_EXPENSE',
              summary: `Gasto eliminado: ${lastAction.description} (${formatMoney(lastAction.amount, currency)})`,
              entityId: lastAction.entityId,
            },
          };
        }

        if (lastAction.type === 'income' && ctx.deleteIncome) {
          await ctx.deleteIncome(lastAction.entityId);
          popLastAgentAction();

          return {
            reply: `Hecho, ${userName}: eliminé el ingreso de "${lastAction.description}" por ${formatMoney(
              lastAction.amount,
              currency
            )}. Tu saldo libre se recalculó en ${formatMoney(
              Math.max(0, totals.freeCashFlow - lastAction.amount),
              currency
            )}.`,
            actionExecuted: {
              type: 'DELETE_INCOME',
              summary: `Ingreso eliminado: ${lastAction.description} (${formatMoney(lastAction.amount, currency)})`,
              entityId: lastAction.entityId,
            },
          };
        }
      }

      // Si no hay lastAction pero hay gastos registrados, borrar el más reciente en la lista
      if (ctx.expenses.length > 0) {
        const latestExp = ctx.expenses[0];
        await ctx.deleteExpense(latestExp.id);
        const newFree = totals.freeCashFlow + Number(latestExp.amount);

        return {
          reply: `Eliminé el último gasto registrado: "${latestExp.description}" por ${formatMoney(
            latestExp.amount,
            currency
          )}. Tu saldo disponible asciende ahora a ${formatMoney(newFree, currency)}.`,
          actionExecuted: {
            type: 'DELETE_EXPENSE',
            summary: `Último gasto eliminado: ${latestExp.description}`,
            entityId: latestExp.id,
          },
        };
      }

      return {
        reply: `No encontré ningún registro reciente para eliminar, ${userName}. Tu balance permanece sin cambios.`,
      };
    }

    // Caso B: Borrar por monto o coincidencia de concepto
    const deleteAmount = extractAmount(prompt);
    if (deleteAmount > 0) {
      const matchExp = ctx.expenses.find((e) => Number(e.amount) === deleteAmount);
      if (matchExp) {
        await ctx.deleteExpense(matchExp.id);
        const newFree = totals.freeCashFlow + Number(matchExp.amount);
        return {
          reply: `Eliminé el gasto de "${matchExp.description}" por ${formatMoney(
            matchExp.amount,
            currency
          )}. Tu saldo libre actual es de ${formatMoney(newFree, currency)}.`,
          actionExecuted: {
            type: 'DELETE_EXPENSE',
            summary: `Gasto eliminado por monto: ${matchExp.description}`,
            entityId: matchExp.id,
          },
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. UPDATE / CORRECCIÓN (Modificar montos, categorías o rectificar errores)
  // ---------------------------------------------------------------------------
  const isUpdateOrCorrectionIntent =
    lower.includes('equivoc') ||
    lower.includes('cambi') ||
    lower.includes('modific') ||
    lower.includes('actualiz') ||
    lower.includes('no era') ||
    lower.includes('correg') ||
    lower.includes('en realidad era') ||
    lower.includes('pasalo a');

  if (isUpdateOrCorrectionIntent) {
    const lastAction = getLastAgentAction();
    const newAmount = extractAmount(prompt);

    // Aprender la regla si el usuario corrigió categoría o asociación
    const learned = extractLearningFromCorrection(prompt, lastAction);

    // Si tenemos una acción previa reciente para modificar
    if (lastAction && lastAction.type === 'expense' && ctx.updateExpense) {
      const targetExpense = ctx.expenses.find((e) => e.id === lastAction.entityId) || ctx.expenses[0];
      if (targetExpense) {
        const updatedFields: Partial<Expense> = {};

        if (newAmount > 0 && newAmount !== targetExpense.amount) {
          updatedFields.amount = newAmount;
        }

        if (learned && learned.target) {
          updatedFields.category = learned.target as ExpenseCategory;
        } else {
          // Evaluar si mencionó alguna categoría conocida
          const newCat = inferExpenseCategory(prompt, targetExpense.category as ExpenseCategory);
          if (newCat !== targetExpense.category && newCat !== 'Otros Gastos') {
            updatedFields.category = newCat;
          }
        }

        if (Object.keys(updatedFields).length > 0) {
          await ctx.updateExpense(targetExpense.id, updatedFields);

          const finalCat = updatedFields.category || targetExpense.category;
          const finalAmt = updatedFields.amount ?? targetExpense.amount;
          const learnedMsg = learned
            ? ` Además, aprendí la regla: "${learned.pattern}" se clasificará siempre en "${learned.target}".`
            : '';

          return {
            reply: `Corregido con precisión, ${userName}. Actualicé el gasto "${targetExpense.description}" a ${formatMoney(
              finalAmt,
              currency
            )} en la categoría ${finalCat}.${learnedMsg}`,
            actionExecuted: {
              type: 'UPDATE_EXPENSE',
              summary: `Gasto actualizado: ${targetExpense.description} (${formatMoney(finalAmt, currency)})`,
              entityId: targetExpense.id,
              data: updatedFields,
            },
            learnedRule: learned?.target,
          };
        }
      }
    }

    if (learned) {
      return {
        reply: `Entendido y memorizado, ${userName}: registré la regla en mi memoria. A partir de ahora, cuando menciones "${learned.pattern}" lo clasificaré en "${learned.target}".`,
        actionExecuted: {
          type: 'LEARN_RULE',
          summary: `Regla aprendida: ${learned.pattern} -> ${learned.target}`,
        },
        learnedRule: learned.target,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 3. APRENDIZAJE EXPLÍCITO ("aprendé que...", "recordá que...")
  // ---------------------------------------------------------------------------
  const isExplicitLearnIntent =
    lower.includes('aprend') ||
    lower.includes('record') ||
    lower.includes('acordate') ||
    lower.includes('anotate que') ||
    lower.includes('cada vez que diga') ||
    lower.includes('cuando diga');

  if (isExplicitLearnIntent) {
    const learned = extractLearningFromCorrection(prompt, getLastAgentAction());
    if (learned) {
      return {
        reply: `Lección incorporada, ${userName}. Guardé en memoria permanente que "${learned.pattern}" corresponde a "${learned.target}". No volveré a cometer ese error.`,
        actionExecuted: {
          type: 'LEARN_RULE',
          summary: `Regla aprendida: ${learned.pattern} -> ${learned.target}`,
        },
        learnedRule: learned.target,
      };
    }
  }

  const amountFound = extractAmount(prompt);

  // ---------------------------------------------------------------------------
  // 4. CALCULATE_COMFORT: ANÁLISIS DE CONFORT Y REGLA 50/30/20
  // ---------------------------------------------------------------------------
  const isComfortIntent =
    lower.includes('confort') ||
    lower.includes('50/30/20') ||
    lower.includes('50 30 20') ||
    lower.includes('regla de oro') ||
    (lower.includes('cuanto') && lower.includes('ganar') && (lower.includes('comodo') || lower.includes('cómodo')));

  if (isComfortIntent) {
    const comfort = calculateComfortAnalysis(ctx.expenses, ctx.savings, ctx.config, ctx.incomes);
    const currentLevel = comfort.levels.find((l) => l.isCurrentStatus) || comfort.levels[0];
    const ideal = comfort.goldenRuleRecommendation.idealMonthlyIncome;
    const gap = comfort.goldenRuleRecommendation.gapToGoldenComfort;
    const essentials = comfort.essentialNeeds;
    const monthlyInc = comfort.monthlyIncome;

    const gapStatus =
      gap === 0
        ? `🎉 ¡Felicitaciones! Tu nivel de ingresos cubre plenamente el estándar de Confort Dorado.`
        : `Tu brecha para alcanzar el Confort Dorado es de ${formatMoney(gap, currency)} mensuales.`;

    const reply = `Análisis de Confort Financiero para ${userName}:

• Estado actual: ${currentLevel.name} (${comfort.currentComfortPercent}% del estándar óptimo)
• Gastos esenciales mensuales: ${formatMoney(essentials, currency)}
• Ingreso ideal de Confort Dorado (50/30/20): ${formatMoney(ideal, currency)}
• ${gapStatus}

Distribución recomendada (Regla 50/30/20 sobre tu ingreso de ${formatMoney(monthlyInc, currency)}):
• 50% Necesidades esenciales: ${formatMoney(monthlyInc * 0.5, currency)} (consumís ${formatMoney(essentials, currency)})
• 30% Estilo de vida y confort: ${formatMoney(monthlyInc * 0.3, currency)}
• 20% Ahorro e inversión futura: ${formatMoney(monthlyInc * 0.2, currency)}`;

    return {
      reply,
      actionExecuted: {
        type: 'CALCULATE_COMFORT',
        summary: `Confort: ${currentLevel.name} (${comfort.currentComfortPercent}%)`,
        data: comfort,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 5. CALCULATE_DAILY_TARGET: PLANIFICADOR DE META DIARIA DE INGRESOS
  // ---------------------------------------------------------------------------
  const isDailyTargetIntent =
    ((lower.includes('cuanto') || lower.includes('cuánto')) &&
      (lower.includes('deberia') || lower.includes('debería') || lower.includes('tengo que') || lower.includes('hay que')) &&
      (lower.includes('dia') || lower.includes('día')) &&
      (lower.includes('ganar') || lower.includes('facturar') || lower.includes('vender') || lower.includes('llegar') || lower.includes('meta'))) ||
    lower.includes('meta diaria') ||
    lower.includes('cuanto ganar por dia') ||
    lower.includes('cuánto ganar por día') ||
    (lower.includes('diario') && lower.includes('para llegar a la meta'));

  if (isDailyTargetIntent) {
    const monthIncomes = ctx.incomes.filter((i) => (i.date || '').startsWith(currentMonthPrefix));
    const earnedThisMonth = monthIncomes.reduce((s, i) => s + Number(i.amount || 0), 0);

    const comfort = calculateComfortAnalysis(ctx.expenses, ctx.savings, ctx.config, ctx.incomes);
    const comfortTarget = comfort.goldenRuleRecommendation.idealMonthlyIncome;

    const targetMonthly =
      amountFound > 0
        ? amountFound
        : comfortTarget > 0
        ? comfortTarget
        : ctx.config.monthlyIncome > 0
        ? ctx.config.monthlyIncome
        : Math.max(1000000, Math.round(totals.effectiveMonthlyIncome * 1.2));

    const remainingToGoal = Math.max(0, targetMonthly - earnedThisMonth);
    const dailyTarget = Math.ceil(remainingToGoal / daysRemainingInMonth);

    const statusMsg =
      remainingToGoal === 0
        ? `🎉 ¡Objetivo mensual alcanzado anticipadamente! Todo ingreso adicional pasa a multiplicar tus ahorros e inversiones.`
        : `Para alcanzar tu meta mensual, necesitás promediar ${formatMoney(dailyTarget, currency)}/día durante los ${daysRemainingInMonth} días restantes del mes.`;

    const reply = `Plan de Meta Diaria Automatizada, ${userName}:

🎯 Meta mensual objetivo: ${formatMoney(targetMonthly, currency)}
• Ya ingresado este mes: ${formatMoney(earnedThisMonth, currency)}
• Restante por generar: ${formatMoney(remainingToGoal, currency)}
• Días restantes del mes: ${daysRemainingInMonth} días

👉 Ritmo diario requerido: ${formatMoney(dailyTarget, currency)}/día
${statusMsg}`;

    return {
      reply,
      actionExecuted: {
        type: 'CALCULATE_DAILY_TARGET',
        summary: `Meta diaria: ${formatMoney(dailyTarget, currency)}/día (Objetivo: ${formatMoney(targetMonthly, currency)})`,
        data: { targetMonthly, earnedThisMonth, remainingToGoal, dailyTarget, daysRemainingInMonth },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 6. ANALYZE_WEEKLY_SALES: VENTAS E INGRESOS SEMANALES POR CATEGORÍA
  // ---------------------------------------------------------------------------
  const isWeeklySalesIntent =
    ((lower.includes('vendi') || lower.includes('vendí') || lower.includes('vendiendo') || lower.includes('venta') || lower.includes('ventas')) &&
      (lower.includes('semana') || lower.includes('semanal') || lower.includes('ultimos 7') || lower.includes('últimos 7'))) ||
    ((lower.includes('categoria') || lower.includes('categoría')) &&
      (lower.includes('ingres') || lower.includes('venta') || lower.includes('vendi') || lower.includes('semana'))) ||
    lower.includes('segun la categoria') ||
    lower.includes('según la categoría') ||
    lower.includes('ventas por categoria') ||
    lower.includes('ventas por categoría');

  if (isWeeklySalesIntent) {
    const weeklyIncomes = ctx.incomes.filter((i) => (i.date || '') >= sevenDaysAgoStr);
    const totalWeekly = weeklyIncomes.reduce((s, i) => s + Number(i.amount || 0), 0);
    const dailyAverage = Math.round(totalWeekly / 7);

    if (weeklyIncomes.length === 0) {
      return {
        reply: `En los últimos 7 días no tenés ventas ni ingresos registrados, ${userName}. Si concretaste cobros recientes, decime "Cobré [monto] de [concepto]" y los asiento al instante.`,
        actionExecuted: {
          type: 'ANALYZE_WEEKLY_SALES',
          summary: 'Ventas de la semana: $ 0 (Sin registros)',
        },
      };
    }

    const byCategory: Record<string, { total: number; count: number }> = {};
    for (const inc of weeklyIncomes) {
      const cat = inc.category || 'Otros Ingresos';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += Number(inc.amount || 0);
      byCategory[cat].count += 1;
    }

    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
    const breakdownLines = sortedCats
      .map(([cat, data]) => {
        const pct = totalWeekly > 0 ? Math.round((data.total / totalWeekly) * 100) : 0;
        return `• ${cat}: ${formatMoney(data.total, currency)} (${pct}%, ${data.count} operación${data.count === 1 ? '' : 'es'})`;
      })
      .join('\n');

    const topCategory = sortedCats[0];
    const topPct = totalWeekly > 0 ? Math.round((topCategory[1].total / totalWeekly) * 100) : 0;

    const reply = `Análisis de ventas e ingresos semanales, ${userName}:

📊 Total últimos 7 días: ${formatMoney(totalWeekly, currency)} (Promedio: ${formatMoney(dailyAverage, currency)}/día)

Rendimiento por categoría:
${breakdownLines}

🔥 Categoría líder: "${topCategory[0]}" concentró el ${topPct}% de tus ingresos en la semana.`;

    return {
      reply,
      actionExecuted: {
        type: 'ANALYZE_WEEKLY_SALES',
        summary: `Ventas de la semana: ${formatMoney(totalWeekly, currency)} (${sortedCats.length} categorías)`,
        data: { totalWeekly, dailyAverage, byCategory },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 7. TEMPORAL FLOW QUERIES: ¿CUÁNTO INGRESÓ? ¿CUÁNTO SE GASTÓ? (HOY / SEMANA / MES)
  // ---------------------------------------------------------------------------
  const isTemporalFlowIntent =
    (lower.includes('cuanto') || lower.includes('cuánto')) &&
    (lower.includes('ingres') || lower.includes('entr') || lower.includes('gast') || lower.includes('sal')) &&
    (lower.includes('hoy') ||
      lower.includes('semana') ||
      lower.includes('mes') ||
      lower.includes('este mes') ||
      lower.includes('esta semana') ||
      lower.includes('en el mes') ||
      lower.includes('en la semana')) &&
    !lower.includes('puedo') &&
    !lower.includes('deberia') &&
    !lower.includes('debería');

  if (isTemporalFlowIntent) {
    const isToday = lower.includes('hoy');
    const isWeek = lower.includes('semana');
    const periodLabel = isToday ? 'hoy' : isWeek ? 'esta semana (últimos 7 días)' : 'este mes';

    const periodIncomes = ctx.incomes.filter((i) => {
      const d = i.date || '';
      if (isToday) return d === todayStr;
      if (isWeek) return d >= sevenDaysAgoStr;
      return d.startsWith(currentMonthPrefix);
    });

    const periodExpenses = ctx.expenses.filter((e) => {
      const d = e.date || '';
      if (isToday) return d === todayStr;
      if (isWeek) return d >= sevenDaysAgoStr;
      return d.startsWith(currentMonthPrefix);
    });

    const totalPeriodIncome = periodIncomes.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalPeriodExpense = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netPeriodBalance = totalPeriodIncome - totalPeriodExpense;

    const asksOnlyIncome =
      (lower.includes('ingres') || lower.includes('entr')) &&
      !lower.includes('gast') &&
      !lower.includes('sal');

    const asksOnlyExpense =
      (lower.includes('gast') || lower.includes('sal')) &&
      !lower.includes('ingres') &&
      !lower.includes('entr');

    let reply = '';
    if (asksOnlyIncome) {
      reply = `Resumen de ingresos para ${periodLabel}, ${userName}:
• Total ingresado: ${formatMoney(totalPeriodIncome, currency)} (${periodIncomes.length} movimiento${periodIncomes.length === 1 ? '' : 's'}).
• Contra gastos de: ${formatMoney(totalPeriodExpense, currency)}.
• Balance neto del período: ${netPeriodBalance >= 0 ? '+' : ''}${formatMoney(netPeriodBalance, currency)}.`;
    } else if (asksOnlyExpense) {
      reply = `Resumen de gastos para ${periodLabel}, ${userName}:
• Total gastado: ${formatMoney(totalPeriodExpense, currency)} (${periodExpenses.length} registro${periodExpenses.length === 1 ? '' : 's'}).
• Ingresos registrados: ${formatMoney(totalPeriodIncome, currency)}.
• Balance neto del período: ${netPeriodBalance >= 0 ? '+' : ''}${formatMoney(netPeriodBalance, currency)}.`;
    } else {
      reply = `Flujo de caja para ${periodLabel}, ${userName}:
• 🟢 Ingresos: ${formatMoney(totalPeriodIncome, currency)} (${periodIncomes.length} movimientos)
• 🔴 Gastos: ${formatMoney(totalPeriodExpense, currency)} (${periodExpenses.length} movimientos)
• ⚖️ Balance neto: ${netPeriodBalance >= 0 ? '+' : ''}${formatMoney(netPeriodBalance, currency)}.`;
    }

    return {
      reply,
      actionExecuted: {
        type: 'QUERY',
        summary: `Flujo ${periodLabel}: In +${formatMoney(totalPeriodIncome, currency)} / Out -${formatMoney(totalPeriodExpense, currency)}`,
        data: { totalPeriodIncome, totalPeriodExpense, netPeriodBalance },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 8. SAVINGS & EMERGENCY FUND: REGISTRO DE METAS, AHORROS Y FONDO DE EMERGENCIA
  // ---------------------------------------------------------------------------
  // 8A. Configuración o creación de Fondo de Emergencia
  const isEmergencyFundSetup =
    (lower.includes('emergencia') || lower.includes('reserva') || lower.includes('blindaje')) &&
    (lower.includes('crear') || lower.includes('armar') || lower.includes('poner') || lower.includes('configur') || lower.includes('definir') || lower.includes('nueva meta') || lower.includes('meta de'));

  if (isEmergencyFundSetup) {
    const targetAmt = amountFound > 0 ? amountFound : Math.max(500000, totals.currentMonthFixedExpenses * 3);
    if (ctx.updateConfig) {
      await ctx.updateConfig({ emergencyFundMinimum: targetAmt });
    }

    const existingEf = ctx.savings.find((s) => s.isEmergencyFund);
    if (existingEf) {
      return {
        reply: `Fondo de Emergencia actualizado, ${userName}: configuré el objetivo en ${formatMoney(
          targetAmt,
          currency
        )}. Tu saldo actual acumulado en este fondo es de ${formatMoney(existingEf.currentAmount, currency)}.`,
        actionExecuted: {
          type: 'UPDATE_EMERGENCY_FUND',
          summary: `Fondo de Emergencia fijado en ${formatMoney(targetAmt, currency)}`,
          entityId: existingEf.id,
          data: { targetAmount: targetAmt },
        },
      };
    } else {
      await ctx.addSavingsGoal({
        name: 'Fondo de Emergencia',
        isEmergencyFund: true,
        targetAmount: targetAmt,
        currentAmount: 0,
        notes: 'Fondo intocable para imprevistos y blindaje financiero',
      });

      return {
        reply: `Fondo de Emergencia creado y blindado, ${userName}: establecí la meta en ${formatMoney(
          targetAmt,
          currency
        )}. Podés destinarle dinero diciéndome por ejemplo "Ahorré 50k para el fondo de emergencia".`,
        actionExecuted: {
          type: 'UPDATE_EMERGENCY_FUND',
          summary: `Fondo de Emergencia creado: ${formatMoney(targetAmt, currency)}`,
        },
      };
    }
  }

  // 8B. Asignación de aporte de ahorro a meta o fondo de emergencia
  const isSavingsAllocation =
    amountFound > 0 &&
    (lower.includes('ahorr') || lower.includes('sum') || lower.includes('apart') || lower.includes('destin') || lower.includes('mand') || lower.includes('guard')) &&
    (lower.includes('para') || lower.includes('a la meta') || lower.includes('al fondo') || lower.includes('en el fondo') || lower.includes('al ahorro') || lower.includes('emergencia'));

  if (isSavingsAllocation) {
    const isForEmergency = lower.includes('emergencia') || lower.includes('reserva');
    let targetGoal = isForEmergency
      ? ctx.savings.find((s) => s.isEmergencyFund)
      : ctx.savings.find(
          (s) =>
            !s.isEmergencyFund &&
            (lower.includes(s.name.toLowerCase()) ||
              s.name
                .toLowerCase()
                .split(' ')
                .some((word) => word.length >= 3 && lower.includes(word)))
        );

    if (!targetGoal && !isForEmergency && ctx.savings.length > 0) {
      const nonEfGoals = ctx.savings.filter((s) => !s.isEmergencyFund);
      if (nonEfGoals.length === 1) {
        targetGoal = nonEfGoals[0];
      }
    }

    if (targetGoal && ctx.updateSavingsAmount) {
      const newAmount = Number(targetGoal.currentAmount || 0) + amountFound;
      await ctx.updateSavingsAmount(targetGoal.id, newAmount);

      const targetAmt = targetGoal.targetAmount || 1;
      const pct = Math.min(100, Math.round((newAmount / targetAmt) * 100));
      const remaining = Math.max(0, targetAmt - newAmount);

      const successNote =
        remaining === 0
          ? `🎉 ¡Felicitaciones! Llegaste al 100% de esta meta.`
          : `Te restan ${formatMoney(remaining, currency)} para completarla.`;

      return {
        reply: `Aporte de ahorro registrado, ${userName}: asigné ${formatMoney(
          amountFound,
          currency
        )} a "${targetGoal.name}". Llevás acumulado ${formatMoney(
          newAmount,
          currency
        )} de ${formatMoney(targetGoal.targetAmount, currency)} (${pct}% completado). ${successNote}`,
        actionExecuted: {
          type: 'ALLOCATE_SAVINGS',
          summary: `Aporte a meta: ${targetGoal.name} (+${formatMoney(amountFound, currency)})`,
          entityId: targetGoal.id,
          data: { newAmount, targetGoal },
        },
      };
    } else {
      const goalName = cleanGoalName(prompt, amountFound);
      const initialTarget = amountFound * 5;
      await ctx.addSavingsGoal({
        name: goalName,
        isEmergencyFund: isForEmergency,
        targetAmount: initialTarget,
        currentAmount: amountFound,
        notes: 'Creada a partir de asignación de ahorro',
      });

      return {
        reply: `Meta creada y fondeada, ${userName}: definí "${goalName}" con meta tentativa de ${formatMoney(
          initialTarget,
          currency
        )} y le asigné tus primeros ${formatMoney(amountFound, currency)} ahorrados.`,
        actionExecuted: {
          type: 'CREATE_GOAL',
          summary: `Meta creada con ahorro: ${goalName} (${formatMoney(amountFound, currency)})`,
        },
      };
    }
  }

  // 8C. Crear meta de ahorro general
  const isGoalCreation =
    (lower.includes('meta') || lower.includes('ahorro')) &&
    (lower.includes('crear') || lower.includes('armar') || lower.includes('nueva meta') || lower.includes('definir'));

  if (isGoalCreation) {
    const targetAmt = amountFound > 0 ? amountFound : 100000;
    const goalName = cleanGoalName(prompt, targetAmt);

    await ctx.addSavingsGoal({
      name: goalName,
      isEmergencyFund: false,
      targetAmount: targetAmt,
      currentAmount: 0,
      notes: 'Creada por Agente GASTONAPP',
    });

    recordAgentAction({
      type: 'savings_goal',
      entityId: 'goal_' + Date.now(),
      description: goalName,
      amount: targetAmt,
      date: todayStr,
      rawPrompt: prompt,
    });

    return {
      reply: `Meta creada con éxito, ${userName}: definí "${goalName}" con objetivo de ${formatMoney(
        targetAmt,
        currency
      )}. Ya podés asignarle fondos diciéndome "Ahorré [monto] para ${goalName}".`,
      actionExecuted: {
        type: 'CREATE_GOAL',
        summary: `Meta de ahorro creada: ${goalName} (${formatMoney(targetAmt, currency)})`,
        data: { name: goalName, targetAmount: targetAmt },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 8D. PROGRAMADOS: EJECUCIÓN (Debitar ahora / Marcar pagado / Cobrar)
  // ---------------------------------------------------------------------------
  const isExecuteScheduledIntent =
    (lower.includes('debit') ||
      lower.includes('pagar') ||
      lower.includes('marcar pagad') ||
      lower.includes('ejecut') ||
      lower.includes('asentar débito') ||
      lower.includes('asentar debito')) &&
    !lower.includes('program') &&
    !lower.includes('agend') &&
    !lower.includes('que') &&
    !lower.includes('qué') &&
    !lower.includes('cuanto') &&
    !lower.includes('cuánto');

  if (isExecuteScheduledIntent) {
    if (ctx.scheduledExpenses && ctx.scheduledExpenses.length > 0) {
      const pendingExp = ctx.scheduledExpenses.filter((s) => s.status === 'pendiente');
      const matchedExp = pendingExp.find((s) => {
        const descLower = s.description.toLowerCase();
        return lower.includes(descLower) || descLower.split(' ').some((w) => w.length >= 4 && lower.includes(w));
      });

      if (matchedExp && ctx.executeScheduledExpense) {
        await ctx.executeScheduledExpense(matchedExp.id);
        return {
          reply: `¡Débito procesado y asentado, ${userName}! Asenté el pago de "${matchedExp.description}" por ${formatMoney(
            matchedExp.amount,
            currency
          )} como gasto en la aplicación. Si es recurrente, ya calculé automáticamente su próximo vencimiento.`,
          actionExecuted: {
            type: 'EXECUTE_SCHEDULED',
            summary: `Débito ejecutado: ${matchedExp.description} (${formatMoney(matchedExp.amount, currency)})`,
            entityId: matchedExp.id,
            data: matchedExp,
          },
        };
      }
    }

    if (ctx.scheduledIncomes && ctx.scheduledIncomes.length > 0) {
      const pendingInc = ctx.scheduledIncomes.filter((s) => s.status === 'pendiente');
      const matchedInc = pendingInc.find((s) => {
        const descLower = s.description.toLowerCase();
        return lower.includes(descLower) || descLower.split(' ').some((w) => w.length >= 4 && lower.includes(w));
      });

      if (matchedInc && ctx.executeScheduledIncome) {
        await ctx.executeScheduledIncome(matchedInc.id);
        return {
          reply: `¡Cobro asentado con éxito, ${userName}! Registré el ingreso de "${matchedInc.description}" por ${formatMoney(
            matchedInc.amount,
            currency
          )}. Tu saldo disponible aumentó y calculé su próxima fecha programada.`,
          actionExecuted: {
            type: 'EXECUTE_SCHEDULED',
            summary: `Cobro programado ejecutado: ${matchedInc.description} (${formatMoney(matchedInc.amount, currency)})`,
            entityId: matchedInc.id,
            data: matchedInc,
          },
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8E. PROGRAMADOS: CONSULTAS ("¿Qué se me debita esta semana?", etc.)
  // ---------------------------------------------------------------------------
  const isScheduledQueryIntent =
    (lower.includes('debita') ||
      lower.includes('debitan') ||
      lower.includes('debito') ||
      lower.includes('débito') ||
      lower.includes('programad') ||
      lower.includes('vence') ||
      lower.includes('vencimiento')) &&
    (lower.includes('que') ||
      lower.includes('qué') ||
      lower.includes('cuanto') ||
      lower.includes('cuánto') ||
      lower.includes('cuando') ||
      lower.includes('cuándo') ||
      lower.includes('cuales') ||
      lower.includes('cuáles') ||
      lower.includes('esta semana') ||
      lower.includes('este mes') ||
      lower.includes('hoy') ||
      lower.includes('proxim') ||
      lower.includes('próxim')) &&
    !lower.includes('program') &&
    !lower.includes('agend');

  if (isScheduledQueryIntent && ctx.scheduledExpenses) {
    const pendingExpenses = ctx.scheduledExpenses.filter((s) => s.status === 'pendiente');
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const upcoming7Days = pendingExpenses.filter((s) => s.dueDate >= todayStr && s.dueDate <= in7Days);
    const total7Days = upcoming7Days.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const totalMonth = pendingExpenses
      .filter((s) => s.dueDate.startsWith(currentMonthPrefix))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    if (pendingExpenses.length === 0) {
      return {
        reply: `No tenés débitos ni gastos programados pendientes por el momento, ${userName}. La pizarra de débitos está limpia.`,
        actionExecuted: {
          type: 'QUERY',
          summary: 'Consulta de débitos programados: 0 pendientes',
        },
      };
    }

    let detailLines = '';
    if (upcoming7Days.length > 0) {
      detailLines = upcoming7Days
        .map((s) => {
          const isToday = s.dueDate === todayStr;
          const badge = isToday ? '⚠️ ¡HOY!' : `📅 ${s.dueDate}`;
          const typeBadge = s.autoDebit ? '[Débito Automático]' : '[Manual]';
          return `• ${badge} - ${s.description}: ${formatMoney(s.amount, currency)} ${typeBadge} (${s.recurrence})`;
        })
        .join('\n');
    } else {
      detailLines = `• No tenés débitos programados en los próximos 7 días. El próximo más cercano es "${pendingExpenses[0].description}" el ${pendingExpenses[0].dueDate} (${formatMoney(pendingExpenses[0].amount, currency)}).`;
    }

    const reply = `Resumen de débitos y pagos programados, ${userName}:

💳 Próximos 7 días: ${formatMoney(total7Days, currency)} (${upcoming7Days.length} vencimiento${upcoming7Days.length === 1 ? '' : 's'})
🗓️ Total proyectado en el mes: ${formatMoney(totalMonth, currency)} (${pendingExpenses.length} débito${pendingExpenses.length === 1 ? '' : 's'} activos)

Vencimientos:
${detailLines}

💡 Te avisaré automáticamente antes de cada débito en la barra superior y notificaciones del navegador/Telegram.`;

    return {
      reply,
      actionExecuted: {
        type: 'QUERY',
        summary: `Consulta de débitos: ${formatMoney(total7Days, currency)} en 7 días`,
        data: { upcoming7Days, total7Days, totalMonth },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 8F. PROGRAMADOS: CREACIÓN (Programar o agendar débito o cobro)
  // ---------------------------------------------------------------------------
  const isScheduleExpenseIntent =
    (lower.includes('program') || lower.includes('agend')) &&
    (lower.includes('debit') ||
      lower.includes('gasto') ||
      lower.includes('pago') ||
      lower.includes('cuota') ||
      lower.includes('servicio') ||
      lower.includes('factura') ||
      lower.includes('alquiler') ||
      lower.includes('seguro') ||
      lower.includes('tarjeta')) &&
    !lower.includes('ingreso') &&
    !lower.includes('cobr');

  if (isScheduleExpenseIntent && amountFound > 0 && ctx.addScheduledExpense) {
    const desc = cleanScheduledDescription(prompt, amountFound) || 'Débito programado';
    const category = inferExpenseCategory(desc);
    const dateInfo = extractDueDate(prompt);
    const recurrence = extractRecurrence(prompt);
    const autoDebit = lower.includes('auto') || lower.includes('debito') || lower.includes('débito');

    await ctx.addScheduledExpense({
      description: desc,
      amount: amountFound,
      category,
      type: 'fijo',
      recurrence,
      dueDate: dateInfo.dueDate,
      dayOfMonth: dateInfo.dayOfMonth,
      autoDebit,
      paymentMethod: autoDebit ? 'Débito Automático' : 'Tarjeta / Transferencia',
      notifyDaysBefore: 2,
      status: 'pendiente',
      notes: 'Programado por Agente GASTONAPP',
    });

    return {
      reply: `Débito programado con éxito, ${userName}: agendé "${desc}" por ${formatMoney(
        amountFound,
        currency
      )} con vencimiento el ${dateInfo.dueDate} (${recurrence}, ${
        autoDebit ? 'Débito automático' : 'Pago manual'
      }). Te avisaré 2 días antes de que se debite.`,
      actionExecuted: {
        type: 'SCHEDULE_EXPENSE',
        summary: `Débito programado: ${desc} por ${formatMoney(amountFound, currency)} el ${dateInfo.dueDate}`,
        data: { description: desc, amount: amountFound, dueDate: dateInfo.dueDate, recurrence, autoDebit },
      },
    };
  }

  const isScheduleIncomeIntent =
    (lower.includes('program') || lower.includes('agend')) &&
    (lower.includes('ingreso') ||
      lower.includes('cobr') ||
      lower.includes('sueldo') ||
      lower.includes('honorario') ||
      lower.includes('cliente'));

  if (isScheduleIncomeIntent && amountFound > 0 && ctx.addScheduledIncome) {
    const desc = cleanScheduledDescription(prompt, amountFound) || 'Cobro programado';
    const category = inferIncomeCategory(desc);
    const dateInfo = extractDueDate(prompt);
    const recurrence = extractRecurrence(prompt);

    await ctx.addScheduledIncome({
      description: desc,
      amount: amountFound,
      category,
      recurrence,
      expectedDate: dateInfo.dueDate,
      dayOfMonth: dateInfo.dayOfMonth,
      paymentMethod: 'Transferencia bancaria',
      notifyDaysBefore: 1,
      status: 'pendiente',
      notes: 'Programado por Agente GASTONAPP',
    });

    return {
      reply: `Cobro programado con éxito, ${userName}: agendé el ingreso de "${desc}" por ${formatMoney(
        amountFound,
        currency
      )} esperado para el ${dateInfo.dueDate} (${recurrence}). Lo verás reflejado en tu calendario financiero.`,
      actionExecuted: {
        type: 'SCHEDULE_INCOME',
        summary: `Cobro programado: ${desc} por ${formatMoney(amountFound, currency)} el ${dateInfo.dueDate}`,
        data: { description: desc, amount: amountFound, expectedDate: dateInfo.dueDate, recurrence },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 8G. DEUDAS: PAGO O COBRO DE CUOTAS ("Pagué la cuota 5 de la tarjeta", "Cobré cuota")
  // ---------------------------------------------------------------------------
  const isPayInstallmentIntent =
    (lower.includes('pagu') ||
      lower.includes('pagar') ||
      lower.includes('asent') ||
      lower.includes('abon') ||
      lower.includes('liquid')) &&
    (lower.includes('cuota') || lower.includes('deuda'));

  if (isPayInstallmentIntent && ctx.debts && ctx.debts.length > 0) {
    const activeDebts = ctx.debts.filter((d) => d.type === 'a_pagar' && d.status === 'activa');
    const matchedDebt =
      activeDebts.find(
        (d) =>
          lower.includes(d.name.toLowerCase()) ||
          d.name
            .toLowerCase()
            .split(' ')
            .some((w) => w.length >= 4 && lower.includes(w))
      ) || (activeDebts.length === 1 ? activeDebts[0] : undefined);

    if (matchedDebt && ctx.payDebtInstallment) {
      await ctx.payDebtInstallment(matchedDebt.id);
      const nextPaid = matchedDebt.paidInstallments + 1;
      const remaining = Math.max(0, matchedDebt.totalInstallments - nextPaid);
      const remainingAmt = remaining * matchedDebt.installmentAmount;
      const pct = Math.min(100, Math.round((nextPaid / matchedDebt.totalInstallments) * 100));

      const finishMsg =
        remaining === 0
          ? `🎉 ¡FELICITACIONES! Liquidaste la deuda "${matchedDebt.name}" en su totalidad. ¡Una carga financiera menos!`
          : `Te restan ${remaining} cuota${remaining === 1 ? '' : 's'} (${formatMoney(remainingAmt, currency)} pendientes).`;

      return {
        reply: `¡Pago de cuota registrado impecablemente, ${userName}! Asenté el pago de la cuota ${nextPaid} de ${matchedDebt.totalInstallments} de "${matchedDebt.name}" por ${formatMoney(
          matchedDebt.installmentAmount,
          currency
        )} como gasto. Progreso: ${pct}% saldado. ${finishMsg}`,
        actionExecuted: {
          type: 'PAY_INSTALLMENT',
          summary: `Cuota ${nextPaid}/${matchedDebt.totalInstallments} pagada: ${matchedDebt.name} (${formatMoney(matchedDebt.installmentAmount, currency)})`,
          entityId: matchedDebt.id,
          data: { debt: matchedDebt, nextPaid, remaining },
        },
      };
    }
  }

  const isCollectInstallmentIntent =
    (lower.includes('cobr') || lower.includes('ingres') || lower.includes('me pagaron')) &&
    (lower.includes('cuota') || lower.includes('deuda'));

  if (isCollectInstallmentIntent && ctx.debts && ctx.debts.length > 0) {
    const activeCollect = ctx.debts.filter((d) => d.type === 'a_cobrar' && d.status === 'activa');
    const matchedDebt =
      activeCollect.find(
        (d) =>
          lower.includes(d.name.toLowerCase()) ||
          d.name
            .toLowerCase()
            .split(' ')
            .some((w) => w.length >= 4 && lower.includes(w))
      ) || (activeCollect.length === 1 ? activeCollect[0] : undefined);

    if (matchedDebt && ctx.collectDebtInstallment) {
      await ctx.collectDebtInstallment(matchedDebt.id);
      const nextPaid = matchedDebt.paidInstallments + 1;
      const remaining = Math.max(0, matchedDebt.totalInstallments - nextPaid);
      return {
        reply: `¡Cobro de cuota asentado con éxito, ${userName}! Registré el cobro de la cuota ${nextPaid} de ${matchedDebt.totalInstallments} de "${matchedDebt.name}" por ${formatMoney(
          matchedDebt.installmentAmount,
          currency
        )}. Tu saldo disponible aumentó y restan ${remaining} cuotas por cobrar.`,
        actionExecuted: {
          type: 'COLLECT_INSTALLMENT',
          summary: `Cobro cuota ${nextPaid}/${matchedDebt.totalInstallments}: ${matchedDebt.name} (${formatMoney(matchedDebt.installmentAmount, currency)})`,
          entityId: matchedDebt.id,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 8H. DEUDAS: PLAN DE LIQUIDACIÓN Y CONSULTAS ("¿Cuánto debo destinar en cuotas?", etc.)
  // ---------------------------------------------------------------------------
  const isDebtQueryIntent =
    (lower.includes('cuanto') ||
      lower.includes('cuánto') ||
      lower.includes('que') ||
      lower.includes('qué') ||
      lower.includes('como') ||
      lower.includes('cómo')) &&
    (lower.includes('destinar') ||
      lower.includes('deuda') ||
      lower.includes('deudas') ||
      lower.includes('cuotas') ||
      lower.includes('terminar de pagar') ||
      lower.includes('liquidar'));

  if (isDebtQueryIntent && ctx.debts) {
    const summary = calculateDebtTotals(
      ctx.debts,
      ctx.config.monthlyIncome,
      ctx.config.debtRepaymentBudget,
      ctx.config.debtRepaymentPercent
    );

    if (summary.activeDebtsToPay.length === 0 && summary.activeDebtsToCollect.length === 0) {
      return {
        reply: `No tenés deudas ni cuotas activas registradas en este momento, ${userName}. Estás 100% libre de deudas. Si tenés alguna tarjeta o préstamo que venís arrastrando, decime "Tengo una deuda de [concepto]" y armamos tu plan de liquidación.`,
        actionExecuted: {
          type: 'CALCULATE_DEBT_PLAN',
          summary: 'Consulta de deudas: 0 activas (100% libre)',
        },
      };
    }

    const payLines = summary.activeDebtsToPay
      .map((d) => {
        const det = getDebtDetails(d);
        return `• ${d.name}: Cuota ${d.paidInstallments}/${d.totalInstallments} (${formatMoney(d.installmentAmount, currency)}/mes) - Restan ${det.remainingInstallments} cuotas (${formatMoney(det.remainingAmount, currency)})`;
      })
      .join('\n');

    const collectLines =
      summary.activeDebtsToCollect.length > 0
        ? `\n\n🟢 Deudas a cobrar a tu favor:\n` +
          summary.activeDebtsToCollect
            .map((d) => {
              const det = getDebtDetails(d);
              return `• ${d.name}: Te deben ${det.remainingInstallments} cuotas de ${formatMoney(d.installmentAmount, currency)} (Total: ${formatMoney(det.remainingAmount, currency)})`;
            })
            .join('\n')
        : '';

    const budgetNote = ctx.config.debtRepaymentPercent
      ? `\n🎯 Presupuesto configurado: ${ctx.config.debtRepaymentPercent}% de tus ingresos (${formatMoney(summary.targetBudget, currency)}/mes).`
      : ctx.config.debtRepaymentBudget
      ? `\n🎯 Presupuesto configurado: ${formatMoney(ctx.config.debtRepaymentBudget, currency)}/mes.`
      : '';

    const reply = `Plan de Compromiso y Liquidación de Deudas, ${userName}:

💳 Compromiso mensual de cuotas: ${formatMoney(summary.monthlyInstallmentsToPay, currency)}/mes (${summary.incomeCommitmentPercent}% de tus ingresos)
👉 Destino diario sugerido: ${formatMoney(summary.dailyCommitmentToPay, currency)}/día para cubrir las cuotas sin sobresaltos
⏳ Saldo total pendiente a pagar: ${formatMoney(summary.totalDebtToPayRemaining, currency)} (estimado libre en ${summary.maxMonthsToPayoff} meses)
📊 Progreso general: ${summary.overallPayProgressPercent}% saldado
${budgetNote}

Desglose de cuotas activas a pagar:
${payLines}${collectLines}`;

    return {
      reply,
      actionExecuted: {
        type: 'CALCULATE_DEBT_PLAN',
        summary: `Deudas: ${formatMoney(summary.monthlyInstallmentsToPay, currency)}/mes (${summary.incomeCommitmentPercent}% ingresos)`,
        data: summary,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 8I. DEUDAS: REGISTRO O ASISTENCIA CONVERSACIONAL ("Tengo una deuda...", "Registrá deuda...")
  // ---------------------------------------------------------------------------
  const isDebtCreationOrAssistanceIntent =
    (lower.includes('deuda') ||
      lower.includes('cuotas') ||
      lower.includes('prestamo') ||
      lower.includes('préstamo')) &&
    (lower.includes('tengo') ||
      lower.includes('arrastr') ||
      lower.includes('registr') ||
      lower.includes('anot') ||
      lower.includes('carg') ||
      lower.includes('agreg') ||
      lower.includes('saqu') ||
      lower.includes('hice') ||
      lower.includes('compr') ||
      lower.includes('deb'));

  if (isDebtCreationOrAssistanceIntent) {
    const installmentsInfo = extractInstallments(prompt);
    const amountVal = extractAmount(prompt);
    const percentFound = extractIncomePercent(prompt);
    const isToCollect =
      lower.includes('a cobrar') ||
      lower.includes('me deben') ||
      lower.includes('le preste') ||
      lower.includes('le presté');

    // CASO 1: Faltan datos esenciales (no indicó cuotas totales o monto)
    // El agente guía al usuario con preguntas clave sobre la deuda que viene arrastrando:
    const hasEnoughData = installmentsInfo.totalInstallments !== undefined && amountVal > 0;

    if (!hasEnoughData) {
      return {
        reply: `¡Vamos a ordenar esa deuda y armar un plan para liquidarla cuanto antes, ${userName}!

Como es una deuda que ya venís arrastrando, contame:
1️⃣ ¿En cuántas cuotas totales la hiciste? (ej: 12 cuotas)
2️⃣ ¿Cuántas cuotas ya venís pagando hasta ahora? (ej: ya pagué 5)
3️⃣ ¿De cuánto es cada cuota (o el saldo total que te queda)?
4️⃣ ¿Qué porcentaje o monto de lo que ganás tenés pensado destinar por mes para sacártela de encima?

Con esos datos calculo exactamente cuánto debés destinar por mes y por día, en cuántos meses quedás libre y cómo impacta en tu saldo.`,
        actionExecuted: {
          type: 'ASK_DEBT_DETAILS',
          summary: 'Consulta guiada de cuotas y destino de ingresos para liquidar deuda',
        },
      };
    }

    // CASO 2: Tiene datos suficientes para registrar la deuda
    const totalInst = installmentsInfo.totalInstallments || 1;
    const paidInst = Math.min(totalInst, installmentsInfo.paidInstallments || 0);
    const isTotalAmountStated = lower.includes('total') || lower.includes('monto total');

    let installmentAmt = amountVal;
    let totalAmt = amountVal * totalInst;

    if (isTotalAmountStated && amountVal >= 10000 && !lower.includes('cada cuota') && !lower.includes('cuotas de')) {
      totalAmt = amountVal;
      installmentAmt = Math.round(totalAmt / totalInst);
    } else if (lower.includes('cada cuota') || lower.includes('cuotas de') || lower.includes('/mes')) {
      installmentAmt = amountVal;
      totalAmt = installmentAmt * totalInst;
    }

    const debtName = cleanDebtName(prompt, amountVal) || 'Financiación en Cuotas';

    // Si especificó porcentaje de destino de ingresos, actualizar configuración
    if (percentFound && ctx.updateConfig) {
      await ctx.updateConfig({ debtRepaymentPercent: percentFound });
    }

    if (ctx.addDebt) {
      await ctx.addDebt({
        name: debtName,
        type: isToCollect ? 'a_cobrar' : 'a_pagar',
        category: lower.includes('tarjeta')
          ? 'Tarjeta de Crédito'
          : lower.includes('auto') || lower.includes('moto')
          ? 'Prendario / Auto'
          : lower.includes('banco')
          ? 'Préstamo Bancario'
          : 'Electrodomésticos / Tecnología',
        totalAmount: totalAmt,
        installmentAmount: installmentAmt,
        totalInstallments: totalInst,
        paidInstallments: paidInst,
        dueDayOfMonth: 10,
        status: paidInst >= totalInst ? 'saldada' : 'activa',
        notes: `Registrada por Agente GASTONAPP. Arrastrada con ${paidInst} cuotas pagadas de ${totalInst}`,
      });

      const remainingInst = Math.max(0, totalInst - paidInst);
      const remainingAmt = remainingInst * installmentAmt;
      const pct = Math.round((paidInst / totalInst) * 100);
      const percentNote = percentFound
        ? ` Guardé en tu configuración que destinarás el ${percentFound}% de tus ingresos a liquidarla.`
        : '';

      const reply = `¡Deuda incorporada al plan financiero, ${userName}!

📌 Concepto: "${debtName}"
📊 Estado arrastrado: ${paidInst} de ${totalInst} cuotas pagadas (${pct}% saldado)
💳 Cuota mensual: ${formatMoney(installmentAmt, currency)}/mes
⏳ Restan: ${remainingInst} cuotas (${formatMoney(remainingAmt, currency)} pendientes)
🗓️ Tiempo estimado para liquidarla: ${remainingInst} meses${percentNote}

A partir de ahora, tendré en cuenta esta cuota en tu saldo disponible y en las compras que evalúes. Cada vez que pagues una cuota decime "Pagué la cuota de ${debtName}" y actualizaré tu avance.`;

      return {
        reply,
        actionExecuted: {
          type: 'CREATE_DEBT',
          summary: `Deuda registrada: ${debtName} (${paidInst}/${totalInst} cuotas de ${formatMoney(installmentAmt, currency)})`,
          data: { debtName, totalInst, paidInst, installmentAmt, remainingAmt },
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 9. CREATE: REGISTRO DE INGRESO
  // ---------------------------------------------------------------------------
  const isIncomeIntent =
    (lower.includes('ingreso') ||
      lower.includes('cobr') ||
      lower.includes('sueldo') ||
      lower.includes('salario') ||
      lower.includes('honorario') ||
      lower.includes('changa') ||
      lower.includes('entro plata') ||
      lower.includes('entraron') ||
      lower.includes('factur')) &&
    !lower.includes('gasto') &&
    !lower.includes('puedo');

  if (isIncomeIntent) {
    if (amountFound > 0 && ctx.addIncome) {
      const desc = cleanDescription(prompt, amountFound) || 'Ingreso registrado';
      const category = inferIncomeCategory(prompt);

      await ctx.addIncome({
        date: todayStr,
        description: desc,
        amount: amountFound,
        category,
        paymentMethod: 'Transferencia / Efectivo',
        notes: `Registrado autónomamente por Agente GASTONAPP`,
      });

      const newFreeCash = totals.freeCashFlow + amountFound;

      recordAgentAction({
        type: 'income',
        entityId: 'inc_' + Date.now(),
        description: desc,
        amount: amountFound,
        category,
        date: todayStr,
        rawPrompt: prompt,
      });

      return {
        reply: `Ingreso registrado impecablemente, ${userName}: asenté ${formatMoney(
          amountFound,
          currency
        )} bajo "${category}" (${desc}). Tu saldo disponible asciende ahora a ${formatMoney(
          newFreeCash,
          currency
        )}.`,
        actionExecuted: {
          type: 'CREATE_INCOME',
          summary: `Ingreso creado: ${desc} por ${formatMoney(amountFound, currency)}`,
          data: { amount: amountFound, description: desc, category },
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 10. CREATE: REGISTRO DE GASTO (Fijo vs Variable)
  // ---------------------------------------------------------------------------
  const isExpenseRegisterIntent =
    lower.includes('anot') ||
    lower.includes('registr') ||
    lower.includes('carg') ||
    lower.includes('gast') ||
    lower.includes('pagu') ||
    lower.includes('compr') ||
    lower.startsWith('gaste') ||
    lower.startsWith('gasté') ||
    lower.startsWith('pague') ||
    lower.startsWith('pagué');

  const isOnlyEvaluating =
    (lower.includes('puedo') || lower.includes('alcanza') || lower.includes('conviene')) &&
    !lower.includes('anota') &&
    !lower.includes('registra') &&
    !lower.includes('gaste') &&
    !lower.includes('pague');

  if (isExpenseRegisterIntent && amountFound > 0 && !isOnlyEvaluating) {
    const desc = cleanDescription(prompt, amountFound) || 'Gasto registrado';
    const category = inferExpenseCategory(desc);

    const isFixed = /\b(fijo|fijos|alquiler|expensas|servicio|servicios|abono|seguro|cuota fija|colegio|internet|luz|gas|agua|patente|gimnasio)\b/i.test(
      lower
    );

    const expenseType: ExpenseType = isFixed ? 'fijo' : 'variable';

    await ctx.addExpense({
      date: todayStr,
      description: desc,
      amount: amountFound,
      category,
      type: expenseType,
      paymentMethod: 'Tarjeta / Efectivo',
      notes: `Registrado autónomamente por Agente GASTONAPP`,
    });

    const remainingFree = Math.max(0, totals.freeCashFlow - amountFound);
    const dailyAfter = Math.round(remainingFree / daysRemainingInMonth);

    recordAgentAction({
      type: 'expense',
      entityId: 'exp_' + Date.now(),
      description: desc,
      amount: amountFound,
      category,
      date: todayStr,
      rawPrompt: prompt,
    });

    return {
      reply: `Gasto ${expenseType === 'fijo' ? 'fijo esencial' : 'variable'} registrado, ${userName}: cargué ${formatMoney(
        amountFound,
        currency
      )} en "${category}" (${desc}). Te quedan ${formatMoney(
        remainingFree,
        currency
      )} libres (${formatMoney(dailyAfter, currency)}/día para los ${daysRemainingInMonth} días restantes).`,
      actionExecuted: {
        type: 'CREATE_EXPENSE',
        summary: `Gasto ${expenseType} creado: ${desc} por ${formatMoney(amountFound, currency)}`,
        data: { amount: amountFound, description: desc, category, type: expenseType },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 7. READ: CONSULTAS Y RESÚMENES (Gastos por categoría, saldos, últimos movimientos)
  // ---------------------------------------------------------------------------
  const isQueryIntent =
    lower.includes('cuanto gaste') ||
    lower.includes('cuánto gasté') ||
    lower.includes('cuanto llevo') ||
    lower.includes('cuánto llevo') ||
    lower.includes('ultimos gastos') ||
    lower.includes('últimos gastos') ||
    lower.includes('como vengo') ||
    lower.includes('cómo vengo') ||
    lower.includes('resumen') ||
    lower.includes('saldo') ||
    lower.includes('cuanto queda') ||
    lower.includes('cuánto queda');

  if (isQueryIntent) {
    // Consulta A: Últimos gastos
    if (lower.includes('ultimos') || lower.includes('últimos')) {
      const recent = ctx.expenses.slice(0, 5);
      if (recent.length === 0) {
        return {
          reply: `Aún no tenés gastos asentados este mes, ${userName}. La pizarra está limpia.`,
          actionExecuted: { type: 'QUERY', summary: 'Consulta de últimos gastos' },
        };
      }
      const list = recent
        .map((e) => `• ${e.description}: ${formatMoney(e.amount, currency)} (${e.category})`)
        .join('\n');
      return {
        reply: `Tus últimos movimientos registrados, ${userName}:\n${list}\n\nTotal gastado este mes: ${formatMoney(
          totals.currentMonthTotalExpenses,
          currency
        )}.`,
        actionExecuted: { type: 'QUERY', summary: 'Consulta de últimos gastos' },
      };
    }

    // Consulta B: Gasto en categoría específica (comida, nafta, farmacia, etc.)
    const categoryToCheck = inferExpenseCategory(prompt);
    if (categoryToCheck !== 'Otros Gastos' || lower.includes('comida') || lower.includes('super') || lower.includes('combustible')) {
      const filtered = ctx.expenses.filter((e) => e.category === categoryToCheck);
      const totalInCat = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      return {
        reply: `En "${categoryToCheck}" llevás gastado un total de ${formatMoney(
          totalInCat,
          currency
        )} (${filtered.length} registro${filtered.length === 1 ? '' : 's'}).`,
        actionExecuted: { type: 'QUERY', summary: `Consulta de categoría: ${categoryToCheck}` },
      };
    }

    // Consulta C: Saldo libre y balance general conciso
    const dailyFreeCash = Math.round(totals.freeCashFlow / daysRemainingInMonth);
    return {
      reply: `Tu estado financiero actual, ${userName}:\n• Saldo libre: ${formatMoney(
        totals.freeCashFlow,
        currency
      )} (${formatMoney(dailyFreeCash, currency)}/día para los ${daysRemainingInMonth} días restantes).\n• Total gastado este mes: ${formatMoney(
        totals.currentMonthTotalExpenses,
        currency
      )}.\n• Fondo de emergencia blindado: ${formatMoney(totals.emergencyFundBalance, currency)}.`,
      actionExecuted: { type: 'QUERY', summary: 'Consulta de balance' },
    };
  }

  // ---------------------------------------------------------------------------
  // 8. EVALUACIÓN DE COMPRAS ("¿Puedo comprar X por Y?")
  // ---------------------------------------------------------------------------
  if (amountFound > 0 && (lower.includes('puedo') || lower.includes('compr') || lower.includes('alcanza') || lower.includes('conviene'))) {
    const monthlyDebtCommitment = (ctx.debts || [])
      .filter((d) => d.type === 'a_pagar' && d.status === 'activa')
      .reduce((sum, d) => sum + Number(d.installmentAmount || 0), 0);
    const availableFreeCash = Math.max(0, totals.freeCashFlow - monthlyDebtCommitment);

    if (amountFound > availableFreeCash) {
      const deficit = amountFound - availableFreeCash;
      const debtNote =
        monthlyDebtCommitment > 0
          ? ` (teniendo en cuenta que tenés ${formatMoney(monthlyDebtCommitment, currency)} comprometidos en cuotas de deudas este mes)`
          : '';

      return {
        reply: `No te recomiendo esa compra, ${userName}. El valor de ${formatMoney(
          amountFound,
          currency
        )} supera tu margen libre real de ${formatMoney(
          availableFreeCash,
          currency
        )}${debtNote} por un déficit de -${formatMoney(
          deficit,
          currency
        )}. Quedan ${daysRemainingInMonth} días de mes y comprometerías tus compromisos de cuotas o reservas.`,
      };
    } else {
      const rest = availableFreeCash - amountFound;
      const dailyAfter = Math.round(rest / daysRemainingInMonth);
      const debtNote =
        monthlyDebtCommitment > 0
          ? ` (respetando tus ${formatMoney(monthlyDebtCommitment, currency)} de cuotas de deuda de este mes)`
          : '';

      return {
        reply: `Compra viable, ${userName}. El desembolso de ${formatMoney(
          amountFound,
          currency
        )} entra en tu saldo libre real${debtNote}. Te quedarán ${formatMoney(
          rest,
          currency
        )} disponibles para los ${daysRemainingInMonth} días que restan (${formatMoney(
          dailyAfter,
          currency
        )}/día) sin tocar tus reservas ni cuotas. Si querés que lo asiente, decime "anotalo" o "registralo".`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 9. DIÁLOGO GENERAL Y ASESORÍA ELOCUENTE (Sin spam ni bloques repetitivos)
  // ---------------------------------------------------------------------------
  if (lower.includes('hola') || lower.includes('buenas') || lower.includes('que tal') || lower.includes('cómo estás') || lower === 'che') {
    return {
      reply: `¡Hola, ${userName}! Estoy listo para gestionar tus finanzas. Podés pedirme que registre gastos o ingresos, consultar cuánto llevás gastado, evaluar compras o modificar cualquier registro. ¿Qué necesitás hacer hoy?`,
    };
  }

  // Fallback elocuente y orientado a la acción
  return {
    reply: `Te escucho, ${userName}. Puedo registrar un gasto o ingreso, modificar el último movimiento, consultar tus saldos por categoría o evaluar si te conviene hacer una compra. ¿Qué movimiento querés asentar o consultar?`,
  };
}
