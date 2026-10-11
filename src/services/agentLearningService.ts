import type { ExpenseCategory, IncomeCategory } from '../types/finance';

export interface LearnedRule {
  id: string;
  pattern: string; // Ej: 'farmacity', 'shell', 'delivery'
  type: 'category' | 'alias' | 'behavior';
  target: string; // Ej: 'Salud y Farmacia', 'Transporte y Combustible'
  createdDate: string;
  reason?: string;
}

export interface AgentActionLog {
  id: string;
  type: 'expense' | 'income' | 'savings_goal' | 'investment';
  entityId: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  rawPrompt?: string;
  timestamp: number;
}

export interface AgentMemory {
  learnedRules: LearnedRule[];
  actionHistory: AgentActionLog[];
  userPreferences: Record<string, string>;
}

const STORAGE_KEY = 'gastonapp_agent_memory_v1';

// Mapeos semánticos base (vocabulario argentino y cotidiano)
const BUILTIN_CATEGORY_DICTIONARY: { pattern: string; category: ExpenseCategory }[] = [
  // Supermercado y Alimentos
  { pattern: 'super', category: 'Supermercado y Alimentos' },
  { pattern: 'coto', category: 'Supermercado y Alimentos' },
  { pattern: 'carrefour', category: 'Supermercado y Alimentos' },
  { pattern: 'dia', category: 'Supermercado y Alimentos' },
  { pattern: 'jumbo', category: 'Supermercado y Alimentos' },
  { pattern: 'disco', category: 'Supermercado y Alimentos' },
  { pattern: 'chino', category: 'Supermercado y Alimentos' },
  { pattern: 'verduleria', category: 'Supermercado y Alimentos' },
  { pattern: 'verdulería', category: 'Supermercado y Alimentos' },
  { pattern: 'carniceria', category: 'Supermercado y Alimentos' },
  { pattern: 'carnicería', category: 'Supermercado y Alimentos' },
  { pattern: 'panaderia', category: 'Supermercado y Alimentos' },
  { pattern: 'panadería', category: 'Supermercado y Alimentos' },
  { pattern: 'almacen', category: 'Supermercado y Alimentos' },
  { pattern: 'almacén', category: 'Supermercado y Alimentos' },
  { pattern: 'comida', category: 'Supermercado y Alimentos' },
  { pattern: 'alimento', category: 'Supermercado y Alimentos' },
  { pattern: 'mercaderia', category: 'Supermercado y Alimentos' },
  { pattern: 'mercadería', category: 'Supermercado y Alimentos' },

  // Salud y Farmacia
  { pattern: 'farmacity', category: 'Salud y Farmacia' },
  { pattern: 'farmacia', category: 'Salud y Farmacia' },
  { pattern: 'remedio', category: 'Salud y Farmacia' },
  { pattern: 'medicamento', category: 'Salud y Farmacia' },
  { pattern: 'medico', category: 'Salud y Farmacia' },
  { pattern: 'médico', category: 'Salud y Farmacia' },
  { pattern: 'dentista', category: 'Salud y Farmacia' },
  { pattern: 'odontologo', category: 'Salud y Farmacia' },
  { pattern: 'osde', category: 'Salud y Farmacia' },
  { pattern: 'swiss medical', category: 'Salud y Farmacia' },
  { pattern: 'galeno', category: 'Salud y Farmacia' },
  { pattern: 'prepaga', category: 'Salud y Farmacia' },
  { pattern: 'optica', category: 'Salud y Farmacia' },
  { pattern: 'óptica', category: 'Salud y Farmacia' },

  // Transporte y Combustible
  { pattern: 'nafta', category: 'Transporte y Combustible' },
  { pattern: 'combustible', category: 'Transporte y Combustible' },
  { pattern: 'gasoil', category: 'Transporte y Combustible' },
  { pattern: 'gnc', category: 'Transporte y Combustible' },
  { pattern: 'ypf', category: 'Transporte y Combustible' },
  { pattern: 'shell', category: 'Transporte y Combustible' },
  { pattern: 'axion', category: 'Transporte y Combustible' },
  { pattern: 'puma', category: 'Transporte y Combustible' },
  { pattern: 'sube', category: 'Transporte y Combustible' },
  { pattern: 'subte', category: 'Transporte y Combustible' },
  { pattern: 'colectivo', category: 'Transporte y Combustible' },
  { pattern: 'bondi', category: 'Transporte y Combustible' },
  { pattern: 'uber', category: 'Transporte y Combustible' },
  { pattern: 'cabify', category: 'Transporte y Combustible' },
  { pattern: 'didi', category: 'Transporte y Combustible' },
  { pattern: 'peaje', category: 'Transporte y Combustible' },
  { pattern: 'estacionamiento', category: 'Transporte y Combustible' },
  { pattern: 'cochera', category: 'Transporte y Combustible' },

  // Vivienda y Servicios
  { pattern: 'alquiler', category: 'Vivienda (Alquiler/Hipoteca)' },
  { pattern: 'hipoteca', category: 'Vivienda (Alquiler/Hipoteca)' },
  { pattern: 'luz', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'edenor', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'edesur', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'gas', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'metrogas', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'naturgy', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'agua', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'aysa', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'internet', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'fibertel', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'flow', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'telecentro', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'personal', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'movistar', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'claro', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'expensas', category: 'Vivienda (Alquiler/Hipoteca)' },
  { pattern: 'abl', category: 'Servicios (Luz, Agua, Gas, Internet)' },
  { pattern: 'rentas', category: 'Servicios (Luz, Agua, Gas, Internet)' },

  // Ocio, Salidas y Restaurantes
  { pattern: 'asado', category: 'Ocio y Salidas' },
  { pattern: 'birra', category: 'Ocio y Salidas' },
  { pattern: 'cerveza', category: 'Ocio y Salidas' },
  { pattern: 'bar', category: 'Ocio y Salidas' },
  { pattern: 'restaurante', category: 'Ocio y Salidas' },
  { pattern: 'resto', category: 'Ocio y Salidas' },
  { pattern: 'delivery', category: 'Ocio y Salidas' },
  { pattern: 'pedidosya', category: 'Ocio y Salidas' },
  { pattern: 'rappi', category: 'Ocio y Salidas' },
  { pattern: 'mcdonald', category: 'Ocio y Salidas' },
  { pattern: 'burger', category: 'Ocio y Salidas' },
  { pattern: 'cine', category: 'Ocio y Salidas' },
  { pattern: 'teatro', category: 'Ocio y Salidas' },
  { pattern: 'recital', category: 'Ocio y Salidas' },
  { pattern: 'entradas', category: 'Ocio y Salidas' },
  { pattern: 'boliche', category: 'Ocio y Salidas' },
  { pattern: 'cafeteria', category: 'Ocio y Salidas' },
  { pattern: 'cafetería', category: 'Ocio y Salidas' },
  { pattern: 'cafe', category: 'Ocio y Salidas' },
  { pattern: 'café', category: 'Ocio y Salidas' },
  { pattern: 'heladeria', category: 'Ocio y Salidas' },
  { pattern: 'heladería', category: 'Ocio y Salidas' },
  { pattern: 'helado', category: 'Ocio y Salidas' },

  // Suscripciones y Apps
  { pattern: 'netflix', category: 'Suscripciones y Apps' },
  { pattern: 'spotify', category: 'Suscripciones y Apps' },
  { pattern: 'youtube', category: 'Suscripciones y Apps' },
  { pattern: 'disney', category: 'Suscripciones y Apps' },
  { pattern: 'max', category: 'Suscripciones y Apps' },
  { pattern: 'hbo', category: 'Suscripciones y Apps' },
  { pattern: 'prime video', category: 'Suscripciones y Apps' },
  { pattern: 'chatgpt', category: 'Suscripciones y Apps' },
  { pattern: 'icloud', category: 'Suscripciones y Apps' },
  { pattern: 'google one', category: 'Suscripciones y Apps' },

  // Mascotas
  { pattern: 'veterinaria', category: 'Mascotas' },
  { pattern: 'veterinario', category: 'Mascotas' },
  { pattern: 'perro', category: 'Mascotas' },
  { pattern: 'gato', category: 'Mascotas' },
  { pattern: 'pet shop', category: 'Mascotas' },
  { pattern: 'alimento perro', category: 'Mascotas' },
  { pattern: 'alimento gato', category: 'Mascotas' },

  // Ropa y Calzado
  { pattern: 'zapatilla', category: 'Ropa y Calzado' },
  { pattern: 'zapato', category: 'Ropa y Calzado' },
  { pattern: 'remera', category: 'Ropa y Calzado' },
  { pattern: 'pantalon', category: 'Ropa y Calzado' },
  { pattern: 'pantalón', category: 'Ropa y Calzado' },
  { pattern: 'campera', category: 'Ropa y Calzado' },
  { pattern: 'buzo', category: 'Ropa y Calzado' },
  { pattern: 'ropa', category: 'Ropa y Calzado' },
  { pattern: 'indumentaria', category: 'Ropa y Calzado' },
  { pattern: 'tienda', category: 'Ropa y Calzado' },

  // Tecnología y Hogar
  { pattern: 'tecnologia', category: 'Tecnología y Hogar' },
  { pattern: 'celular', category: 'Tecnología y Hogar' },
  { pattern: 'computadora', category: 'Tecnología y Hogar' },
  { pattern: 'monitor', category: 'Tecnología y Hogar' },
  { pattern: 'mouse', category: 'Tecnología y Hogar' },
  { pattern: 'teclado', category: 'Tecnología y Hogar' },
  { pattern: 'auriculares', category: 'Tecnología y Hogar' },
  { pattern: 'playstation', category: 'Tecnología y Hogar' },
  { pattern: 'xbox', category: 'Tecnología y Hogar' },
  { pattern: 'cable', category: 'Tecnología y Hogar' },

  // Mantenimiento del Hogar
  { pattern: 'ferreteria', category: 'Mantenimiento del Hogar' },
  { pattern: 'ferretería', category: 'Mantenimiento del Hogar' },
  { pattern: 'plomero', category: 'Mantenimiento del Hogar' },
  { pattern: 'electricista', category: 'Mantenimiento del Hogar' },
  { pattern: 'pintura', category: 'Mantenimiento del Hogar' },
  { pattern: 'arreglo', category: 'Mantenimiento del Hogar' },
  { pattern: 'easy', category: 'Mantenimiento del Hogar' },
  { pattern: 'sodimac', category: 'Mantenimiento del Hogar' },
];

/**
 * Obtiene la memoria persistida del agente
 */
export function getAgentMemory(): AgentMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        learnedRules: Array.isArray(parsed.learnedRules) ? parsed.learnedRules : [],
        actionHistory: Array.isArray(parsed.actionHistory) ? parsed.actionHistory : [],
        userPreferences: parsed.userPreferences || {},
      };
    }
  } catch (err) {
    console.warn('Error leyendo memoria del agente:', err);
  }
  return {
    learnedRules: [],
    actionHistory: [],
    userPreferences: {},
  };
}

/**
 * Guarda la memoria del agente en almacenamiento local
 */
export function saveAgentMemory(memory: AgentMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (err) {
    console.warn('Error guardando memoria del agente:', err);
  }
}

/**
 * Registra una acción ejecutada en el historial del agente
 */
export function recordAgentAction(action: Omit<AgentActionLog, 'id' | 'timestamp'>): AgentActionLog {
  const memory = getAgentMemory();
  const entry: AgentActionLog = {
    ...action,
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
  };

  // Mantener las últimas 25 acciones para permitir deshacer/corregir
  memory.actionHistory.unshift(entry);
  if (memory.actionHistory.length > 25) {
    memory.actionHistory = memory.actionHistory.slice(0, 25);
  }

  saveAgentMemory(memory);
  return entry;
}

/**
 * Obtiene la última acción ejecutada
 */
export function getLastAgentAction(): AgentActionLog | null {
  const memory = getAgentMemory();
  return memory.actionHistory[0] || null;
}

/**
 * Elimina y retorna la última acción ejecutada (deshacer)
 */
export function popLastAgentAction(): AgentActionLog | null {
  const memory = getAgentMemory();
  if (memory.actionHistory.length === 0) return null;
  const popped = memory.actionHistory.shift()!;
  saveAgentMemory(memory);
  return popped;
}

/**
 * Agrega una regla aprendida (evita duplicados exactos)
 */
export function addLearnedRule(
  pattern: string,
  target: string,
  type: 'category' | 'alias' | 'behavior' = 'category',
  reason?: string
): LearnedRule {
  const memory = getAgentMemory();
  const cleanPattern = pattern.trim().toLowerCase();

  // Si ya existía una regla para este patrón, actualizar su target
  const existingIdx = memory.learnedRules.findIndex(
    (r) => r.pattern.toLowerCase() === cleanPattern && r.type === type
  );

  const rule: LearnedRule = {
    id: 'rule_' + Date.now(),
    pattern: cleanPattern,
    target,
    type,
    createdDate: new Date().toISOString(),
    reason,
  };

  if (existingIdx >= 0) {
    memory.learnedRules[existingIdx] = rule;
  } else {
    memory.learnedRules.unshift(rule);
  }

  saveAgentMemory(memory);
  return rule;
}

/**
 * Infiere de manera inteligente la categoría de un concepto
 * 1. Prioridad MÁXIMA: Reglas aprendidas del usuario
 * 2. Prioridad MEDIA: Diccionario semántico incorporado
 * 3. Fallback: 'Otros Gastos'
 */
export function inferExpenseCategory(concept: string, fallback: ExpenseCategory = 'Otros Gastos'): ExpenseCategory {
  const clean = concept.trim().toLowerCase();
  const memory = getAgentMemory();

  // 1. Buscar en reglas aprendidas
  for (const rule of memory.learnedRules) {
    if (rule.type === 'category' && clean.includes(rule.pattern.toLowerCase())) {
      return rule.target as ExpenseCategory;
    }
  }

  // 2. Buscar en diccionario semántico incorporado
  for (const entry of BUILTIN_CATEGORY_DICTIONARY) {
    if (clean.includes(entry.pattern.toLowerCase())) {
      return entry.category;
    }
  }

  return fallback;
}

/**
 * Infiere la categoría de un ingreso
 */
export function inferIncomeCategory(concept: string, fallback: IncomeCategory = 'Otros Ingresos'): IncomeCategory {
  const clean = concept.trim().toLowerCase();

  if (clean.includes('sueldo') || clean.includes('salario') || clean.includes('recibo') || clean.includes('quincena')) {
    return 'Sueldo / Salario';
  }
  if (clean.includes('freelance') || clean.includes('honorario') || clean.includes('changa') || clean.includes('cliente') || clean.includes('proyecto')) {
    return 'Honorarios / Freelance';
  }
  if (clean.includes('venta') || clean.includes('negocio') || clean.includes('local') || clean.includes('comercio')) {
    return 'Ventas / Negocio';
  }
  if (clean.includes('alquiler') || clean.includes('renta')) {
    return 'Rentas / Alquileres';
  }
  if (clean.includes('interes') || clean.includes('rendimiento') || clean.includes('dividendo') || clean.includes('plazo fijo')) {
    return 'Rendimientos / Inversiones';
  }
  if (clean.includes('aguinaldo') || clean.includes('bono') || clean.includes('premio')) {
    return 'Aguinaldo / Bono';
  }
  if (clean.includes('regalo') || clean.includes('prestamo') || clean.includes('devolucion')) {
    return 'Regalo / Extra';
  }

  return fallback;
}

/**
 * Aprende a partir de una corrección explícita del usuario
 */
export function extractLearningFromCorrection(userMessage: string, lastAction?: AgentActionLog | null): LearnedRule | null {
  const text = userMessage.toLowerCase().trim();

  const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
    'Vivienda (Alquiler/Hipoteca)',
    'Servicios (Luz, Agua, Gas, Internet)',
    'Supermercado y Alimentos',
    'Salud y Farmacia',
    'Transporte y Combustible',
    'Educación',
    'Mascotas',
    'Ocio y Salidas',
    'Ropa y Calzado',
    'Tecnología y Hogar',
    'Suscripciones y Apps',
    'Mantenimiento del Hogar',
    'Otros Gastos',
  ];

  let detectedCategory: ExpenseCategory | null = null;

  for (const cat of ALL_EXPENSE_CATEGORIES) {
    const simplified = cat.toLowerCase().split('(')[0].trim();
    if (text.includes(simplified) || (simplified.includes('/') && simplified.split('/').some((part) => text.includes(part.trim())))) {
      detectedCategory = cat;
      break;
    }
  }

  if (!detectedCategory) {
    if (text.includes('comida') || text.includes('super') || text.includes('alimento')) {
      detectedCategory = 'Supermercado y Alimentos';
    } else if (text.includes('farmacia') || text.includes('salud') || text.includes('remedio')) {
      detectedCategory = 'Salud y Farmacia';
    } else if (text.includes('transporte') || text.includes('nafta') || text.includes('combustible')) {
      detectedCategory = 'Transporte y Combustible';
    } else if (text.includes('salida') || text.includes('ocio') || text.includes('restaurante')) {
      detectedCategory = 'Ocio y Salidas';
    } else if (text.includes('ropa') || text.includes('calzado')) {
      detectedCategory = 'Ropa y Calzado';
    } else if (text.includes('servicio') || text.includes('luz') || text.includes('gas')) {
      detectedCategory = 'Servicios (Luz, Agua, Gas, Internet)';
    }
  }

  if (detectedCategory) {
    if (lastAction && lastAction.description) {
      const keyword = lastAction.description.trim().toLowerCase();
      return addLearnedRule(
        keyword,
        detectedCategory,
        'category',
        `Corregido por el usuario en acción previa (${lastAction.description})`
      );
    }

    const explicitPatternMatch = text.match(/(?:aprend[eé]|record[aá]|anot[aá]|siempre que diga|cuando diga)\s+(?:que\s+)?([a-z0-9áéíóúñ]+)/i);
    if (explicitPatternMatch) {
      const keyword = explicitPatternMatch[1].trim().toLowerCase();
      return addLearnedRule(
        keyword,
        detectedCategory,
        'category',
        `Instrucción explícita del usuario: "${userMessage}"`
      );
    }
  }

  return null;
}

/**
 * Resumen de memoria aprendida para inyectar al prompt del LLM
 */
export function getLearnedRulesPrompt(): string {
  const memory = getAgentMemory();
  if (memory.learnedRules.length === 0) {
    return 'No hay reglas personalizadas aprendidas aún.';
  }

  return memory.learnedRules
    .slice(0, 15)
    .map((r) => `- Cuando el usuario mencione "${r.pattern}": clasificar en "${r.target}"`)
    .join('\n');
}
