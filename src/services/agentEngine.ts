import type { Expense, Income, SavingsGoal, Investment, AppConfig, GoogleUser, ExpenseCategory, IncomeCategory } from '../types/finance';
import { calculateFinancialTotals } from '../utils/rulesEngine';
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
    .replace(/\b(?:pesos|mangos|ars|lucas|palos|k|mil)\b/gi, '')
    .trim();

  if (amount > 0) {
    // Quitar el número del monto
    const amountStr = amount.toString();
    clean = clean.replace(new RegExp(`\\$?\\s*${amountStr}`, 'g'), '');
    const formattedWithDot = amount.toLocaleString('es-AR');
    clean = clean.replace(new RegExp(`\\$?\\s*${formattedWithDot.replace(/\./g, '\\.')}`, 'g'), '');
  }

  clean = clean.replace(/^[:\-\s,]+|[:\-\s,]+$/g, '').trim();
  // Capitalizar primera letra
  if (clean.length > 0) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Varios';
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
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - now.getDate());

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

  // ---------------------------------------------------------------------------
  // 4. CREATE: REGISTRO DE INGRESO
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
    const amount = extractAmount(prompt);
    if (amount > 0 && ctx.addIncome) {
      const desc = cleanDescription(prompt, amount) || 'Ingreso registrado';
      const category = inferIncomeCategory(prompt);
      const dateStr = new Date().toISOString().split('T')[0];

      await ctx.addIncome({
        date: dateStr,
        description: desc,
        amount,
        category,
        paymentMethod: 'Transferencia / Efectivo',
        notes: `Registrado autónomamente por Agente GASTONAPP`,
      });

      const newIncomeTotal = (totals.currentMonthTotalIncomes || totals.effectiveMonthlyIncome) + amount;
      const newFreeCash = totals.freeCashFlow + amount;

      recordAgentAction({
        type: 'income',
        entityId: 'inc_' + Date.now(),
        description: desc,
        amount,
        category,
        date: dateStr,
        rawPrompt: prompt,
      });

      return {
        reply: `Ingreso registrado impecablemente, ${userName}: asenté ${formatMoney(
          amount,
          currency
        )} bajo "${category}" (${desc}). Tu saldo disponible asciende ahora a ${formatMoney(
          newFreeCash,
          currency
        )}.`,
        actionExecuted: {
          type: 'CREATE_INCOME',
          summary: `Ingreso creado: ${desc} por ${formatMoney(amount, currency)}`,
          data: { amount, description: desc, category },
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CREATE: REGISTRO DE GASTO
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

  const amountFound = extractAmount(prompt);

  // Si tiene monto y no es una mera pregunta de evaluación ("¿puedo gastar...?")
  const isOnlyEvaluating = (lower.includes('puedo') || lower.includes('alcanza') || lower.includes('conviene')) && !lower.includes('anota') && !lower.includes('registra') && !lower.includes('gaste') && !lower.includes('pague');

  if (isExpenseRegisterIntent && amountFound > 0 && !isOnlyEvaluating) {
    const desc = cleanDescription(prompt, amountFound) || 'Gasto registrado';
    const category = inferExpenseCategory(desc);
    const dateStr = new Date().toISOString().split('T')[0];

    await ctx.addExpense({
      date: dateStr,
      description: desc,
      amount: amountFound,
      category,
      type: 'variable',
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
      date: dateStr,
      rawPrompt: prompt,
    });

    return {
      reply: `Gasto registrado, ${userName}: cargué ${formatMoney(
        amountFound,
        currency
      )} en "${category}" (${desc}). Te quedan ${formatMoney(
        remainingFree,
        currency
      )} libres (${formatMoney(dailyAfter, currency)}/día para los ${daysRemainingInMonth} días restantes).`,
      actionExecuted: {
        type: 'CREATE_EXPENSE',
        summary: `Gasto creado: ${desc} por ${formatMoney(amountFound, currency)}`,
        data: { amount: amountFound, description: desc, category },
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 6. CREATE: META DE AHORRO
  // ---------------------------------------------------------------------------
  if ((lower.includes('meta') || lower.includes('ahorro')) && (lower.includes('crear') || lower.includes('armar') || lower.includes('nueva meta'))) {
    const targetAmt = amountFound > 0 ? amountFound : 100000;
    const goalName = cleanDescription(prompt, targetAmt) || 'Nueva Meta de Ahorro';

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
      date: new Date().toISOString().split('T')[0],
      rawPrompt: prompt,
    });

    return {
      reply: `Meta creada con éxito, ${userName}: definí "${goalName}" con objetivo de ${formatMoney(
        targetAmt,
        currency
      )}. Ya podés asignarle fondos desde la sección Ahorros.`,
      actionExecuted: {
        type: 'CREATE_GOAL',
        summary: `Meta de ahorro creada: ${goalName} (${formatMoney(targetAmt, currency)})`,
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
