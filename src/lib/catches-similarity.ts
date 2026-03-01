/**
 * Sistema de Coincidencias entre Capturas
 * 
 * Compara las condiciones actuales con jornadas pasadas y detecta coincidencias
 * cuando las condiciones son similares, para predecir posibles capturas.
 * 
 * @author Pelagos App
 * @version 1.0.0
 * 
 * ARQUITECTURA:
 * - Cálculo de similitud basado en pesos configurables
 * - Optimizado para filtrar primero por lugar (reduce queries)
 * - Preparado para machine learning futuro (pesos ajustables)
 */

import { getMoonPhase } from './solunar';

// =============================================================================
// TIPOS
// =============================================================================

/** Condiciones meteorológicas/marinas para comparar */
export interface Conditions {
  /** Fecha en formato YYYY-MM-DD (para calcular fase lunar) */
  date: string;
  /** Coeficiente de marea (0-120 típicamente) */
  tideCoefficient?: number | null;
  /** Velocidad del viento en km/h */
  windSpeed?: number | null;
  /** Dirección del viento en grados (0-360) o texto (N, NE, etc.) */
  windDirection?: number | string | null;
  /** Altura de ola en metros */
  waveHeight?: number | null;
  /** Tipo de marea: "subiendo", "bajando", "pleamar", "bajamar" */
  tideType?: string | null;
}

/** Jornada histórica con condiciones y capturas */
export interface HistoricalDive {
  id: string;
  date: string;
  locationId: string | null;
  locationName: string | null;
  conditions: Conditions;
  catches: Array<{
    species: string;
    weight_kg?: number | null;
    length_cm?: number | null;
  }>;
}

/** Resultado de una coincidencia encontrada */
export interface CatchMatch {
  /** ID de la jornada histórica */
  diveId: string;
  /** Fecha de la jornada histórica */
  date: string;
  /** Nombre del lugar */
  locationName: string | null;
  /** Porcentaje de similitud (0-100) */
  similarityScore: number;
  /** Especies capturadas ese día */
  species: string[];
  /** Desglose del score por variable */
  breakdown: SimilarityBreakdown;
  /** Resumen legible */
  summary: string;
}

/** Desglose de similitud por variable */
export interface SimilarityBreakdown {
  moonPhase: { score: number; weight: number; detail: string };
  tideCoefficient: { score: number; weight: number; detail: string };
  windSpeed: { score: number; weight: number; detail: string };
  windDirection: { score: number; weight: number; detail: string };
  waveHeight: { score: number; weight: number; detail: string };
  tideType: { score: number; weight: number; detail: string };
}

// =============================================================================
// CONFIGURACIÓN DE PESOS (ajustables para ML futuro)
// =============================================================================

/**
 * Pesos para cada variable en el cálculo de similitud.
 * Total debe sumar 1.0 (100%).
 * 
 * Estos valores pueden ajustarse basándose en:
 * - Análisis estadístico de datos históricos
 * - Feedback de usuarios
 * - Modelo de machine learning entrenado
 */
export const SIMILARITY_WEIGHTS = {
  /** Fase lunar - muy importante para la pesca */
  moonPhase: 0.25,
  /** Coeficiente de marea - afecta corrientes y actividad */
  tideCoefficient: 0.20,
  /** Velocidad del viento - afecta condiciones de mar */
  windSpeed: 0.15,
  /** Dirección del viento - afecta oleaje y zonas */
  windDirection: 0.15,
  /** Altura de ola - visibilidad y seguridad */
  waveHeight: 0.15,
  /** Tipo de marea - momento del ciclo */
  tideType: 0.10,
} as const;

/** Umbral mínimo para considerar una coincidencia válida (%) */
export const MIN_SIMILARITY_THRESHOLD = 75;

/** Tolerancias para cada variable */
const TOLERANCES = {
  /** Tolerancia de fase lunar (0-1, donde 1 = ciclo completo) */
  moonPhase: 0.1, // ~3 días de diferencia
  /** Tolerancia de coeficiente de marea (±%) */
  tideCoefficient: 0.15, // ±15%
  /** Tolerancia de velocidad de viento (±%) */
  windSpeed: 0.20, // ±20%
  /** Tolerancia de dirección de viento (±grados) */
  windDirection: 45, // ±45°
  /** Tolerancia de altura de ola (±%) */
  waveHeight: 0.30, // ±30%
};

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Convierte dirección de viento de texto a grados
 */
function windDirectionToDegrees(direction: string | number | null | undefined): number | null {
  if (direction == null) return null;
  if (typeof direction === 'number') return direction;
  
  const dirMap: Record<string, number> = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
  };
  
  const upper = direction.toUpperCase().trim();
  return dirMap[upper] ?? null;
}

/**
 * Calcula la diferencia angular entre dos direcciones (0-180)
 */
function angularDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Normaliza un valor a un score 0-1 basado en diferencia porcentual
 */
function percentageScore(current: number, historical: number, tolerance: number): number {
  if (historical === 0) return current === 0 ? 1 : 0;
  const diff = Math.abs(current - historical) / historical;
  if (diff <= tolerance) return 1;
  if (diff >= tolerance * 3) return 0;
  // Degradación lineal entre tolerance y tolerance*3
  return 1 - (diff - tolerance) / (tolerance * 2);
}

// =============================================================================
// CÁLCULO DE SIMILITUD
// =============================================================================

/**
 * Calcula el score de similitud entre condiciones actuales e históricas.
 * 
 * @param current - Condiciones actuales/previstas
 * @param historical - Condiciones de la jornada histórica
 * @returns Score de similitud (0-100) y desglose
 */
export function calculateSimilarity(
  current: Conditions,
  historical: Conditions
): { score: number; breakdown: SimilarityBreakdown } {
  const breakdown: SimilarityBreakdown = {
    moonPhase: { score: 0, weight: SIMILARITY_WEIGHTS.moonPhase, detail: '' },
    tideCoefficient: { score: 0, weight: SIMILARITY_WEIGHTS.tideCoefficient, detail: '' },
    windSpeed: { score: 0, weight: SIMILARITY_WEIGHTS.windSpeed, detail: '' },
    windDirection: { score: 0, weight: SIMILARITY_WEIGHTS.windDirection, detail: '' },
    waveHeight: { score: 0, weight: SIMILARITY_WEIGHTS.waveHeight, detail: '' },
    tideType: { score: 0, weight: SIMILARITY_WEIGHTS.tideType, detail: '' },
  };

  let totalScore = 0;
  let totalWeight = 0;

  // 1. FASE LUNAR (comparar fases, no fechas)
  const currentMoon = getMoonPhase(current.date);
  const historicalMoon = getMoonPhase(historical.date);
  const moonDiff = Math.min(
    Math.abs(currentMoon - historicalMoon),
    1 - Math.abs(currentMoon - historicalMoon) // Por si cruza el 0/1
  );
  
  if (moonDiff <= TOLERANCES.moonPhase) {
    breakdown.moonPhase.score = 1;
    breakdown.moonPhase.detail = 'Fase lunar idéntica';
  } else if (moonDiff <= TOLERANCES.moonPhase * 2) {
    breakdown.moonPhase.score = 0.5;
    breakdown.moonPhase.detail = 'Fase lunar similar';
  } else {
    breakdown.moonPhase.score = 0;
    breakdown.moonPhase.detail = 'Fase lunar diferente';
  }
  totalScore += breakdown.moonPhase.score * breakdown.moonPhase.weight;
  totalWeight += breakdown.moonPhase.weight;

  // 2. COEFICIENTE DE MAREA
  if (current.tideCoefficient != null && historical.tideCoefficient != null) {
    breakdown.tideCoefficient.score = percentageScore(
      current.tideCoefficient,
      historical.tideCoefficient,
      TOLERANCES.tideCoefficient
    );
    const diff = Math.abs(current.tideCoefficient - historical.tideCoefficient);
    breakdown.tideCoefficient.detail = diff <= 10 
      ? 'Coeficiente muy similar' 
      : diff <= 20 ? 'Coeficiente similar' : 'Coeficiente diferente';
    totalScore += breakdown.tideCoefficient.score * breakdown.tideCoefficient.weight;
    totalWeight += breakdown.tideCoefficient.weight;
  }

  // 3. VELOCIDAD DE VIENTO
  if (current.windSpeed != null && historical.windSpeed != null) {
    breakdown.windSpeed.score = percentageScore(
      current.windSpeed,
      historical.windSpeed,
      TOLERANCES.windSpeed
    );
    const diff = Math.abs(current.windSpeed - historical.windSpeed);
    breakdown.windSpeed.detail = diff <= 5 
      ? 'Viento muy similar' 
      : diff <= 10 ? 'Viento similar' : 'Viento diferente';
    totalScore += breakdown.windSpeed.score * breakdown.windSpeed.weight;
    totalWeight += breakdown.windSpeed.weight;
  }

  // 4. DIRECCIÓN DE VIENTO
  const currentWindDir = windDirectionToDegrees(current.windDirection);
  const historicalWindDir = windDirectionToDegrees(historical.windDirection);
  if (currentWindDir != null && historicalWindDir != null) {
    const angleDiff = angularDifference(currentWindDir, historicalWindDir);
    if (angleDiff <= TOLERANCES.windDirection) {
      breakdown.windDirection.score = 1 - (angleDiff / TOLERANCES.windDirection) * 0.3;
      breakdown.windDirection.detail = angleDiff <= 22.5 
        ? 'Dirección idéntica' 
        : 'Dirección similar';
    } else if (angleDiff <= TOLERANCES.windDirection * 2) {
      breakdown.windDirection.score = 0.3;
      breakdown.windDirection.detail = 'Dirección algo diferente';
    } else {
      breakdown.windDirection.score = 0;
      breakdown.windDirection.detail = 'Dirección opuesta';
    }
    totalScore += breakdown.windDirection.score * breakdown.windDirection.weight;
    totalWeight += breakdown.windDirection.weight;
  }

  // 5. ALTURA DE OLA
  if (current.waveHeight != null && historical.waveHeight != null) {
    breakdown.waveHeight.score = percentageScore(
      current.waveHeight,
      historical.waveHeight,
      TOLERANCES.waveHeight
    );
    const diff = Math.abs(current.waveHeight - historical.waveHeight);
    breakdown.waveHeight.detail = diff <= 0.3 
      ? 'Oleaje muy similar' 
      : diff <= 0.6 ? 'Oleaje similar' : 'Oleaje diferente';
    totalScore += breakdown.waveHeight.score * breakdown.waveHeight.weight;
    totalWeight += breakdown.waveHeight.weight;
  }

  // 6. TIPO DE MAREA
  if (current.tideType && historical.tideType) {
    const match = current.tideType.toLowerCase() === historical.tideType.toLowerCase();
    breakdown.tideType.score = match ? 1 : 0;
    breakdown.tideType.detail = match ? 'Mismo momento de marea' : 'Diferente momento de marea';
    totalScore += breakdown.tideType.score * breakdown.tideType.weight;
    totalWeight += breakdown.tideType.weight;
  }

  // Normalizar score si no todas las variables están disponibles
  const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  return {
    score: Math.round(finalScore * 10) / 10, // 1 decimal
    breakdown,
  };
}

// =============================================================================
// BÚSQUEDA DE COINCIDENCIAS
// =============================================================================

/**
 * Encuentra coincidencias entre las condiciones actuales y jornadas históricas.
 * 
 * @param currentConditions - Condiciones actuales/previstas para hoy
 * @param historicalDives - Jornadas históricas del usuario
 * @param options - Opciones de filtrado
 * @returns Lista de coincidencias ordenadas por similitud
 */
export function findMatches(
  currentConditions: Conditions,
  historicalDives: HistoricalDive[],
  options: {
    /** Filtrar solo jornadas del mismo lugar (ID) */
    locationId?: string | null;
    /** Umbral mínimo de similitud (default: 75%) */
    minSimilarity?: number;
    /** Máximo de resultados a devolver */
    maxResults?: number;
    /** Incluir solo jornadas con capturas */
    onlyWithCatches?: boolean;
  } = {}
): CatchMatch[] {
  const {
    locationId,
    minSimilarity = MIN_SIMILARITY_THRESHOLD,
    maxResults = 10,
    onlyWithCatches = true,
  } = options;

  // Filtrar jornadas por lugar (optimización: reduce comparaciones)
  let filtered = historicalDives;
  if (locationId) {
    filtered = filtered.filter(d => d.locationId === locationId);
  }
  
  // Filtrar solo con capturas si se requiere
  if (onlyWithCatches) {
    filtered = filtered.filter(d => d.catches.length > 0);
  }

  // Calcular similitud para cada jornada
  const matches: CatchMatch[] = [];
  
  for (const dive of filtered) {
    const { score, breakdown } = calculateSimilarity(currentConditions, dive.conditions);
    
    if (score >= minSimilarity) {
      const speciesList = [...new Set(dive.catches.map(c => c.species))];
      
      matches.push({
        diveId: dive.id,
        date: dive.date,
        locationName: dive.locationName,
        similarityScore: score,
        species: speciesList,
        breakdown,
        summary: generateSummary(score, speciesList, dive.date),
      });
    }
  }

  // Ordenar por similitud descendente y limitar resultados
  return matches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);
}

/**
 * Genera un resumen legible de la coincidencia
 */
function generateSummary(score: number, species: string[], date: string): string {
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (species.length === 0) {
    return `Condiciones ${score >= 90 ? 'muy similares' : 'similares'} al ${dateFormatted}`;
  }

  const speciesText = species.length > 3
    ? `${species.slice(0, 3).join(', ')} y ${species.length - 3} más`
    : species.join(', ');

  if (score >= 90) {
    return `🎯 Condiciones casi idénticas. Capturaste: ${speciesText}`;
  } else if (score >= 80) {
    return `Con condiciones muy similares capturaste: ${speciesText}`;
  } else {
    return `Con condiciones parecidas capturaste: ${speciesText}`;
  }
}

// =============================================================================
// EXPORTACIONES ADICIONALES PARA TESTING/ML
// =============================================================================

export { angularDifference, percentageScore, windDirectionToDegrees };

