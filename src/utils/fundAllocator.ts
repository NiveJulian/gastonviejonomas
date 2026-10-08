import type {
  Expense,
  SavingsGoal,
  AppConfig,
  CategoryGap,
  AllocationProposal,
  FundAllocationItem,
} from '../types/finance';
import { calculateFinancialTotals } from './rulesEngine';
import { formatMoney } from './helpers';

/**
 * Detecta brechas y categorías con déficit financiero
 */
export function detectCategoryGaps(
  expenses: Expense[],
  savings: SavingsGoal[],
  config: AppConfig
): CategoryGap[] {
  const totals = calculateFinancialTotals(expenses, savings, config);
  const gaps: CategoryGap[] = [];

  // 1. Verificar Fondo de Emergencia
  const emergencyGoals = savings.filter((s) => s.isEmergencyFund);
  const currentEmergencyBalance = emergencyGoals.reduce((sum, s) => sum + Number(s.currentAmount || 0), 0);
  const emergencyDeficit = Math.max(0, totals.emergencyFundMinimum - currentEmergencyBalance);

  if (emergencyDeficit > 0) {
    gaps.push({
      id: 'gap_emergency',
      name: 'Fondo de Emergencia Intocable',
      type: 'emergency_fund',
      currentAmount: currentEmergencyBalance,
      targetAmount: totals.emergencyFundMinimum,
      deficit: emergencyDeficit,
      urgency: 'high',
      reason: `Faltan ${formatMoney(emergencyDeficit, config.currency)} para alcanzar el umbral de seguridad mínimo. Sin este piso, cualquier imprevisto te obligará a endeudarte o sacrificar gastos esenciales.`,
    });
  }

  // 2. Metas de ahorro secundarias con faltante
  savings
    .filter((s) => !s.isEmergencyFund)
    .forEach((goal) => {
      const deficit = Math.max(0, goal.targetAmount - goal.currentAmount);
      if (deficit > 0) {
        gaps.push({
          id: `gap_goal_${goal.id}`,
          name: goal.name,
          type: 'savings_goal',
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          deficit,
          urgency: goal.deadline ? 'medium' : 'low',
          reason: `Faltan ${formatMoney(deficit, config.currency)} para completar esta meta${
            goal.deadline ? ` antes del ${goal.deadline}` : ''
          }.`,
        });
      }
    });

  // 3. Gastos esenciales si sobrepasan la recomendación saludable
  if (totals.currentMonthFixedExpenses > config.monthlyIncome * 0.6) {
    const excess = totals.currentMonthFixedExpenses - config.monthlyIncome * 0.5;
    gaps.push({
      id: 'gap_fixed_overload',
      name: 'Sobrecarga de Gastos Fijos del Hogar',
      type: 'essential_expenses',
      currentAmount: totals.currentMonthFixedExpenses,
      targetAmount: Math.round(config.monthlyIncome * 0.5),
      deficit: Math.round(excess),
      urgency: 'high',
      reason: `Tus gastos fijos absorben el ${Math.round(
        (totals.currentMonthFixedExpenses / config.monthlyIncome) * 100
      )}% de tus ingresos (lo ideal según la regla 50/30/20 es hasta el 50%). Esto deja poco margen para ahorrar.`,
    });
  }

  return gaps;
}

/**
 * Genera una propuesta matemática inteligente para distribuir el dinero libre entre las categorías faltantes
 */
export function generateAllocationProposal(
  expenses: Expense[],
  savings: SavingsGoal[],
  config: AppConfig,
  customAmountToAllocate?: number
): AllocationProposal {
  const totals = calculateFinancialTotals(expenses, savings, config);
  const gaps = detectCategoryGaps(expenses, savings, config);

  // Dinero disponible para distribuir (por defecto el excedente libre del mes)
  const available = customAmountToAllocate !== undefined
    ? customAmountToAllocate
    : Math.max(0, totals.freeCashFlow);

  const totalDeficit = gaps.reduce((sum, g) => sum + g.deficit, 0);

  if (available <= 0) {
    return {
      availableToAllocate: 0,
      totalDeficit,
      items: [],
      summaryMessage:
        'Actualmente no tienes excedente libre este mes. Para destinar fondos, primero debes recortar gastos variables o esperar el próximo ingreso.',
    };
  }

  const items: FundAllocationItem[] = [];
  const emergencyGoal = savings.find((s) => s.isEmergencyFund);
  const otherGoals = savings.filter((s) => !s.isEmergencyFund && s.targetAmount > s.currentAmount);

  // Escenario A: El Fondo de Emergencia necesita fondos urgentemente
  const emergencyGap = gaps.find((g) => g.type === 'emergency_fund');

  if (emergencyGap && emergencyGoal && emergencyGap.deficit > 0) {
    // 50% al fondo de emergencia
    const emergencyAmount = Math.min(emergencyGap.deficit, Math.round(available * 0.50));
    items.push({
      targetId: emergencyGoal.id,
      targetName: emergencyGoal.name,
      type: 'emergency',
      suggestedAmount: emergencyAmount,
      percentage: Math.round((emergencyAmount / available) * 100),
      reason: 'Prioridad Máxima: Fortalecer tu colchón de seguridad intocable para blindarte contra imprevistos.',
    });

    let remainingForGoals = available - emergencyAmount;

    // Distribuir el resto en metas secundarias
    if (otherGoals.length > 0 && remainingForGoals > 0) {
      const sharePerGoal = Math.round((remainingForGoals * 0.70) / otherGoals.length);
      otherGoals.forEach((goal) => {
        const goalDeficit = goal.targetAmount - goal.currentAmount;
        const assigned = Math.min(goalDeficit, sharePerGoal);
        if (assigned > 0) {
          items.push({
            targetId: goal.id,
            targetName: goal.name,
            type: 'goal',
            suggestedAmount: assigned,
            percentage: Math.round((assigned / available) * 100),
            reason: 'Avance constante hacia tus proyectos personales sin descuidar tu seguridad.',
          });
        }
      });
    }
  } else {
    // Escenario B: El Fondo de Emergencia ya está blindado
    if (otherGoals.length > 0) {
      const sharePerGoal = Math.round((available * 0.75) / otherGoals.length);
      otherGoals.forEach((goal) => {
        const goalDeficit = goal.targetAmount - goal.currentAmount;
        const assigned = Math.min(goalDeficit, sharePerGoal);
        if (assigned > 0) {
          items.push({
            targetId: goal.id,
            targetName: goal.name,
            type: 'goal',
            suggestedAmount: assigned,
            percentage: Math.round((assigned / available) * 100),
            reason: 'Tu Fondo de Emergencia está completo. Puedes acelerar al máximo estas metas de ahorro.',
          });
        }
      });
    }
  }

  // Colchón de libre disponibilidad restante
  const allocatedSoFar = items.reduce((sum, item) => sum + item.suggestedAmount, 0);
  const bufferRemaining = available - allocatedSoFar;

  if (bufferRemaining > 0) {
    items.push({
      targetId: 'buffer_free',
      targetName: 'Colchón de Reserva Libre (Billetera / Día a Día)',
      type: 'buffer',
      suggestedAmount: bufferRemaining,
      percentage: Math.round((bufferRemaining / available) * 100),
      reason: 'Dinero de amortiguación para gastos imprevistos de la semana o entretenimiento sin remordimientos.',
    });
  }

  return {
    availableToAllocate: available,
    totalDeficit,
    items,
    summaryMessage: `Hemos optimizado la distribución de ${formatMoney(
      available,
      config.currency
    )} asignando prioridad al fondo de emergencia y metas activas.`,
  };
}
