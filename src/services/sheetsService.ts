import type { Expense, Investment, SavingsGoal, AppConfig } from '../types/finance';

export interface SheetFullData {
  expenses: Expense[];
  investments: Investment[];
  savings: SavingsGoal[];
  config: Partial<AppConfig>;
}

/**
 * Consulta todos los datos desde el Google Apps Script
 */
export async function fetchFromGoogleSheet(apiUrl: string): Promise<SheetFullData> {
  if (!apiUrl) throw new Error('No se configuró la URL de Google Apps Script');

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error en el servidor de Google (${response.status}): ${response.statusText}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al obtener datos de Google Sheets');
  }

  return {
    expenses: (result.data.expenses || []).map((e: any) => ({
      ...e,
      amount: Number(e.amount) || 0,
    })),
    investments: (result.data.investments || []).map((i: any) => ({
      ...i,
      investedAmount: Number(i.investedAmount) || 0,
      currentValue: Number(i.currentValue) || Number(i.investedAmount) || 0,
      yieldPercent: Number(i.yieldPercent) || 0,
    })),
    savings: (result.data.savings || []).map((s: any) => ({
      ...s,
      isEmergencyFund: s.isEmergencyFund === 'SI' || s.isEmergencyFund === true,
      targetAmount: Number(s.targetAmount) || 0,
      currentAmount: Number(s.currentAmount) || 0,
    })),
    config: {
      monthlyIncome: Number(result.data.config?.IngresoMensual) || 0,
      currency: result.data.config?.Moneda || '$',
      emergencyFundMinimum: Number(result.data.config?.FondoEmergenciaMinimo) || 0,
    },
  };
}

/**
 * Guarda un gasto en Google Sheets y sube su comprobante a Google Drive
 */
export async function postExpenseToSheet(
  apiUrl: string,
  expense: Expense,
  receiptBase64?: string,
  receiptFilename?: string
): Promise<{ id: string; receiptUrl?: string }> {
  if (!apiUrl) {
    return { id: expense.id, receiptUrl: expense.receiptUrl };
  }

  const payload = {
    action: 'ADD_EXPENSE',
    id: expense.id,
    date: expense.date,
    description: expense.description,
    category: expense.category,
    type: expense.type,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    receiptBase64: receiptBase64 || '',
    receiptFilename: receiptFilename || '',
    notes: expense.notes || '',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // Apps Script maneja text/plain para evitar bloqueos CORS
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar el gasto en Google Sheets');
  }

  return {
    id: result.id || expense.id,
    receiptUrl: result.receiptUrl || '',
  };
}

/**
 * Guarda una inversión en Google Sheets
 */
export async function postInvestmentToSheet(apiUrl: string, investment: Investment): Promise<void> {
  if (!apiUrl) return;

  const payload = {
    action: 'ADD_INVESTMENT',
    ...investment,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar la inversión en Google Sheets');
  }
}

/**
 * Guarda una meta de ahorro o fondo de emergencia en Google Sheets
 */
export async function postSavingsToSheet(apiUrl: string, goal: SavingsGoal): Promise<void> {
  if (!apiUrl) return;

  const payload = {
    action: 'ADD_SAVINGS',
    ...goal,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar el ahorro en Google Sheets');
  }
}

/**
 * Actualiza la configuración en Google Sheets
 */
export async function postConfigToSheet(apiUrl: string, config: Partial<AppConfig>): Promise<void> {
  if (!apiUrl) return;

  const configMap: Record<string, any> = {};
  if (config.monthlyIncome !== undefined) configMap['IngresoMensual'] = config.monthlyIncome;
  if (config.currency !== undefined) configMap['Moneda'] = config.currency;
  if (config.emergencyFundMinimum !== undefined) configMap['FondoEmergenciaMinimo'] = config.emergencyFundMinimum;

  const payload = {
    action: 'UPDATE_CONFIG',
    config: configMap,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar la configuración en Google Sheets');
  }
}

/**
 * Elimina una fila por ID y nombre de pestaña
 */
export async function deleteRowFromSheet(apiUrl: string, sheetName: string, id: string): Promise<void> {
  if (!apiUrl) return;

  const payload = {
    action: 'DELETE_ROW',
    sheetName,
    id,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al eliminar el registro en Google Sheets');
  }
}
