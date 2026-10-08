import type { Expense, SavingsGoal, AppConfig, PurchaseEvaluation, Income } from '../types/finance';
import { formatMoney, getCurrentYearMonth } from './helpers';

interface FinancialTotals {
  currentMonthTotalExpenses: number;
  currentMonthFixedExpenses: number;
  currentMonthVariableExpenses: number;
  currentMonthTotalIncomes: number;
  effectiveMonthlyIncome: number;
  emergencyFundBalance: number;
  emergencyFundMinimum: number;
  otherSavingsBalance: number;
  totalSavingsBalance: number;
  freeCashFlow: number; // Ingresos - Gastos del mes
  netSavingsRate: number; // Porcentaje de ahorro del mes
}

/**
 * Calcula los totales financieros relevantes del mes actual
 */
export function calculateFinancialTotals(
  expenses: Expense[],
  savings: SavingsGoal[],
  config: AppConfig,
  incomes: Income[] = []
): FinancialTotals {
  const currentYM = getCurrentYearMonth();

  // Filtrar ingresos del mes corriente
  const currentMonthIncomes = incomes.filter((i) => i.date.startsWith(currentYM));
  const currentMonthTotalIncomes = currentMonthIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  // Si hay ingresos cargados en el mes, se usan esos; si no, el estimado mensual
  const effectiveMonthlyIncome =
    currentMonthTotalIncomes > 0 ? currentMonthTotalIncomes : config.monthlyIncome;

  // Filtrar gastos del mes corriente
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentYM));

  const currentMonthTotalExpenses = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const currentMonthFixedExpenses = currentMonthExpenses
    .filter((e) => e.type === 'fijo')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const currentMonthVariableExpenses = currentMonthExpenses
    .filter((e) => e.type === 'variable')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Ahorros y Fondo de Emergencia
  const emergencyGoals = savings.filter((s) => s.isEmergencyFund);
  const emergencyFundBalance = emergencyGoals.reduce((sum, s) => sum + Number(s.currentAmount || 0), 0);

  const otherGoals = savings.filter((s) => !s.isEmergencyFund);
  const otherSavingsBalance = otherGoals.reduce((sum, s) => sum + Number(s.currentAmount || 0), 0);
  const totalSavingsBalance = emergencyFundBalance + otherSavingsBalance;

  // Si no se configuró fondo de emergencia mínimo, estimamos 3 meses de gastos fijos o 0
  const emergencyFundMinimum =
    config.emergencyFundMinimum > 0
      ? config.emergencyFundMinimum
      : currentMonthFixedExpenses * 3;

  // Flujo libre restante del mes
  const freeCashFlow = Math.max(0, effectiveMonthlyIncome - currentMonthTotalExpenses);

  const netSavingsRate = effectiveMonthlyIncome > 0
    ? Math.max(0, Math.round(((effectiveMonthlyIncome - currentMonthTotalExpenses) / effectiveMonthlyIncome) * 100))
    : 0;

  return {
    currentMonthTotalExpenses,
    currentMonthFixedExpenses,
    currentMonthVariableExpenses,
    currentMonthTotalIncomes,
    effectiveMonthlyIncome,
    emergencyFundBalance,
    emergencyFundMinimum,
    otherSavingsBalance,
    totalSavingsBalance,
    freeCashFlow,
    netSavingsRate,
  };
}

/**
 * Evalúa si el usuario puede o no permitirse sacar plata para una compra
 * con tono despectivo/sarcástico en modo chiste pero veredicto matemático implacable
 */
export function evaluatePurchase(
  purchaseAmount: number,
  itemName: string,
  necessityLevel: number, // 1 (Puro capricho) a 5 (Extrema urgencia/necesidad)
  expenses: Expense[],
  savings: SavingsGoal[],
  config: AppConfig,
  incomes: Income[] = []
): PurchaseEvaluation {
  const totals = calculateFinancialTotals(expenses, savings, config, incomes);
  const currency = config.currency || '$';

  const amount = Number(purchaseAmount) || 0;
  const freeCashFlowBefore = totals.freeCashFlow;
  const freeCashFlowAfter = freeCashFlowBefore - amount;

  const now = new Date();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - now.getDate());
  const dailyFreeCashBefore = Math.round(freeCashFlowBefore / daysRemainingInMonth);

  const metrics = {
    purchaseAmount: amount,
    monthlyIncome: totals.effectiveMonthlyIncome,
    currentExpenses: totals.currentMonthTotalExpenses,
    freeCashFlowBefore,
    freeCashFlowAfter,
    emergencyFundBalance: totals.emergencyFundBalance,
    emergencyFundMinimum: totals.emergencyFundMinimum,
    totalSavingsAvailable: totals.otherSavingsBalance,
  };

  if (amount <= 0) {
    return {
      verdict: 'APPROVED',
      title: 'Ingresa un monto válido',
      reason: 'Por favor coloca el precio real de lo que querés comprar antes de que te juzgue.',
      tips: ['Ingresa un valor mayor a 0 para que podamos calcular si te fundís o no.'],
      metrics,
    };
  }

  // CASO 1: Compra cubierta por el excedente mensual libre
  if (amount <= freeCashFlowBefore) {
    const remainingAfter = freeCashFlowBefore - amount;
    const dailyAfter = Math.round(remainingAfter / daysRemainingInMonth);
    return {
      verdict: 'APPROVED',
      title: '🟢 Aprobado a regañadientes: Milagro de Messi, te da el cuero',
      reason: `Tenés ${formatMoney(freeCashFlowBefore, currency)} de saldo libre y tras gatillar los ${formatMoney(amount, currency)}, todavía te sobran ${formatMoney(remainingAfter, currency)} para morfar y sobrevivir los ${daysRemainingInMonth} días restantes del mes (${formatMoney(dailyAfter, currency)}/día). La pelota no se mancha: es un capricho cuestionable, pero matemáticamente no te vas a fundir. ¡Vamoooo Messi!`,
      tips: [
        'No te corta las piernas ni pone en peligro el techo ni los fideos del mes.',
        'Tu fondo de emergencia sigue a salvo en el arco.',
        necessityLevel <= 2
          ? 'Nota: Aunque te dé la nafta, comprar esto es una payasada atada con alambre. Si podés aguantar 24 horas sin gatillar, hacelo por la Scaloneta.'
          : 'Gasto viable dentro de tu presupuesto mensual.',
      ],
      metrics,
    };
  }

  // CASO 2: Supera el dinero libre del mes, pero se puede cubrir con ahorros secundarios (sin tocar el fondo de emergencia)
  const deficitFromMonthly = amount - freeCashFlowBefore;
  if (deficitFromMonthly <= totals.otherSavingsBalance) {
    const impactPercent = totals.otherSavingsBalance > 0
      ? Math.round((deficitFromMonthly / totals.otherSavingsBalance) * 100)
      : 100;

    return {
      verdict: 'WARNING',
      title: '🟡 Alerta: Vas a tener que reventar ahorros por este mambo',
      reason: `Tu saldo libre mensual (${formatMoney(freeCashFlowBefore, currency)}) no alcanza para cubrir ${formatMoney(amount, currency)}. Te faltan ${formatMoney(deficitFromMonthly, currency)}. Vas a tener que reventar el ${impactPercent}% de tus ahorros secundarios. Sobrevivís el mes raspando la olla, pero tu futuro financiero acaba de recibir una murra.`,
      tips: [
        'Tu Fondo de Emergencia esencial NO será afectado (sigue a salvo de tus garras).',
        `Esta compra retrasa el avance de tus metas secundarias en ${formatMoney(deficitFromMonthly, currency)}.`,
        necessityLevel >= 4
          ? 'Si de verdad es una emergencia crítica, usá los ahorros. Si no, estás inventando excusas de chanta.'
          : 'Al tener baja necesidad, calmá la ansiedad y juntá los mangos antes de patinártelos.',
      ],
      metrics,
    };
  }

  // CASO 3: Supera la liquidez total o perforaría el fondo de emergencia / supervivencia
  const totalAvailableWithoutEmergency = freeCashFlowBefore + totals.otherSavingsBalance;
  const emergencyDeficit = amount - totalAvailableWithoutEmergency;

  return {
    verdict: 'REJECTED',
    title: '🔴 ¡Bloqueado! ¿Qué mirás bobo? ¡Andá pa allá!',
    reason: `¿En qué estabas pensando, che? Este gasto de ${formatMoney(amount, currency)} es un suicidio financiero. Supera tu liquidez disponible por un déficit de ${formatMoney(emergencyDeficit, currency)}. Te quedan ${daysRemainingInMonth} días para terminar el mes; si comprás esto vas a quedar en la lona comiendo aire o reventando tu fondo de emergencia. Como decía el Diego: te estás cortando las piernas solo.`,
    tips: [
      `Apenas disponés de ${formatMoney(totalAvailableWithoutEmergency, currency)} entre excedente mensual y ahorros no esenciales.`,
      `El Fondo de Emergencia (${formatMoney(totals.emergencyFundBalance, currency)}) es intocable: no se toca para caprichos personales.`,
      `Presupuesto diario actual: ${formatMoney(dailyFreeCashBefore, currency)}/día para los ${daysRemainingInMonth} días restantes. No te alcanza para delirar.`,
      'Consejo ricotero: El futuro llegó hace rato y en tu caso es la quiebra. Cerrá la billetera, tomate un mate y olvidate de esta compra. Hacelo por Messi.',
    ],
    metrics,
  };
}
