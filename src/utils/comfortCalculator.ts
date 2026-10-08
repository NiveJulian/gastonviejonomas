import type { Expense, SavingsGoal, AppConfig, ComfortAnalysis, ComfortLevel } from '../types/finance';
import { calculateFinancialTotals } from './rulesEngine';

/**
 * Calcula los niveles de bienestar e ingreso ideal de confort financiero
 */
export function calculateComfortAnalysis(
  expenses: Expense[],
  savings: SavingsGoal[],
  config: AppConfig
): ComfortAnalysis {
  const totals = calculateFinancialTotals(expenses, savings, config);

  // Gastos esenciales: Gastos fijos + categorías básicas de alimentos y salud
  const essentialFixed = totals.currentMonthFixedExpenses > 0
    ? totals.currentMonthFixedExpenses
    : (config.monthlyIncome > 0 ? config.monthlyIncome * 0.5 : 0);

  const currentIncome = config.monthlyIncome > 0 ? config.monthlyIncome : 0;

  // CÁLCULO DE NIVELES DE INGRESO
  // 1. Supervivencia: Lo esencial representa el 85% de los ingresos (15% margen)
  const survivalTarget = essentialFixed > 0 ? Math.round(essentialFixed / 0.85) : 0;

  // 2. Seguridad: Lo esencial representa el 70% de los ingresos (30% para imprevistos y ahorro básico)
  const securityTarget = essentialFixed > 0 ? Math.round(essentialFixed / 0.70) : 0;

  // 3. Confort Dorado (Regla de Oro 50/30/20): Lo esencial representa el 50%
  const comfortTarget = essentialFixed > 0 ? Math.round(essentialFixed / 0.50) : 0;

  // 4. Abundancia / Libertad Financiera: Lo esencial representa el 35% (65% ahorro e inversiones)
  const abundanceTarget = essentialFixed > 0 ? Math.round(essentialFixed / 0.35) : 0;

  const determineCurrentLevel = (): 'survival' | 'security' | 'comfort_golden' | 'abundance' => {
    if (currentIncome === 0 || essentialFixed === 0) return 'survival';
    if (currentIncome < securityTarget) return 'survival';
    if (currentIncome < comfortTarget) return 'security';
    if (currentIncome < abundanceTarget) return 'comfort_golden';
    return 'abundance';
  };

  const currentLevelId = determineCurrentLevel();

  const levels: ComfortLevel[] = [
    {
      id: 'survival',
      name: 'Nivel 1: Ajustado / Supervivencia',
      subtitle: 'Cubre lo básico pero vives al día sin margen para imprevistos',
      targetIncome: survivalTarget,
      gapFromCurrent: Math.max(0, survivalTarget - currentIncome),
      achievedPercent: survivalTarget > 0 ? Math.min(100, Math.round((currentIncome / survivalTarget) * 100)) : 0,
      breakdown: {
        essentials: Math.round(survivalTarget * 0.85),
        lifestyle: Math.round(survivalTarget * 0.10),
        savingsInvestment: Math.round(survivalTarget * 0.05),
      },
      benefits: [
        'Cubre gastos fijos como techo y comida básica.',
        'Poco o ningún margen si sube un servicio o surge una avería.',
        'No permite construir fondo de emergencia ni ahorrar con constancia.',
      ],
      isCurrentStatus: currentLevelId === 'survival',
    },
    {
      id: 'security',
      name: 'Nivel 2: Seguridad Básica',
      subtitle: 'Tranquilidad cotidiana y capacidad de armar un fondo de reserva',
      targetIncome: securityTarget,
      gapFromCurrent: Math.max(0, securityTarget - currentIncome),
      achievedPercent: securityTarget > 0 ? Math.min(100, Math.round((currentIncome / securityTarget) * 100)) : 0,
      breakdown: {
        essentials: Math.round(securityTarget * 0.70),
        lifestyle: Math.round(securityTarget * 0.18),
        savingsInvestment: Math.round(securityTarget * 0.12),
      },
      benefits: [
        'Permite fondear gradualmente el Fondo de Emergencia intocable.',
        'Absorbe pequeños gastos inesperados sin endeudarte.',
        'Salidas y entretenimiento moderados sin culpa.',
      ],
      isCurrentStatus: currentLevelId === 'security',
    },
    {
      id: 'comfort_golden',
      name: 'Nivel 3: Confort Dorado (Regla 50/30/20)',
      subtitle: 'La zona óptima de bienestar: equilibrio perfecto entre presente y futuro',
      targetIncome: comfortTarget,
      gapFromCurrent: Math.max(0, comfortTarget - currentIncome),
      achievedPercent: comfortTarget > 0 ? Math.min(100, Math.round((currentIncome / comfortTarget) * 100)) : 0,
      breakdown: {
        essentials: Math.round(comfortTarget * 0.50), // 50% Necesidades
        lifestyle: Math.round(comfortTarget * 0.30), // 30% Deseos y ocio
        savingsInvestment: Math.round(comfortTarget * 0.20), // 20% Inversión y metas
      },
      benefits: [
        'Tus gastos fijos son exactamente la mitad de lo que ganas (cero estrés a fin de mes).',
        'Dispones de un 30% completo para darte gustos, vacaciones y salidas.',
        'Destinas un 20% constante a inversiones y metas que multiplican tu patrimonio.',
        'El semáforo de compras aprueba la gran mayoría de tus proyectos.',
      ],
      isCurrentStatus: currentLevelId === 'comfort_golden',
    },
    {
      id: 'abundance',
      name: 'Nivel 4: Abundancia & Libertad Financiera',
      subtitle: 'Tus necesidades son una fracción de tus ingresos; construcción patrimonial acelerada',
      targetIncome: abundanceTarget,
      gapFromCurrent: Math.max(0, abundanceTarget - currentIncome),
      achievedPercent: abundanceTarget > 0 ? Math.min(100, Math.round((currentIncome / abundanceTarget) * 100)) : 0,
      breakdown: {
        essentials: Math.round(abundanceTarget * 0.35),
        lifestyle: Math.round(abundanceTarget * 0.25),
        savingsInvestment: Math.round(abundanceTarget * 0.40),
      },
      benefits: [
        'Ahorras e inviertes más del 40% de lo que ingresa cada mes.',
        'Independencia financiera a mediano y largo plazo.',
        'Total libertad ante cambios económicos o laborales imprevistos.',
      ],
      isCurrentStatus: currentLevelId === 'abundance',
    },
  ];

  // Brecha hacia el Confort Dorado (50/30/20)
  const gapToGoldenComfort = Math.max(0, comfortTarget - currentIncome);
  const currentComfortPercent = Math.min(100, Math.round((currentIncome / comfortTarget) * 100));

  const howToReachTips = [
    gapToGoldenComfort === 0
      ? '🎉 ¡Felicitaciones! Tu ingreso actual ya cubre el estándar de Confort Dorado (50/30/20). Enfócate en optimizar tus inversiones.'
      : `Tu brecha mensual hacia el confort pleno es de $${gapToGoldenComfort.toLocaleString('es-AR')}.`,
    'Optimización de gastos fijos: Renegocia tarifas de servicios o suscripciones inactivas para bajar el costo base.',
    'Ingresos complementarios: Desarrolla fuentes adicionales de ingresos o proyectos freelance que sumen a tu objetivo.',
    'Sigue la regla 50/30/20: Procura que tus gastos fijos del hogar nunca superen la mitad de tus ingresos netos.',
  ];

  return {
    monthlyIncome: currentIncome,
    essentialNeeds: essentialFixed,
    currentComfortPercent,
    levels,
    goldenRuleRecommendation: {
      idealMonthlyIncome: comfortTarget,
      gapToGoldenComfort,
      howToReachTips,
    },
  };
}
