import type { Debt } from '../types/finance';

export interface DebtSummary {
  // Pasivos (a pagar)
  activeDebtsToPay: Debt[];
  totalDebtToPayRemaining: number;
  monthlyInstallmentsToPay: number;
  totalOriginalDebtToPay: number;
  totalPaidDebtToPay: number;
  overallPayProgressPercent: number;
  maxMonthsToPayoff: number;

  // Activos (a cobrar)
  activeDebtsToCollect: Debt[];
  totalDebtToCollectRemaining: number;
  monthlyInstallmentsToCollect: number;

  // Balance y Ratios
  netDebtRemaining: number; // toPay - toCollect
  netMonthlyCommitment: number; // toPay - toCollect
  incomeCommitmentPercent: number; // % del ingreso consumido por cuotas
  dailyCommitmentToPay: number; // Cuota por día promedio

  // Presupuesto asignado
  targetBudget: number;
  budgetSurplusOrDeficit: number; // targetBudget - monthlyInstallmentsToPay
  canAcceleratePayoff: boolean;
}

/**
 * Calcula los detalles individuales de progreso de una deuda
 */
export function getDebtDetails(debt: Debt) {
  const remainingInstallments = Math.max(0, debt.totalInstallments - debt.paidInstallments);
  const remainingAmount = remainingInstallments * debt.installmentAmount;
  const paidAmount = debt.paidInstallments * debt.installmentAmount;
  const percentPaid =
    debt.totalInstallments > 0
      ? Math.min(100, Math.round((debt.paidInstallments / debt.totalInstallments) * 100))
      : 100;
  const isFinished = remainingInstallments === 0 || debt.status === 'saldada';

  return {
    remainingInstallments,
    remainingAmount,
    paidAmount,
    percentPaid,
    isFinished,
  };
}

/**
 * Analiza la totalidad de las deudas (a pagar y a cobrar) y proyecta el plan de liquidación
 */
export function calculateDebtTotals(
  debts: Debt[],
  monthlyIncome: number = 0,
  repaymentBudget?: number,
  repaymentPercent?: number
): DebtSummary {
  const activeDebtsToPay = debts.filter((d) => d.type === 'a_pagar' && d.status === 'activa');
  const activeDebtsToCollect = debts.filter((d) => d.type === 'a_cobrar' && d.status === 'activa');

  let totalDebtToPayRemaining = 0;
  let monthlyInstallmentsToPay = 0;
  let totalOriginalDebtToPay = 0;
  let totalPaidDebtToPay = 0;
  let maxMonthsToPayoff = 0;

  for (const d of activeDebtsToPay) {
    const details = getDebtDetails(d);
    totalDebtToPayRemaining += details.remainingAmount;
    monthlyInstallmentsToPay += Number(d.installmentAmount || 0);
    totalOriginalDebtToPay += Number(d.totalAmount || details.remainingAmount + details.paidAmount);
    totalPaidDebtToPay += details.paidAmount;
    if (details.remainingInstallments > maxMonthsToPayoff) {
      maxMonthsToPayoff = details.remainingInstallments;
    }
  }

  let totalDebtToCollectRemaining = 0;
  let monthlyInstallmentsToCollect = 0;

  for (const d of activeDebtsToCollect) {
    const details = getDebtDetails(d);
    totalDebtToCollectRemaining += details.remainingAmount;
    monthlyInstallmentsToCollect += Number(d.installmentAmount || 0);
  }

  const overallPayProgressPercent =
    totalOriginalDebtToPay > 0
      ? Math.min(100, Math.round((totalPaidDebtToPay / totalOriginalDebtToPay) * 100))
      : 0;

  const incomeCommitmentPercent =
    monthlyIncome > 0 ? Math.round((monthlyInstallmentsToPay / monthlyIncome) * 100) : 0;

  const targetBudget =
    repaymentBudget !== undefined && repaymentBudget > 0
      ? repaymentBudget
      : repaymentPercent !== undefined && repaymentPercent > 0 && monthlyIncome > 0
      ? Math.round((monthlyIncome * repaymentPercent) / 100)
      : monthlyInstallmentsToPay;

  const budgetSurplusOrDeficit = targetBudget - monthlyInstallmentsToPay;
  const canAcceleratePayoff = budgetSurplusOrDeficit > 0;
  const dailyCommitmentToPay = Math.ceil(monthlyInstallmentsToPay / 30);

  return {
    activeDebtsToPay,
    totalDebtToPayRemaining,
    monthlyInstallmentsToPay,
    totalOriginalDebtToPay,
    totalPaidDebtToPay,
    overallPayProgressPercent,
    maxMonthsToPayoff,

    activeDebtsToCollect,
    totalDebtToCollectRemaining,
    monthlyInstallmentsToCollect,

    netDebtRemaining: totalDebtToPayRemaining - totalDebtToCollectRemaining,
    netMonthlyCommitment: monthlyInstallmentsToPay - monthlyInstallmentsToCollect,
    incomeCommitmentPercent,
    dailyCommitmentToPay,

    targetBudget,
    budgetSurplusOrDeficit,
    canAcceleratePayoff,
  };
}
