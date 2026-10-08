export type ExpenseType = 'fijo' | 'variable';

export type ExpenseCategory =
  | 'Vivienda (Alquiler/Hipoteca)'
  | 'Servicios (Luz, Agua, Gas, Internet)'
  | 'Supermercado y Alimentos'
  | 'Salud y Farmacia'
  | 'Transporte y Combustible'
  | 'Educación'
  | 'Mascotas'
  | 'Ocio y Salidas'
  | 'Ropa y Calzado'
  | 'Tecnología y Hogar'
  | 'Suscripciones y Apps'
  | 'Mantenimiento del Hogar'
  | 'Otros Gastos';

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory | string;
  type: ExpenseType;
  amount: number;
  paymentMethod: string;
  receiptUrl?: string; // URL directa en Google Drive
  receiptBase64?: string; // Datos temporales antes de subir
  notes?: string;
}

export type IncomeCategory =
  | 'Sueldo / Salario'
  | 'Honorarios / Freelance'
  | 'Ventas / Negocio'
  | 'Rentas / Alquileres'
  | 'Rendimientos / Inversiones'
  | 'Aguinaldo / Bono'
  | 'Regalo / Extra'
  | 'Otros Ingresos';

export interface Income {
  id: string;
  date: string;
  description: string;
  category: IncomeCategory | string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

export type InvestmentType =
  | 'Plazo Fijo'
  | 'Fondos Comunes / FCI'
  | 'Acciones / CEDEARs'
  | 'Criptomonedas'
  | 'Dólares / Moneda Extranjera'
  | 'Bienes Raíces / Propiedades'
  | 'Otro';

export interface Investment {
  id: string;
  date: string;
  asset: string;
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
  yieldPercent?: number;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  isEmergencyFund: boolean;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  notes?: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  tokenExpiresAt: number;
}

export interface DrivePermission {
  id: string;
  displayName?: string;
  emailAddress?: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  type: 'user' | 'group' | 'domain' | 'anyone';
  photoLink?: string;
}

export interface AppConfig {
  monthlyIncome: number;
  currency: string;
  emergencyFundMinimum: number;
  appsScriptUrl: string; // URL Web App de Google Apps Script (opcional si usa OAuth)
  geminiApiKey?: string; // API Key opcional
  omnirouteBaseUrl?: string; // Endpoint base de Omniroute
  omnirouteApiKey?: string; // API Key de Omniroute
  omnirouteModel?: string; // Modelo de Omniroute (ej: auto/best-fast)
  googleClientId?: string; // Client ID de Google OAuth 2.0
  googleSpreadsheetId?: string; // ID de la hoja en Google Drive
  googleDriveFolderId?: string; // ID de la carpeta de comprobantes en Drive
  telegramBotToken?: string; // Token del bot de Telegram (@BotFather)
  telegramChatId?: string; // Chat ID de Telegram para alertas
  lastSync?: string;
}

export type DecisionVerdict = 'APPROVED' | 'WARNING' | 'REJECTED';

export interface PurchaseEvaluation {
  verdict: DecisionVerdict;
  title: string;
  reason: string;
  tips: string[];
  metrics: {
    purchaseAmount: number;
    monthlyIncome: number;
    currentExpenses: number;
    freeCashFlowBefore: number;
    freeCashFlowAfter: number;
    emergencyFundBalance: number;
    emergencyFundMinimum: number;
    totalSavingsAvailable: number;
  };
}

// ---------------- NUEVOS TIPOS: ASIGNADOR DE FONDOS ----------------
export interface CategoryGap {
  id: string;
  name: string;
  type: 'emergency_fund' | 'savings_goal' | 'essential_expenses';
  currentAmount: number;
  targetAmount: number;
  deficit: number;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
}

export interface FundAllocationItem {
  targetId: string;
  targetName: string;
  type: 'emergency' | 'goal' | 'buffer';
  suggestedAmount: number;
  percentage: number;
  reason: string;
}

export interface AllocationProposal {
  availableToAllocate: number;
  totalDeficit: number;
  items: FundAllocationItem[];
  summaryMessage: string;
}

// ---------------- NUEVOS TIPOS: CALCULADORA DE CONFORT ----------------
export interface ComfortLevel {
  id: 'survival' | 'security' | 'comfort_golden' | 'abundance';
  name: string;
  subtitle: string;
  targetIncome: number;
  gapFromCurrent: number; // targetIncome - monthlyIncome
  achievedPercent: number; // (monthlyIncome / targetIncome) * 100
  breakdown: {
    essentials: number; // 50%
    lifestyle: number; // 30%
    savingsInvestment: number; // 20%
  };
  benefits: string[];
  isCurrentStatus: boolean;
}

export interface ComfortAnalysis {
  monthlyIncome: number;
  essentialNeeds: number; // Gastos fijos esenciales reales
  currentComfortPercent: number;
  levels: ComfortLevel[];
  goldenRuleRecommendation: {
    idealMonthlyIncome: number;
    gapToGoldenComfort: number;
    howToReachTips: string[];
  };
}

// ---------------- NUEVOS TIPOS: CHAT CON LLM ----------------
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}
