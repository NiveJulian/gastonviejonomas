import type { Expense, Income, SavingsGoal, Investment, AppConfig, GoogleUser, ExpenseCategory, IncomeCategory, ExpenseType } from '../types/finance';
import { calculateFinancialTotals } from '../utils/rulesEngine';
import { calculateComfortAnalysis } from '../utils/comfortCalculator';
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
    if (amountFound > totals.freeCashFlow) {
      const deficit = amountFound - totals.freeCashFlow;
      return {
        reply: `No te recomiendo esa compra, ${userName}. El valor de ${formatMoney(
          amountFound,
          currency
        )} supera tu saldo libre disponible (${formatMoney(
          totals.freeCashFlow,
          currency
        )}) por un déficit de -${formatMoney(
          deficit,
          currency
        )}. Quedan ${daysRemainingInMonth} días de mes y comprometerías tus fondos de reserva.`,
      };
    } else {
      const rest = totals.freeCashFlow - amountFound;
      const dailyAfter = Math.round(rest / daysRemainingInMonth);
      return {
        reply: `Compra viable, ${userName}. El desembolso de ${formatMoney(
          amountFound,
          currency
        )} entra en tu saldo libre. Te quedarán ${formatMoney(
          rest,
          currency
        )} disponibles para los ${daysRemainingInMonth} días que restan (${formatMoney(
          dailyAfter,
          currency
        )}/día) sin tocar tus reservas. Si querés que lo asiente, decime "anotalo" o "registralo".`,
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
