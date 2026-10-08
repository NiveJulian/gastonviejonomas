import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Expense, Investment, SavingsGoal, AppConfig, GoogleUser, Income } from '../types/finance';
import {
  fetchFromGoogleSheet,
  postExpenseToSheet,
  postInvestmentToSheet,
  postSavingsToSheet,
  postConfigToSheet,
  deleteRowFromSheet,
} from '../services/sheetsService';
import {
  getStoredGoogleSession,
  clearGoogleSession,
  promptGoogleLogin,
} from '../services/googleAuthService';
import {
  findOrCreateSpreadsheet,
  findOrCreateDriveFolder,
  readAllFromGoogleSheetsDirect,
  appendExpenseDirect,
  appendInvestmentDirect,
  appendSavingsDirect,
  uploadReceiptToDriveDirect,
  updateConfigDirect,
} from '../services/googleDirectService';
import { generateId, getCurrentYearMonth } from '../utils/helpers';
import { startBrowserTelegramBot, stopBrowserTelegramBot } from '../services/browserTelegramBot';
import { askFinancialAdvisor } from '../services/geminiService';

interface FinanceContextType {
  expenses: Expense[];
  incomes: Income[];
  investments: Investment[];
  savings: SavingsGoal[];
  config: AppConfig;
  googleUser: GoogleUser | null;
  isSyncing: boolean;
  syncError: string | null;
  loginWithGoogle: () => Promise<boolean>;
  logoutGoogle: () => void;
  syncDirectWithGoogle: () => Promise<boolean>;
  addExpense: (
    expense: Omit<Expense, 'id'>,
    receiptBase64?: string,
    receiptFilename?: string
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome: (income: Omit<Income, 'id'>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addInvestment: (investment: Omit<Investment, 'id'>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsAmount: (id: string, newAmount: number) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  syncWithGoogleSheets: (customUrl?: string) => Promise<boolean>;
  telegramBotStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  telegramBotError: string | null;
  connectTelegramBot: (customToken?: string) => Promise<boolean>;
  disconnectTelegramBot: () => void;
  exportDataJson: () => void;
  importDataJson: (jsonString: string) => boolean;
  formatAllData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY = 'finanzahogar_data_clean_v1';

// Limpieza de datos mock anteriores en localStorage
try {
  localStorage.removeItem('misfinanzas_data_v1_expenses');
  localStorage.removeItem('misfinanzas_data_v1_investments');
  localStorage.removeItem('misfinanzas_data_v1_savings');
  localStorage.removeItem('misfinanzas_data_v1_config');
} catch {}

const getInitialState = () => {
  return {
    expenses: [] as Expense[],
    investments: [] as Investment[],
    savings: [] as SavingsGoal[],
    config: {
      monthlyIncome: 0,
      currency: '$',
      emergencyFundMinimum: 0,
      appsScriptUrl: '',
      omnirouteBaseUrl: '',
      omnirouteApiKey: '',
      omnirouteModel: '',
    },
  };
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_expenses');
    return saved ? JSON.parse(saved) : getInitialState().expenses;
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_incomes');
    return saved ? JSON.parse(saved) : [];
  });

  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_investments');
    return saved ? JSON.parse(saved) : getInitialState().investments;
  });

  const [savings, setSavings] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_savings');
    return saved ? JSON.parse(saved) : getInitialState().savings;
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.omnirouteBaseUrl && parsed.omnirouteBaseUrl.includes('179.197.234.201')) {
          delete parsed.omnirouteBaseUrl;
        }
        if (parsed.omnirouteApiKey && parsed.omnirouteApiKey.includes('sk-f1242990fcccde3e')) {
          delete parsed.omnirouteApiKey;
        }
        if (parsed.omnirouteModel === 'auto/best-fast') {
          delete parsed.omnirouteModel;
        }
        return { ...getInitialState().config, ...parsed };
      } catch {}
    }
    return getInitialState().config;
  });

  // Sesión persistente de Google en localStorage
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    return getStoredGoogleSession();
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Guardar en localStorage ante cualquier cambio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_savings', JSON.stringify(savings));
  }, [savings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_config', JSON.stringify(config));
  }, [config]);

  // Si hay sesión guardada al iniciar, sincronizar datos existentes en background
  useEffect(() => {
    const session = getStoredGoogleSession();
    if (session && config.googleSpreadsheetId) {
      syncDirectWithGoogle(session.accessToken, config.googleSpreadsheetId);
    }
  }, []);

  /**
   * Sincronización directa con Google Sheets API (sin backend ni intermediarios)
   */
  const syncDirectWithGoogle = async (token?: string, sheetId?: string): Promise<boolean> => {
    const activeToken = token || googleUser?.accessToken;
    const targetSheetId = sheetId || config.googleSpreadsheetId;

    if (!activeToken || !targetSheetId) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const data = await readAllFromGoogleSheetsDirect(activeToken, targetSheetId);
      if (data.expenses && data.expenses.length > 0) setExpenses(data.expenses);
      if (data.investments && data.investments.length > 0) setInvestments(data.investments);
      if (data.savings && data.savings.length > 0) setSavings(data.savings);

      setConfig((prev) => ({
        ...prev,
        ...data.config,
        googleSpreadsheetId: targetSheetId,
        lastSync: new Date().toLocaleTimeString(),
      }));

      setIsSyncing(false);
      return true;
    } catch (err: any) {
      console.warn('Error sincronizando directo con Google Sheets:', err.message);
      setSyncError(err.message || 'Error al conectar con Google Sheets');
      setIsSyncing(false);
      return false;
    }
  };

  /**
   * Iniciar sesión con Google, detectar/crear la hoja y persistir sesión en localStorage
   */
  const loginWithGoogle = async (): Promise<boolean> => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const user = await promptGoogleLogin();
      setGoogleUser(user);

      // 1. Buscar o crear carpeta de comprobantes en Google Drive
      const folderId = await findOrCreateDriveFolder(user.accessToken);

      // 2. Buscar si ya existe la hoja o crearla respetando datos
      const { spreadsheetId, isNew } = await findOrCreateSpreadsheet(
        user.accessToken,
        config.googleSpreadsheetId
      );

      setConfig((prev) => ({
        ...prev,
        googleSpreadsheetId: spreadsheetId,
        googleDriveFolderId: folderId,
        lastSync: new Date().toLocaleTimeString(),
      }));

      // Si la hoja ya existía, cargar sus datos existentes
      if (!isNew) {
        await syncDirectWithGoogle(user.accessToken, spreadsheetId);
      } else {
        // Si era nueva, subir los datos iniciales a Sheets
        for (const exp of expenses) {
          await appendExpenseDirect(user.accessToken, spreadsheetId, exp);
        }
        for (const inv of investments) {
          await appendInvestmentDirect(user.accessToken, spreadsheetId, inv);
        }
        for (const sav of savings) {
          await appendSavingsDirect(user.accessToken, spreadsheetId, sav);
        }
      }

      setIsSyncing(false);
      return true;
    } catch (err: any) {
      console.error('Error en login con Google:', err);
      setSyncError(err.message || 'No se pudo completar el inicio de sesión con Google');
      setIsSyncing(false);
      return false;
    }
  };

  /**
   * Cerrar sesión de Google
   */
  const logoutGoogle = () => {
    clearGoogleSession();
    setGoogleUser(null);
  };

  // Sincronización alternativa vía Apps Script URL si aún se usa
  const syncWithGoogleSheets = async (customUrl?: string): Promise<boolean> => {
    if (googleUser && config.googleSpreadsheetId) {
      return syncDirectWithGoogle();
    }

    const url = customUrl || config.appsScriptUrl;
    if (!url) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const data = await fetchFromGoogleSheet(url);
      if (data.expenses && data.expenses.length > 0) setExpenses(data.expenses);
      if (data.investments && data.investments.length > 0) setInvestments(data.investments);
      if (data.savings && data.savings.length > 0) setSavings(data.savings);

      setConfig((prev) => ({
        ...prev,
        ...data.config,
        appsScriptUrl: url,
        lastSync: new Date().toLocaleTimeString(),
      }));

      setIsSyncing(false);
      return true;
    } catch (err: any) {
      setSyncError(err.message || 'Error de conexión con Google Sheets');
      setIsSyncing(false);
      return false;
    }
  };

  // Agregar Gasto (con subida a Drive y Sheets)
  const addExpense = async (
    expenseData: Omit<Expense, 'id'>,
    receiptBase64?: string,
    receiptFilename?: string
  ) => {
    const id = generateId();
    const newExpense: Expense = {
      ...expenseData,
      id,
      receiptBase64: receiptBase64 ? receiptBase64 : undefined,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Flujo 1: Si está conectado con Google OAuth directo
    if (googleUser && config.googleSpreadsheetId) {
      setIsSyncing(true);
      try {
        let driveUrl = '';
        if (receiptBase64 && config.googleDriveFolderId) {
          driveUrl = await uploadReceiptToDriveDirect(
            googleUser.accessToken,
            config.googleDriveFolderId,
            receiptBase64,
            receiptFilename
          );
        }

        await appendExpenseDirect(
          googleUser.accessToken,
          config.googleSpreadsheetId,
          newExpense,
          driveUrl
        );

        if (driveUrl) {
          setExpenses((prev) =>
            prev.map((e) => (e.id === id ? { ...e, receiptUrl: driveUrl } : e))
          );
        }
      } catch (err) {
        console.warn('Error guardando en Google Sheets directo:', err);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    // Flujo 2: Vía Google Apps Script si está configurado
    if (config.appsScriptUrl) {
      setIsSyncing(true);
      try {
        const res = await postExpenseToSheet(
          config.appsScriptUrl,
          newExpense,
          receiptBase64,
          receiptFilename
        );
        if (res.receiptUrl) {
          setExpenses((prev) =>
            prev.map((e) => (e.id === id ? { ...e, receiptUrl: res.receiptUrl } : e))
          );
        }
      } catch (err: any) {
        console.warn('Gasto guardado localmente:', err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Eliminar Gasto
  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (config.appsScriptUrl) {
      try {
        await deleteRowFromSheet(config.appsScriptUrl, 'Gastos', id);
      } catch {}
    }
  };

  // Agregar Ingreso
  const addIncome = async (incomeData: Omit<Income, 'id'>) => {
    const id = generateId();
    const newIncome: Income = { ...incomeData, id };
    setIncomes((prev) => [newIncome, ...prev]);
  };

  // Eliminar Ingreso
  const deleteIncome = async (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  // Agregar Inversión
  const addInvestment = async (investmentData: Omit<Investment, 'id'>) => {
    const id = generateId();
    const newInvestment: Investment = { ...investmentData, id };
    setInvestments((prev) => [newInvestment, ...prev]);

    if (googleUser && config.googleSpreadsheetId) {
      try {
        await appendInvestmentDirect(googleUser.accessToken, config.googleSpreadsheetId, newInvestment);
      } catch {}
      return;
    }

    if (config.appsScriptUrl) {
      try {
        await postInvestmentToSheet(config.appsScriptUrl, newInvestment);
      } catch {}
    }
  };

  // Eliminar Inversión
  const deleteInvestment = async (id: string) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    if (config.appsScriptUrl) {
      try {
        await deleteRowFromSheet(config.appsScriptUrl, 'Inversiones', id);
      } catch {}
    }
  };

  // Agregar Meta de Ahorro
  const addSavingsGoal = async (goalData: Omit<SavingsGoal, 'id'>) => {
    const id = generateId();
    const newGoal: SavingsGoal = { ...goalData, id };
    setSavings((prev) => [...prev, newGoal]);

    if (googleUser && config.googleSpreadsheetId) {
      try {
        await appendSavingsDirect(googleUser.accessToken, config.googleSpreadsheetId, newGoal);
      } catch {}
      return;
    }

    if (config.appsScriptUrl) {
      try {
        await postSavingsToSheet(config.appsScriptUrl, newGoal);
      } catch {}
    }
  };

  // Actualizar monto de meta de ahorro
  const updateSavingsAmount = async (id: string, newAmount: number) => {
    let updatedGoal: SavingsGoal | undefined;
    setSavings((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          updatedGoal = { ...s, currentAmount: newAmount };
          return updatedGoal;
        }
        return s;
      })
    );

    if (config.appsScriptUrl && updatedGoal) {
      try {
        await postSavingsToSheet(config.appsScriptUrl, updatedGoal);
      } catch {}
    }
  };

  // Eliminar Meta de Ahorro
  const deleteSavingsGoal = async (id: string) => {
    setSavings((prev) => prev.filter((s) => s.id !== id));
    if (config.appsScriptUrl) {
      try {
        await deleteRowFromSheet(config.appsScriptUrl, 'Ahorros', id);
      } catch {}
    }
  };

  // Actualizar configuración
  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);

    if (config.appsScriptUrl) {
      try {
        await postConfigToSheet(config.appsScriptUrl, newConfig);
      } catch {}
    }

    if (googleUser?.accessToken && config.googleSpreadsheetId) {
      try {
        await updateConfigDirect(googleUser.accessToken, config.googleSpreadsheetId, merged);
      } catch (err) {
        console.warn('Error guardando configuración directa en Google Sheets:', err);
      }
    }
  };

  // Exportar respaldo JSON
  const exportDataJson = () => {
    const payload = {
      expenses,
      incomes,
      investments,
      savings,
      config,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastonapp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar respaldo JSON
  const importDataJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (Array.isArray(parsed.incomes)) setIncomes(parsed.incomes);
      if (Array.isArray(parsed.investments)) setInvestments(parsed.investments);
      if (Array.isArray(parsed.savings)) setSavings(parsed.savings);
      if (parsed.config) setConfig((prev) => ({ ...prev, ...parsed.config }));
      return true;
    } catch {
      return false;
    }
  };

  const [telegramBotStatus, setTelegramBotStatus] = useState<
    'connected' | 'disconnected' | 'connecting' | 'error'
  >('disconnected');
  const [telegramBotError, setTelegramBotError] = useState<string | null>(null);

  const connectTelegramBot = async (customToken?: string): Promise<boolean> => {
    const token = (customToken || config.telegramBotToken || '').trim();
    if (!token) {
      setTelegramBotStatus('error');
      setTelegramBotError('Ingresa el token provisto por @BotFather.');
      return false;
    }

    setTelegramBotStatus('connecting');
    setTelegramBotError(null);

    await startBrowserTelegramBot(token, {
      getExpenses: () => expenses,
      getIncomes: () => incomes,
      getSavings: () => savings,
      getMonthlyIncome: () => config.monthlyIncome,
      getCurrency: () => config.currency,
      addExpense: async (exp, base64, filename) => {
        await addExpense(exp, base64, filename);
      },
      addIncome: async (inc) => {
        await addIncome(inc);
      },
      askAdvisor: async (query: string) => {
        return await askFinancialAdvisor(query, [], expenses, savings, investments, config, incomes, googleUser);
      },
      onStatusChange: (status, errMsg) => {
        setTelegramBotStatus(status);
        if (errMsg) setTelegramBotError(errMsg);
      },
    });

    if (customToken && customToken !== config.telegramBotToken) {
      await updateConfig({ telegramBotToken: customToken });
    }

    return true;
  };

  const disconnectTelegramBot = () => {
    stopBrowserTelegramBot();
    setTelegramBotStatus('disconnected');
  };

  // Conectar automaticamente si ya hay token guardado
  useEffect(() => {
    if (config.telegramBotToken && config.telegramBotToken.trim()) {
      connectTelegramBot(config.telegramBotToken.trim());
    }
    return () => {
      stopBrowserTelegramBot();
    };
  }, [config.telegramBotToken]);

  /**
   * Formateo completo de datos:
   * Restablece todos los arreglos (gastos, ingresos, inversiones, ahorros) a vacio
   * y los parametros financieros a cero. Limpia el almacenamiento local.
   */
  const formatAllData = async () => {
    const initialState = getInitialState();

    // 1. Limpieza de estados en memoria
    setExpenses([]);
    setIncomes([]);
    setInvestments([]);
    setSavings([]);
    setConfig(initialState.config);

    // 2. Limpieza de llaves en localStorage
    try {
      localStorage.removeItem(STORAGE_KEY + '_expenses');
      localStorage.removeItem(STORAGE_KEY + '_incomes');
      localStorage.removeItem(STORAGE_KEY + '_investments');
      localStorage.removeItem(STORAGE_KEY + '_savings');
      localStorage.removeItem(STORAGE_KEY + '_config');
      localStorage.removeItem('misfinanzas_data_v1_expenses');
      localStorage.removeItem('misfinanzas_data_v1_incomes');
      localStorage.removeItem('misfinanzas_data_v1_investments');
      localStorage.removeItem('misfinanzas_data_v1_savings');
      localStorage.removeItem('misfinanzas_data_v1_config');
    } catch (e) {
      console.error('Error al formatear localStorage:', e);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        incomes,
        investments,
        savings,
        config,
        googleUser,
        isSyncing,
        syncError,
        loginWithGoogle,
        logoutGoogle,
        syncDirectWithGoogle,
        addExpense,
        deleteExpense,
        addIncome,
        deleteIncome,
        addInvestment,
        deleteInvestment,
        addSavingsGoal,
        updateSavingsAmount,
        deleteSavingsGoal,
        updateConfig,
        syncWithGoogleSheets,
        telegramBotStatus,
        telegramBotError,
        connectTelegramBot,
        disconnectTelegramBot,
        exportDataJson,
        importDataJson,
        formatAllData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe ser utilizado dentro de un FinanceProvider');
  }
  return context;
};
