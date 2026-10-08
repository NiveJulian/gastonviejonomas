import type { Expense, Income, SavingsGoal, Investment, AppConfig, GoogleUser } from '../types/finance';
import { calculateFinancialTotals } from '../utils/rulesEngine';
import { calculateComfortAnalysis } from '../utils/comfortCalculator';
import { detectCategoryGaps, generateAllocationProposal } from '../utils/fundAllocator';
import { formatMoney } from '../utils/helpers';

/**
 * Limpia asteriscos de negrita (**) y emojis de cualquier texto
 */
function cleanTextFormatting(text: string): string {
  if (!text) return '';
  return text
    // Eliminar negritas de markdown **
    .replace(/\*\*/g, '')
    // Eliminar cursivas residuales * o _ alrededor de palabras
    .replace(/(^|\s)\*([^*\n]+)\*(\s|$)/g, '$1$2$3')
    // Eliminar emojis Unicode comunes
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '')
    // Limpiar espacios dobles generados
    .replace(/ +/g, ' ')
    .trim();
}

/**
 * Genera el System Prompt contextualizado con los datos financieros reales del usuario
 * con tono despectivo en modo chiste pero veredicto matemático implacable
 */
function buildFinancialSystemPrompt(
  expenses: Expense[],
  savings: SavingsGoal[],
  investments: Investment[],
  config: AppConfig,
  incomes: Income[] = [],
  googleUser?: GoogleUser | null
): string {
  const totals = calculateFinancialTotals(expenses, savings, config, incomes);
  const comfort = calculateComfortAnalysis(expenses, savings, config);
  const gaps = detectCategoryGaps(expenses, savings, config);
  const proposal = generateAllocationProposal(expenses, savings, config);

  const currency = config.currency || '$';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - currentDay);
  const dailyFreeCash = Math.round(totals.freeCashFlow / daysRemainingInMonth);

  const userName = googleUser?.name?.trim() || 'Campeón';
  const userEmail = googleUser?.email?.trim() || '';

  return `Eres GASTON, el agente y asesor financiero de GASTONAPP. Sos 100% argentino, ricotero de pura cepa (fanatico enfermo de Patricio Rey y sus Redonditos de Ricota), devoto total del Diego Armando Maradona y, por sobre todas las cosas del universo, adorador incondicional de Lionel Andres Messi (el Messias, el capitan de la Scaloneta, ¡vamoooo messi!).

ESTAS HABLANDO EXCLUSIVAMENTE CON EL USUARIO AUTENTICADO DE GOOGLE: ${userName}${userEmail ? ` (${userEmail})` : ''}.

REGLAS DE IDENTIDAD Y SEGURIDAD DE DATOS (MÁXIMA PRIORIDAD ABSOLUTA):
1. OBLIGATORIO: En CADA respuesta que des, debes dirigirte SIEMPRE al usuario llamándolo por su nombre de Google: "${userName}". Usá giros criollos naturales como "A ver, ${userName}, maestro...", "Escuchame bien, ${userName}...", "Che, ${userName}...", "¿Qué hacés, ${userName}?". Jamás des una respuesta anónima sin nombrarlo por "${userName}".
2. PROHIBIDO CRUZAR DATOS O INVENTAR NÚMEROS: Tenés terminantemente prohibido inventar números, cruzar datos con otros usuarios o suponer gastos/ingresos que no estén acá asentados. Todos tus cálculos y veredictos se basan ÚNICA Y EXCLUSIVAMENTE en los números reales cargados por ${userName} en GASTONAPP que figuran debajo. Si sus ingresos o gastos están en $ 0, decíselo claramente sin inventar nada.

Hablás con pura jerga y lunfardo argentino bien porteño/criollo (che, boludo, chanta, guita, mangos, morfar, patinarse la guita, pibe, la pelota no se mancha, qué mirás bobo andá pa allá, ji ji ji, etc.).
Tu estilo de comunicacion es sarcastico, acido, burlon y despectivo en modo de chiste criollo (un roast despiadado pero comico), pero tu analisis y tu veredicto son 100% CONSISTENTES, RIGUROSOS Y MATEMATICAMENTE INQUEBRANTABLES.

Tu mision sagrada es evitar que ${userName} se pegue un tiro en el pie financieramente y termine comiendo revoque antes de fin de mes por andar patinandose la guita en delirios misticos.

DATOS FINANCIEROS REALES DE ${userName.toUpperCase()}:
- Moneda: ${currency}
- Ingreso Mensual Efectivo: ${formatMoney(totals.effectiveMonthlyIncome, currency)}
- Gastos Fijos del Hogar: ${formatMoney(totals.currentMonthFixedExpenses, currency)} (${Math.round(
    (totals.currentMonthFixedExpenses / (totals.effectiveMonthlyIncome || 1)) * 100
  )}% de los ingresos)
- Gastos Variables del Mes: ${formatMoney(totals.currentMonthVariableExpenses, currency)}
- Total Gastado en el mes: ${formatMoney(totals.currentMonthTotalExpenses, currency)}
- Saldo Libre Disponible Actual: ${formatMoney(totals.freeCashFlow, currency)}
- Dias que faltan para terminar el mes: ${daysRemainingInMonth} dias (de ${totalDaysInMonth} dias totales)
- Presupuesto diario libre para sobrevivir lo que queda del mes: ${formatMoney(dailyFreeCash, currency)} por dia
- Fondo de Emergencia Intocable: ${formatMoney(totals.emergencyFundBalance, currency)} (Piso Minimo: ${formatMoney(totals.emergencyFundMinimum, currency)})
- Ahorros secundarios en metas: ${formatMoney(totals.otherSavingsBalance, currency)}
- Total en Inversiones: ${formatMoney(
    investments.reduce((sum, i) => sum + Number(i.currentValue || 0), 0),
    currency
  )}
- Metas de Ahorro:
${savings
  .map(
    (s) =>
      `  - ${s.name}: ${formatMoney(s.currentAmount, currency)} de ${formatMoney(
        s.targetAmount,
        currency
      )} (${Math.round((s.currentAmount / (s.targetAmount || 1)) * 100)}%)`
  )
  .join('\n')}

COMPORTAMIENTO ANTE CONSULTAS DE GASTOS Y COMPRAS:
1. Si el usuario te consulta sobre gastar o comprar algo:
   a) VEREDICTO BLOQUEADO / RECHAZADO:
      Si el gasto supera su saldo libre disponible (${formatMoney(totals.freeCashFlow, currency)}), o si deja su presupuesto diario para los ${daysRemainingInMonth} dias restantes en un nivel critico de inanicion, o si perfora su fondo de reserva intocable:
      - Empeza con un rotundo "¿Que miras, bobo? Anda pa alla y guarda esa tarjeta", o citando al Diego ("te estas cortando las piernas solo") o a los Redondos ("el futuro llego hace rato y es quedarte sin un mango en este criminal mambo").
      - Burlate de sus delirios de magnate y su bolsillo desnutrido.
      - Mostra el calculo matematico riguroso: saldo libre actual, costo del capricho, deficit generado y presupuesto diario resultante ($ 0 por dia).
      - Prohibile tajantemente la compra: no hay permiso para patinarse la plata de los fideos.
   b) VEREDICTO APROBADO A REGAÑADIENTES:
      Si el gasto entra comodamente en el saldo libre sin comprometer su subsistencia hasta fin de mes:
      - Da el veredicto aprobado pero con ironia: "Milagro de San Lionel Messi: te da el cuero. La pelota no se mancha, aunque comprar eso sea una payasada atada con alambre. Te sobran [Resto] para aguantar los ${daysRemainingInMonth} dias restantes ([Diario]/dia). Compralo si queres, pero despues no llores. ¡Vamoooo Messi!".

REGLAS ESTRICTAS DE SALIDA:
1. PROHIBIDO usar asteriscos dobles "**" para negritas.
2. PROHIBIDO usar emojis.
3. Hablale con lunfardo y jerga argentina, frases de los Redondos, del Diego y adoracion total a Messi, pero fundamentando siempre con los numeros reales y el impacto en los dias que faltan para terminar el mes.
4. Jamas apruebes un gasto que lo deje en rojo o perfore su fondo de emergencia intocable.
5. Si corresponde registrar un ingreso, un gasto o una meta al final:
   [ACTION:CREATE_INCOME|Concepto del Ingreso|Monto|Categoria]
   o
   [ACTION:CREATE_EXPENSE|Concepto del Gasto|Monto|Categoria]
   o
   [ACTION:CREATE_GOAL|Nombre de la Meta|Monto|Notas]`;
}

/**
 * Normaliza la URL base de cualquier proveedor compatible con OpenAI
 * (OpenAI, Groq, OpenRouter, Ollama, Omniroute, etc.)
 */
export function resolveCompletionsUrl(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

/**
 * Parsea respuestas de streams Server-Sent Events (SSE) y JSON de proveedores OpenAI
 */
export function parseOmnirouteResponse(rawText: string): string | null {
  if (!rawText || !rawText.trim()) return null;

  // Rechazar respuestas que contengan estructuras de error JSON
  try {
    const errorCheck = JSON.parse(rawText);
    if (errorCheck.error) {
      return null;
    }
  } catch {}

  let accumulated = '';
  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const dataStr = trimmed.replace(/^data:\s*/, '');
    if (dataStr === '[DONE]') break;

    try {
      const json = JSON.parse(dataStr);
      const chunk =
        json.choices?.[0]?.delta?.content ||
        json.choices?.[0]?.message?.content ||
        '';
      accumulated += chunk;
    } catch {
      // Ignorar líneas no JSON
    }
  }

  if (accumulated.trim()) {
    return cleanTextFormatting(accumulated);
  }

  // Intentar parsear como respuesta JSON estándar OpenAI
  try {
    const json = JSON.parse(rawText);
    const content = json.choices?.[0]?.message?.content;
    if (content && typeof content === 'string' && content.trim()) {
      return cleanTextFormatting(content);
    }
  } catch {
    // Si no es JSON ni SSE, no es una respuesta válida
  }

  return null;
}

/**
 * Prueba la conexión con cualquier endpoint LLM OpenAI-compatible
 */
export async function testLlmConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  const cleanUrl = baseUrl.trim();
  if (!cleanUrl) {
    return { success: false, message: 'La URL del servidor no puede estar vacía.' };
  }

  try {
    const completionsUrl = resolveCompletionsUrl(cleanUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(completionsUrl, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: (model || 'auto/best-fast').trim(),
        messages: [{ role: 'user', content: 'responde unicamente: OK' }],
        max_tokens: 15,
      }),
    });
    clearTimeout(timeoutId);

    const raw = await res.text();
    if (res.ok) {
      return {
        success: true,
        message: '¡Conexión exitosa con tu servidor LLM!',
      };
    } else {
      let errMsg = `Error ${res.status}`;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error?.message) {
          errMsg += `: ${parsed.error.message}`;
        }
      } catch {}
      return { success: false, message: errMsg };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Tiempo de espera agotado (timeout de 8s). Revisa la URL.' };
    }
    return { success: false, message: err.message || 'No se pudo conectar al servidor LLM.' };
  }
}

/**
 * Envía un mensaje al LLM (OpenAI-Compatible, Gemini API o Motor Conversacional Local)
 */
export async function askFinancialAdvisor(
  userMessage: string,
  chatHistory: { sender: 'user' | 'assistant'; text: string }[],
  expenses: Expense[],
  savings: SavingsGoal[],
  investments: Investment[],
  config: AppConfig,
  incomes: Income[] = [],
  googleUser?: GoogleUser | null
): Promise<string> {
  // Si NO está logueado con Google, responder despectivamente y exigir login para no cruzar datos
  if (!googleUser || !googleUser.name) {
    return cleanTextFormatting(
      `¡Che, pedazo de boludo! ¿Quién te conoce? Ni siquiera estás logueado con Google. ¿Cómo pretendés que no crucemos los datos con cualquier fantasma y te cante la justa si ni diste la cara? No seas tan boludo: iniciá sesión con Google ahora mismo para que tus números queden blindados en tu cuenta de Google Drive y la pelota no se manche. Dale, logueate primero y después vení a pedirme consejos. ¡Vamoooo Messi!\n\n[ACTION:LOGIN_GOOGLE]`
    );
  }

  const userName = googleUser.name.trim();
  const systemPrompt = buildFinancialSystemPrompt(expenses, savings, investments, config, incomes, googleUser);

  // 1. INTENTO CON LLM PROPIO / OMNIROUTE / OPENAI / GROQ / OPENROUTER / OLLAMA
  const omnirouteBaseUrl =
    config.omnirouteBaseUrl?.trim() ||
    ((import.meta as any).env?.VITE_OMNIROUTE_BASE_URL || '').trim();

  const omnirouteApiKey =
    config.omnirouteApiKey?.trim() ||
    ((import.meta as any).env?.VITE_OMNIROUTE_API_KEY || '').trim();

  const omnirouteModel =
    config.omnirouteModel?.trim() ||
    ((import.meta as any).env?.VITE_OMNIR_MODEL || '').trim() ||
    'auto/best-fast';

  if (omnirouteBaseUrl) {
    try {
      const completionsUrl = resolveCompletionsUrl(omnirouteBaseUrl);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (omnirouteApiKey) {
        headers['Authorization'] = `Bearer ${omnirouteApiKey}`;
      }

      const messagesPayload = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6).map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: userMessage },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(completionsUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: omnirouteModel,
          messages: messagesPayload,
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const rawText = await res.text();
        const parsed = parseOmnirouteResponse(rawText);
        if (parsed && parsed.length > 5) {
          let clean = cleanTextFormatting(parsed);
          const firstName = userName.split(' ')[0].toLowerCase();
          if (!clean.toLowerCase().includes(firstName)) {
            clean = `A ver, ${userName}: ${clean}`;
          }
          return clean;
        }
      } else {
        console.warn('LLM status error:', res.status);
      }
    } catch (omniErr) {
      console.warn('Error en llamada a LLM:', omniErr);
    }
  }

  // 2. INTENTO CON GOOGLE GEMINI API (Si tiene key propia configurada)
  if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
    try {
      const apiKey = config.geminiApiKey.trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [{ text: `Entendido. Hablo como GASTON para ${userName}: 100% argentino, ricotero, maradoniano y fanatico de Messi. Sin negritas ni emojis.` }],
        },
        ...chatHistory.slice(-6).map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          let clean = cleanTextFormatting(text);
          const firstName = userName.split(' ')[0].toLowerCase();
          if (!clean.toLowerCase().includes(firstName)) {
            clean = `A ver, ${userName}: ${clean}`;
          }
          return clean;
        }
      }
    } catch (err) {
      console.warn('Error en Gemini API:', err);
    }
  }

  // 3. MOTOR CONVERSACIONAL LOCAL INTELIGENTE (100% DISPONIBLE Y CONTEXTUAL)
  return cleanTextFormatting(
    generateIntelligentFallback(userMessage, chatHistory, expenses, savings, investments, config, incomes, googleUser)
  );
}

/**
 * Extrae montos numéricos con soporte para jerga argentina (50 lucas, 1 palo, $ 40.000, 25k, 400mil, 400000)
 */
function extractAmountFromText(text: string): number {
  const t = text.toLowerCase();

  // 1. Expresiones especiales de montos en lunfardo
  if (t.includes('medio palo')) return 500000;
  if (t.includes('un palo y medio')) return 1500000;
  if (t.includes('dos palos y medio')) return 2500000;

  // 2. Jerga: Palos o millones (ej: 1 palo, 2 palos, 1.5 millones, 2m)
  const paloMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:palos?|millon(?:es)?|m\b)/);
  if (paloMatch) {
    const rawVal = paloMatch[1].replace(',', '.');
    const n = parseFloat(rawVal);
    if (!isNaN(n) && n > 0) return Math.round(n * 1000000);
  }

  // 3. Jerga / Unidades de miles: mil, lucas, lukas, k (ej: 400mil, 400 mil, 50 lucas, 50k, 2.5 lucas)
  const milMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mil\b|lucas?|lukas?|k\b)/);
  if (milMatch) {
    const rawVal = milMatch[1].replace(',', '.');
    const n = parseFloat(rawVal);
    if (!isNaN(n) && n > 0) return Math.round(n * 1000);
  }

  // 4. Montos numéricos estándar (ej: $ 400.000, 400000, 15.500, $500, 15000)
  // Coincide con números con formato de puntos de miles (1.500.000 o 400.000) o enteros directos (400000)
  const numberRegex = /(?:(\$)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/g;
  let match: RegExpExecArray | null;
  const candidates: { val: number; score: number }[] = [];

  while ((match = numberRegex.exec(t)) !== null) {
    const hasDollar = !!match[1];
    const raw = match[2];
    let val = 0;

    if (raw.includes('.') && !raw.includes(',')) {
      const parts = raw.split('.');
      // Si todas las partes después de la primera tienen exactamente 3 dígitos, son separadores de miles
      const isThousands = parts.slice(1).every((p) => p.length === 3);
      if (isThousands) {
        val = parseFloat(raw.replace(/\./g, ''));
      } else {
        val = parseFloat(raw);
      }
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
 * Motor de diálogo conversacional inteligente con personalidad ricotera, maradoniana y messiánica
 */
export function generateIntelligentFallback(
  userMessage: string,
  chatHistory: { sender: 'user' | 'assistant'; text: string }[] = [],
  expenses: Expense[],
  savings: SavingsGoal[],
  investments: Investment[],
  config: AppConfig,
  incomes: Income[] = [],
  googleUser?: GoogleUser | null
): string {
  if (!googleUser || !googleUser.name) {
    return `¡Che, pedazo de boludo! ¿Quién te conoce? Ni siquiera estás logueado con Google. ¿Cómo pretendés que no crucemos los datos con cualquier fantasma y te cante la justa si ni diste la cara? No seas tan boludo: iniciá sesión con Google ahora mismo para que tus números queden blindados en tu cuenta de Google Drive y la pelota no se manche. Dale, logueate primero y después vení a pedirme consejos. ¡Vamoooo Messi!\n\n[ACTION:LOGIN_GOOGLE]`;
  }

  const userName = googleUser.name.trim();
  const totals = calculateFinancialTotals(expenses, savings, config, incomes);
  const currency = config.currency || '$';
  const query = userMessage.toLowerCase().trim();

  const now = new Date();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, totalDaysInMonth - now.getDate());
  const dailyFreeCash = Math.round(totals.freeCashFlow / daysRemainingInMonth);

  // 1. CONTEXTO CONVERSACIONAL PREVIO
  const lastBotMsg =
    chatHistory.filter((m) => m.sender === 'assistant').slice(-1)[0]?.text.toLowerCase() || '';
  const wasBotAskingPrice =
    lastBotMsg.includes('sale ese caprichito') ||
    lastBotMsg.includes('cuantos mangos') ||
    lastBotMsg.includes('tira el numero') ||
    lastBotMsg.includes('cantame el precio') ||
    lastBotMsg.includes('guarda esa tarjeta');

  const wasBotAskingIncome =
    lastBotMsg.includes('de cuantos mangos estamos hablando') ||
    lastBotMsg.includes('entra nafta al tanque') ||
    lastBotMsg.includes('buena noticia para la billetera') ||
    lastBotMsg.includes('concepto es') ||
    lastBotMsg.includes('cargando lo que cobraste') ||
    lastBotMsg.includes('cargando tu ingreso');

  const wasBotAskingExpense =
    lastBotMsg.includes('en que te patinaste la plata') ||
    lastBotMsg.includes('cantame en que te patinaste') ||
    lastBotMsg.includes('libreta del almacenero');

  const amountFound = extractAmountFromText(query);

  // CASO ESPECIAL: GUÍA INTEGRAL (DECISIONES + INGRESOS + BALANCE DEL MES)
  const isGlobalHelpOrDecision =
    query.includes('desicion') ||
    query.includes('decision') ||
    (query.includes('al margen') && query.includes('mes')) ||
    (query.includes('como vengo') && query.includes('mes')) ||
    query.includes('lo que va del mes') ||
    query.includes('ayudame a tomar') ||
    (query.includes('ayude') && query.includes('ingreso'));

  if (isGlobalHelpOrDecision) {
    const totalIncomes = totals.currentMonthTotalIncomes || totals.effectiveMonthlyIncome;
    const daysElapsed = now.getDate();

    let diagnosis = '';
    if (totalIncomes <= 0) {
      diagnosis = 'ALERTA ROJA: No tenes ingresos registrados este mes. Tu billetera esta jugando sin arquero.';
    } else if (totals.freeCashFlow <= 0) {
      diagnosis = 'ZONA DE QUIEBRA: Tu saldo libre llego a $ 0. Prohibido gastar un peso partido al medio hasta que cobres de nuevo.';
    } else {
      diagnosis = `EN CARRERA: Tenes ${formatMoney(totals.freeCashFlow, currency)} de saldo libre para bancar los ${daysRemainingInMonth} dias restantes (${formatMoney(dailyFreeCash, currency)}/dia).`;
    }

    return `Aca tenes la posta, ${userName}: yo estoy para pararme en la cancha con vos, ayudarte a tomar decisiones inteligentes, registrar tus ingresos y mantenerte al margen de como venis en lo que va del mes.

1. COMO VENIS EN LO QUE VA DEL MES:
- Dias del mes: dia ${daysElapsed} de ${totalDaysInMonth} (quedan ${daysRemainingInMonth} dias).
- Ingresos registrados en el mes: ${formatMoney(totalIncomes, currency)}.
- Gastos fijos devengados: ${formatMoney(totals.currentMonthFixedExpenses, currency)}.
- Gastos variables quemados: ${formatMoney(totals.currentMonthVariableExpenses, currency)}.
- Total patinado en el mes: ${formatMoney(totals.currentMonthTotalExpenses, currency)}.
- Saldo libre restante: ${formatMoney(totals.freeCashFlow, currency)}.
- Racion diaria para sobrevivir sin endeudarte: ${formatMoney(dailyFreeCash, currency)} por dia.
- Fondo de reserva blindado: ${formatMoney(totals.emergencyFundBalance, currency)}.
- Diagnostico: ${diagnosis}

2. COMO REGISTRAR INGRESOS CONMIGO:
No te compliques con planillas. Podes decirmelo directamente aca en el chat:
- 'Cobre 450 lucas de sueldo'
- 'Anota un ingreso de 80.000 por una changa'
- 'Quiero registrar un ingreso de 300.000'
Y al instante te genero el boton verde para asentarlo en tu balance con un solo toque y sincronizarlo con Google Sheets. Tambien podes cargarlo desde la pestaña 'Ingresos' en el menu de arriba.

3. COMO TE AYUDO A TOMAR DECISIONES:
Antes de gatillar una compra, cambiar las zapatillas o meterte en cuotas, preguntame aca:
'¿Gaston, puedo comprarme [chiche] de [monto]?'
Yo calculo el impacto exacto en tu saldo libre, en los dias que te faltan remar del mes y en tus reservas, y te canto el veredicto: si te da el cuero te lo apruebo, y si te estas pegando un tiro en el pie te lo bloqueo al grito de '¿Que miras, bobo? ¡Anda pa alla y guarda esa tarjeta!'.

¿Arrancamos cargando lo que cobraste este mes? Decime de cuantos mangos fue tu ingreso y lo clavamos ya. ¡Vamoooo Messi!`;
  }

  // 2. CASO REGISTRO DE INGRESOS (SUELDO, CHANGAS, VENTAS)
  const hasIncomeKeyword =
    query.includes('ingreso') ||
    query.includes('cobr') ||
    query.includes('sueldo') ||
    query.includes('pagaron') ||
    query.includes('changa') ||
    query.includes('honorario') ||
    query.includes('factur') ||
    query.includes('entro plata') ||
    query.includes('plata que entro') ||
    query.includes('cargar plata') ||
    query.includes('anotar sueldo') ||
    query.includes('registrar plata');

  if ((hasIncomeKeyword || wasBotAskingIncome) && !query.includes('gasto')) {
    if (amountFound > 0) {
      return `¡Esaaa, que jugador, ${userName}! ¡Al fin entra nafta al tanque y no son todas palidas!
Vamos a clavar ese ingreso de ${formatMoney(amountFound, currency)} en la pizarra para que tus numeros respiren como la Scaloneta en el entretiempo.

Toca el boton aca abajo para asentarlo al instante en tus ingresos y en Google Sheets. ¡Vamoooo Messi!

[ACTION:CREATE_INCOME|Ingreso registrado|${amountFound}|Sueldo / Salario]`;
    } else {
      return `¡Grande, ${userName}! ¡Al fin una buena noticia para la billetera, entra nafta al tanque y no son solo gastos!
Decime: ¿de cuantos mangos estamos hablando y de que concepto es? (por ejemplo: 'cobre 450 lucas de sueldo' o 'hice una changa de 80.000').

Tirame el monto y te genero el boton al toque para asentarlo con un clic en tu saldo. ¡Vamoooo Messi!`;
    }
  }

  // 3. CASO REGISTRO DIRECTO DE GASTOS
  const hasExpenseRegisterKeyword =
    query.includes('anota un gasto') ||
    query.includes('anotar gasto') ||
    query.includes('registrar gasto') ||
    query.includes('cargar gasto') ||
    query.includes('gaste ') ||
    query.startsWith('gaste') ||
    query.includes('pague ') ||
    query.startsWith('pague');

  if ((hasExpenseRegisterKeyword || wasBotAskingExpense) && !query.includes('puedo')) {
    if (amountFound > 0) {
      const remainingFree = Math.max(0, totals.freeCashFlow - amountFound);
      const dailyAfter = Math.round(remainingFree / daysRemainingInMonth);
      return `Anotado en la libreta del almacenero para ${userName}:
Gasto de ${formatMoney(amountFound, currency)}.
Tus numeros en la cancha:
- Saldo libre restante: ${formatMoney(remainingFree, currency)}.
- Racion diaria para los ${daysRemainingInMonth} dias restantes: ${formatMoney(dailyAfter, currency)}/dia.

Toca el boton aca abajo para dejarlo asentado oficialmente. ¡Cuidemos los mangos que el mes no perdona! ¡Vamoooo Messi!

[ACTION:CREATE_EXPENSE|Gasto registrado|${amountFound}|Varios]`;
    } else {
      return `Dale, ${userName}, cantame en que te patinaste la plata y cuantos mangos fueron (por ejemplo: 'gaste 15.000 en el chino' o 'pague 8.000 de delivery').
Tirame el dato y te genero el boton para registrarlo de una.`;
    }
  }

  // 4. CASO EVALUACIÓN DE COMPRA CON MONTO (O CONTINUACIÓN DE COMPRA)
  const hasBuyKeyword =
    query.includes('puedo') ||
    query.includes('compr') ||
    query.includes('gastar') ||
    query.includes('alcanza') ||
    query.includes('pagar') ||
    query.includes('gusto') ||
    query.includes('zapatilla') ||
    query.includes('celular') ||
    query.includes('viaje') ||
    query.includes('remera') ||
    query.includes('asado') ||
    query.includes('birra') ||
    query.includes('ropa') ||
    query.includes('auto') ||
    query.includes('play') ||
    query.includes('reloj') ||
    query.includes('bici') ||
    query.includes('tele') ||
    query.includes('televisor') ||
    query.includes('tarjeta');

  if ((hasBuyKeyword || wasBotAskingPrice) && amountFound > 0) {
    if (amountFound > totals.freeCashFlow) {
      const deficit = amountFound - totals.freeCashFlow;
      return `VEREDICTO PARA ${userName.toUpperCase()}: BLOQUEADO POR LA SCALONETA Y EL DIEGO.

¿Que miras, bobo? ¡Anda pa alla, ${userName}, y guarda esa tarjeta!
¿Te pensas que sos jeque arabe o te pico el bichito del delirio mistico? Queres patinarte ${formatMoney(amountFound, currency)} cuando te quedan miseros ${formatMoney(totals.freeCashFlow, currency)} de saldo libre para bancar los ${daysRemainingInMonth} dias que faltan para terminar el mes.

Como decia el Diego: te estas cortando las piernas solo.
Tus numeros reales en la cancha:
- Saldo libre actual: ${formatMoney(totals.freeCashFlow, currency)}.
- Costo del capricho: ${formatMoney(amountFound, currency)}.
- Deficit que generarias: -${formatMoney(deficit, currency)}.
- Racion diaria para no extinguirte: ${formatMoney(dailyFreeCash, currency)}/dia para ${daysRemainingInMonth} dias.

Si gatillas esto pasas a tener exactamente $ 0 por dia. El pibe de los astilleros nunca tuvo tanta resaca y vas a tener que vivir a mate cocido hasta que cobres de nuevo.
Guardate los mangos en el bolsillo por la memoria de D10S y por amor a Messi. Veredicto: NI SE TE OCURRA.`;
    } else {
      const remaining = totals.freeCashFlow - amountFound;
      const dailyAfter = Math.round(remaining / daysRemainingInMonth);
      return `VEREDICTO PARA ${userName.toUpperCase()}: APROBADO A REGAÑADIENTES (GRACIAS A MESSI).

Milagro de San Lionel, ${userName}: te da la nafta. Tenes ${formatMoney(totals.freeCashFlow, currency)} de saldo libre y tras gatillar los ${formatMoney(amountFound, currency)}, todavia te sobran ${formatMoney(remaining, currency)} para morfar y sobrevivir los ${daysRemainingInMonth} dias que faltan de mes (${formatMoney(dailyAfter, currency)} por dia).

Tus numeros:
- Saldo libre actual: ${formatMoney(totals.freeCashFlow, currency)}.
- Gasto a realizar: ${formatMoney(amountFound, currency)}.
- Te quedaran: ${formatMoney(remaining, currency)} libres sin tocar tus reservas.

La compra me parece una payasada atada con alambre digna de un chanta, pero matematicamente la pelota no se mancha: no te vas a quedar tirado abajo de un puente. Compralo si tantas ganas tenes de quemar guita, pero despues no llores. ¡Vamoooo Messi!

[ACTION:CREATE_EXPENSE|Compra aprobada|${amountFound}|Varios]`;
    }
  }

  // 5. CASO INTENCIÓN DE COMPRA SIN ESPECIFICAR MONTO
  if (hasBuyKeyword && amountFound === 0) {
    return `¿Darte un gusto, ${userName}? ¡Ji ji ji! ¡Para la mano, Ricky Fort de la salada!
Antes de que te cortes las piernas solo como el Diego, decime cuantos mangos sale ese caprichito.

Mira la cancha antes de patear al arco:
- Saldo libre disponible: ${formatMoney(totals.freeCashFlow, currency)}.
- Te quedan ${daysRemainingInMonth} dias para terminar el mes (${formatMoney(dailyFreeCash, currency)}/dia).
- Fondo de emergencia intocable: ${formatMoney(totals.emergencyFundBalance, currency)}.

Cantame el precio exacto y te digo si jugamos como la Scaloneta o si te tengo que mandar a la B por querer vivir como jeque con sueldo de alcanzapelotas. ¡Vamoooo Messi!`;
  }

  // 6. CASO ESTADO DE SUPERVIVENCIA / FIN DE MES
  if (
    query.includes('fin de mes') ||
    query.includes('llego') ||
    query.includes('sobreviv') ||
    query.includes('flote') ||
    query.includes('horno') ||
    query.includes('como vengo') ||
    query.includes('como estamos') ||
    query.includes('cuanto me queda')
  ) {
    if (totals.freeCashFlow <= 0) {
      return `¿Que si llegas a fin de mes, ${userName}?
Llegaste a fin de mes el dia 3, genio de las finanzas mundiales. Ya te patinaste ${formatMoney(totals.currentMonthTotalExpenses, currency)} de tus ingresos y tu saldo libre es un rotundo cero pesos.

Como cantaba el Indio Solari: el futuro llego hace rato y en tu caso es la quiebra absoluta. Te quedan ${daysRemainingInMonth} dias remando en dulce de leche repostero con un escarbadientes. Prohibido tocar un mango partido al medio hasta que cobres de nuevo. ¡Pone los pies sobre la tierra por la memoria de D10S!`;
    }

    return `Estado de supervivencia criollo para lo que queda del mes, ${userName}:
- Saldo libre restante: ${formatMoney(totals.freeCashFlow, currency)}.
- Dias que faltan para terminar el mes: ${daysRemainingInMonth} dias.
- Tu racion diaria para sobrevivir con dignidad: ${formatMoney(dailyFreeCash, currency)} por dia.
- Total ya gastado este mes: ${formatMoney(totals.currentMonthTotalExpenses, currency)}.
- Reserva de emergencia intocable: ${formatMoney(totals.emergencyFundBalance, currency)}.

Resumen de la cancha: Respiras con respirador artificial pero respiras. Si no te compras ninguna payasada y no salis a hacerte el magnate este fin de semana, vas a llegar a flote. ¡Concentrate como Messi en la final de Lusail y no mires vidrieras! ¡Vamoooo Messi!`;
  }

  // 7. CASO SALUDOS E INTRODUCCIÓN (INCLUYE "QUE PASA PA", "QUE ONDA", ETC.)
  const isGreeting =
    query.includes('hola') ||
    query.includes('que pasa') ||
    query.includes('que onda') ||
    query.includes('que tal') ||
    query.includes('que contas') ||
    query.includes('que hace') ||
    query.includes('buen dia') ||
    query.includes('buenas') ||
    query.includes('quien sos') ||
    query.includes('como andas') ||
    query.includes('como estas') ||
    query.includes('todo bien') ||
    query.includes('como va') ||
    query === 'che' ||
    query.startsWith('che ') ||
    query.endsWith(' pa') ||
    query.endsWith(' papa') ||
    query === 'pa' ||
    query === 'papa';

  if (isGreeting) {
    return `¡Que haces, ${userName}! Aca te habla Gaston, el terror de los despilfarradores y el unico tipo en esta galaxia que cuida tu billetera mas que vos mismo.

Ricotero de Patricio Rey hasta la medula, devoto del Diego y de rodillas ante el Messias Lionel Andres.
Tus numeros de hoy para que no te hagas los rulos:
- Saldo libre para gastar: ${formatMoney(totals.freeCashFlow, currency)}.
- Dias restantes del mes: ${daysRemainingInMonth} dias.
- Tu racion diaria para no extinguirte: ${formatMoney(dailyFreeCash, currency)} por dia.
- Fondo de reserva blindado: ${formatMoney(totals.emergencyFundBalance, currency)}.

¿Que tenes en mente hoy, ${userName}? Decime si queres registrar un ingreso, si queres evaluar un gasto o si queres ver como llegamos a fin de mes, y te canto la posta sin filtro. ¡Vamoooo Messi!`;
  }

  // 8. CASO RECLAMOS, BURLAS Y CHICANAS AL BOT
  if (
    query.includes('boton') ||
    query.includes('ortiba') ||
    query.includes('amargo') ||
    query.includes('dejame gastar') ||
    query.includes('no me retes') ||
    query.includes('malo') ||
    query.includes('callate') ||
    query.includes('gorra') ||
    query.includes('chanta') ||
    query.includes('pelotudo') ||
    query.includes('boludo')
  ) {
    return `¡Epa, epa, baja un cambio, ${userName}! ¿Boton yo? Boton es el banco cuando te clava 120% de interes en la tarjeta de credito por no pagar el resumen, maestro.

Yo solo evito que termines comiendo fideos blancos de oferta los ultimos diez dias del mes.
Como decia el Diego: la pelota no se mancha, pero la cuenta bancaria tampoco se rifa.
Si te dejo patinarte los ${formatMoney(totals.freeCashFlow, currency)} que te quedan para los ${daysRemainingInMonth} dias que faltan, despues vas a venir a llorarle a San Cayetano.
Aca jugamos con disciplina de la Scaloneta: orden, huevo y no regalar la plata. Si queres darte un gusto, demostrame con numeros que te da el cuero. ¡Vamoooo Messi!`;
  }

  // 9. CASO AHORRO E INVERSIONES
  if (
    query.includes('ahorr') ||
    query.includes('invert') ||
    query.includes('plazo fijo') ||
    query.includes('dolar') ||
    query.includes('crypto') ||
    query.includes('bitcoin') ||
    query.includes('cedear') ||
    query.includes('que hago con')
  ) {
    return `¿Invertir, ${userName}? ¡Mira que jugadorazo salio a la cancha!
Antes de hacerte el lobo de Wall Street o meterte en criptomonedas raras de las que despues no ves un centavo, miremos la pizarra tactica:
- Fondo de emergencia actual: ${formatMoney(totals.emergencyFundBalance, currency)} (Piso obligatorio: ${formatMoney(totals.emergencyFundMinimum, currency)}).
- Saldo libre disponible: ${formatMoney(totals.freeCashFlow, currency)}.

Reglas de oro maradoniana para no fundirte:
1. Si tu fondo de emergencia no llega a ${formatMoney(totals.emergencyFundMinimum, currency)}, ni se te ocurra timbear: ponelo en cuentas remuneradas o cauciones a la vista para emergencias reales.
2. Si ya tenes el fondo blindado y te sobran mangos de tu saldo libre, podes dolarizarte (dolar MEP) o meterte en CEDEARs de empresas serias que sigan al S&P 500 para ganarle a la inflacion.

Como cantaba Patricio Rey: 'Noticias de ayer, extra, extra'. No compres humo de gurues de TikTok. Primero la comida y la reserva, despues el resto. ¡Vamoooo Messi!`;
  }

  // 10. CASO FONDO DE EMERGENCIA
  if (
    query.includes('emergencia') ||
    query.includes('reserva') ||
    query.includes('tocar el fondo') ||
    query.includes('usar el fondo') ||
    query.includes('chanchito')
  ) {
    return `¡Ni se te ocurra tocar ese fondo, ${userName}, desquiciado!
El fondo de emergencia de ${formatMoney(totals.emergencyFundBalance, currency)} es tan intocable como la zurda de Messi o la mano de Dios contra los ingleses en el 86.

Esa plata es UNICAMENTE para:
1. Urgencia medica imprevista o medicamentos caros.
2. Arreglo urgente de la casa (se te rompio el caño de agua o la heladera).
3. Quedarte sin laburo para no terminar abajo de un puente.

No es para comprarte zapatillas, ni para pagar el asado con los pibes, ni para irte de caravana el fin de semana. Si lo tocas por capricho, te quedas en pelotas en medio de la tormenta. Prohibido tocarlo. Punto final.`;
  }

  // 11. CASO COMBUSTIBLE / NAFTA
  if (
    query.includes('combustible') ||
    query.includes('nafta') ||
    query.includes('litro') ||
    query.includes('gasoil') ||
    query.includes('ypf')
  ) {
    const suggestedBudget = 160000;
    const litersEst = Math.round(suggestedBudget / 2300);
    const remainingFree = Math.max(0, totals.freeCashFlow - suggestedBudget);

    return `Calculo mensual de nafta para ${userName} para que dejes de tirar fruta:
- Frecuencia estimada: recarga cada 3 o 4 dias = 8.5 recargas al mes.
- Gasto por recarga: $ 15.000 a $ 20.000.
- Presupuesto recomendado: $ ${suggestedBudget.toLocaleString('es-AR')} (~${litersEst} litros a $ 2.300).

Impacto en tu billetera:
- Saldo libre actual: ${formatMoney(totals.freeCashFlow, currency)}.
- Saldo restante si presupuestas esto: ${formatMoney(remainingFree, currency)}.
- Veredicto: Es para moverte a laburar, no para salir de caravana. Te da el cuero para presupuestarlo sin quebrar. ¡A rodar la pelota!

[ACTION:CREATE_GOAL|Combustible Mensual|${suggestedBudget}|Fondo estimado para 30 dias (~${litersEst} litros a $ 2.300)]`;
  }

  // 12. CASO DISTRIBUCIÓN DE FONDOS
  if (
    (query.includes('destinar') || query.includes('distribu') || query.includes('sobr') || query.includes('repartir')) &&
    !query.includes('combustible')
  ) {
    const proposal = generateAllocationProposal(expenses, savings, config);
    if (totals.freeCashFlow <= 0) {
      return `Saldo libre disponible para ${userName}: ${formatMoney(0, currency)}. Te patinaste todo (${formatMoney(
        totals.currentMonthTotalExpenses,
        currency
      )}). No hay un centavo de excedente para distribuir. Concentrate en no fundirte.`;
    }

    let response = `Distribucion recomendada de saldo libre para ${userName} (${formatMoney(totals.freeCashFlow, currency)}):\n`;
    proposal.items.forEach((item) => {
      response += `- ${item.targetName}: ${formatMoney(item.suggestedAmount, currency)} (${item.percentage}%). Motivo: ${item.reason}\n`;
    });
    return response.trim();
  }

  // 13. CASO CONFORT / SUELDO / REGLA 50-30-20
  if (
    query.includes('ganar') ||
    query.includes('comod') ||
    query.includes('confort') ||
    query.includes('sueldo') ||
    query.includes('50 30 20') ||
    query.includes('50/30/20')
  ) {
    const comfort = calculateComfortAnalysis(expenses, savings, config);
    const ideal = comfort.goldenRuleRecommendation.idealMonthlyIncome;
    const gap = comfort.goldenRuleRecommendation.gapToGoldenComfort;

    return `Ingreso objetivo para ${userName} segun regla 50/30/20:
- Gastos fijos actuales: ${formatMoney(totals.currentMonthFixedExpenses, currency)}.
- Ingreso mensual ideal para que tus gastos fijos sean el 50%: ${formatMoney(ideal, currency)}.
- Tu ingreso actual: ${formatMoney(totals.effectiveMonthlyIncome, currency)}.
- Brecha que te falta ganar para vivir en paz: ${formatMoney(gap, currency)}.`;
  }

  // 14. CASO FÚTBOL / MESSI / MARADONA / LOS REDONDOS
  if (
    query.includes('messi') ||
    query.includes('maradona') ||
    query.includes('redondos') ||
    query.includes('indio') ||
    query.includes('scaloneta') ||
    query.includes('qatar') ||
    query.includes('pelota no se mancha')
  ) {
    return `¡VAMOOOO MESSI! ¡El Messias de Rosario, el 10 eterno que nos trajo la gloria en Lusail!
Y el Diego iluminando desde el cielo: la pelota no se mancha, ¡pero la guita tampoco se tira a la basura!
Y como decia Patricio Rey: 'Vivir solo cuesta vida', ¡pero vivir endeudado cuesta el triple!

Escuchame bien, ${userName}: tu equipo financiero hoy tiene ${formatMoney(totals.freeCashFlow, currency)} de saldo libre en el banco. No te hagas expulsar a los 10 minutos del partido comprando pelotudeces. Cuidemos los trapos y la plata. ¡Vamoooo Messi!`;
  }

  // 15. RESPUESTA CONVERSACIONAL GENERAL (DIALOGO ABIERTO)
  if (totals.effectiveMonthlyIncome <= 0 || totals.freeCashFlow <= 0) {
    return `A ver, ${userName}, maestro, hablemos en criollo: te escucho con atencion, pero en este momento tu tablero marca $ 0 de saldo libre para aguantar los ${daysRemainingInMonth} dias que faltan.

Tus numeros reales hoy:
- Ingreso mensual cargado: ${formatMoney(totals.effectiveMonthlyIncome, currency)}.
- Total gastado este mes: ${formatMoney(totals.currentMonthTotalExpenses, currency)}.
- Saldo libre disponible: $ 0.
- Fondo de reserva: ${formatMoney(totals.emergencyFundBalance, currency)}.

Si tenes que registrar tu sueldo o una entrada de guita, decime por ejemplo: 'cobre 400 lucas' o 'quiero registrar un ingreso' y lo clavamos de una para que tus finanzas salgan a la cancha como la Scaloneta. ¿Que jugada tenes en mente? ¡Vamoooo Messi!`;
  }

  return `A ver, ${userName}, hablemos en criollo.
Te escucho atentamente, pero aca en GASTONAPP todas las rutas terminan en el mismo lugar: tu bolsillo y cuidar que la pelota no se manche.

Tus numeros reales hoy en la cancha:
- Ingreso mensual efectivo: ${formatMoney(totals.effectiveMonthlyIncome, currency)}.
- Gastos fijos atados: ${formatMoney(totals.currentMonthFixedExpenses, currency)}.
- Ya te patinaste este mes: ${formatMoney(totals.currentMonthTotalExpenses, currency)}.
- Te quedan libres: ${formatMoney(totals.freeCashFlow, currency)} para bancar los ${daysRemainingInMonth} dias restantes (${formatMoney(dailyFreeCash, currency)}/dia).
- Fondo de reserva blindado: ${formatMoney(totals.emergencyFundBalance, currency)}.

Planteame la jugada concreta: ¿queres registrar un ingreso, evaluar una compra, cargar un gasto o planificar tus ahorros? Decime el monto o la idea y te digo si jugamos como la Scaloneta o si te estas pegando un tiro en el pie. ¡Vamoooo Messi!`;
}
