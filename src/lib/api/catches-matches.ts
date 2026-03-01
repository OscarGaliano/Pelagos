/**
 * API de Coincidencias entre Capturas
 * 
 * Obtiene y procesa coincidencias entre condiciones actuales y jornadas históricas.
 * Optimizado para mínimas consultas a base de datos.
 */

import { supabase } from '@/lib/supabase';
import {
    calculateSimilarity,
    findMatches,
    type CatchMatch,
    type Conditions,
    type HistoricalDive,
} from '../catches-similarity';

// =============================================================================
// TIPOS
// =============================================================================

export interface TodayConditions extends Conditions {
  /** ID del lugar seleccionado (dive_spot_id) */
  locationId?: string | null;
  /** Nombre del lugar */
  locationName?: string | null;
}

export interface MatchesResult {
  /** Coincidencias encontradas */
  matches: CatchMatch[];
  /** Total de jornadas analizadas */
  totalDivesAnalyzed: number;
  /** Condiciones usadas para la comparación */
  conditionsUsed: TodayConditions;
}

// =============================================================================
// FUNCIONES DE API
// =============================================================================

/**
 * Obtiene las jornadas históricas del usuario con sus condiciones y capturas.
 * Optimizado: solo trae los campos necesarios.
 * 
 * @param userId - ID del usuario
 * @param locationId - Opcional: filtrar por lugar específico
 */
export async function getHistoricalDives(
  userId: string,
  locationId?: string | null
): Promise<HistoricalDive[]> {
  let query = supabase
    .from('dives')
    .select(`
      id,
      dive_date,
      dive_spot_id,
      location_name,
      tide_coefficient,
      wind_speed_kmh,
      wind_direction,
      wave_height_m,
      catches (
        species,
        weight_kg,
        length_cm
      ),
      dive_spots (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .order('dive_date', { ascending: false });

  // Filtrar por lugar si se especifica (optimización clave)
  if (locationId) {
    query = query.eq('dive_spot_id', locationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[CatchesMatches] Error obteniendo jornadas:', error);
    throw error;
  }

  // Transformar a formato HistoricalDive
  return (data ?? []).map((dive): HistoricalDive => ({
    id: dive.id,
    date: dive.dive_date,
    locationId: dive.dive_spot_id,
    locationName: dive.location_name ?? (dive.dive_spots as { name: string } | null)?.name ?? null,
    conditions: {
      date: dive.dive_date,
      tideCoefficient: dive.tide_coefficient,
      windSpeed: dive.wind_speed_kmh,
      windDirection: dive.wind_direction,
      waveHeight: dive.wave_height_m,
    },
    catches: (dive.catches ?? []).map((c: { species: string; weight_kg: number | null; length_cm: number | null }) => ({
      species: c.species,
      weight_kg: c.weight_kg,
      length_cm: c.length_cm,
    })),
  }));
}

/**
 * Busca coincidencias entre las condiciones de hoy y las jornadas históricas.
 * 
 * @param userId - ID del usuario
 * @param todayConditions - Condiciones actuales/previstas
 * @param options - Opciones de búsqueda
 */
export async function findCatchMatches(
  userId: string,
  todayConditions: TodayConditions,
  options: {
    /** Filtrar por lugar (true = solo mismo lugar, false = todos) */
    filterByLocation?: boolean;
    /** Umbral mínimo de similitud (%) */
    minSimilarity?: number;
    /** Máximo de resultados */
    maxResults?: number;
  } = {}
): Promise<MatchesResult> {
  const {
    filterByLocation = true,
    minSimilarity = 75,
    maxResults = 5,
  } = options;

  // Obtener jornadas históricas (filtradas por lugar si aplica)
  const locationId = filterByLocation ? todayConditions.locationId : null;
  const historicalDives = await getHistoricalDives(userId, locationId);

  // Buscar coincidencias
  const matches = findMatches(todayConditions, historicalDives, {
    locationId: filterByLocation ? todayConditions.locationId : undefined,
    minSimilarity,
    maxResults,
    onlyWithCatches: true,
  });

  return {
    matches,
    totalDivesAnalyzed: historicalDives.length,
    conditionsUsed: todayConditions,
  };
}

/**
 * Obtiene coincidencias para múltiples lugares a la vez.
 * Útil para mostrar predicciones en el mapa.
 * 
 * @param userId - ID del usuario
 * @param conditionsByLocation - Mapa de locationId -> condiciones
 */
export async function findMatchesForMultipleLocations(
  userId: string,
  conditionsByLocation: Map<string, TodayConditions>
): Promise<Map<string, CatchMatch[]>> {
  // Obtener TODAS las jornadas del usuario (una sola query)
  const allDives = await getHistoricalDives(userId);
  
  const results = new Map<string, CatchMatch[]>();

  for (const [locationId, conditions] of conditionsByLocation) {
    const matches = findMatches(conditions, allDives, {
      locationId,
      minSimilarity: 75,
      maxResults: 3,
      onlyWithCatches: true,
    });
    
    if (matches.length > 0) {
      results.set(locationId, matches);
    }
  }

  return results;
}

/**
 * Calcula la similitud entre dos jornadas específicas.
 * Útil para comparación directa en UI.
 */
export function compareDives(
  dive1Conditions: Conditions,
  dive2Conditions: Conditions
): { score: number; breakdown: ReturnType<typeof calculateSimilarity>['breakdown'] } {
  return calculateSimilarity(dive1Conditions, dive2Conditions);
}

// =============================================================================
// HOOK PARA REACT
// =============================================================================

import { useCallback, useEffect, useState } from 'react';

export interface UseCatchMatchesOptions {
  /** ID del usuario */
  userId: string | null;
  /** Condiciones actuales */
  conditions: TodayConditions | null;
  /** Filtrar por el lugar actual */
  filterByLocation?: boolean;
  /** Activar/desactivar la búsqueda */
  enabled?: boolean;
}

export interface UseCatchMatchesResult {
  /** Coincidencias encontradas */
  matches: CatchMatch[];
  /** Estado de carga */
  loading: boolean;
  /** Error si ocurrió */
  error: string | null;
  /** Refrescar manualmente */
  refresh: () => void;
}

/**
 * Hook para obtener coincidencias de capturas en React.
 * 
 * @example
 * ```tsx
 * const { matches, loading } = useCatchMatches({
 *   userId: user?.id,
 *   conditions: todayConditions,
 *   enabled: !!todayConditions,
 * });
 * ```
 */
export function useCatchMatches({
  userId,
  conditions,
  filterByLocation = true,
  enabled = true,
}: UseCatchMatchesOptions): UseCatchMatchesResult {
  const [matches, setMatches] = useState<CatchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!userId || !conditions || !enabled) {
      setMatches([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await findCatchMatches(userId, conditions, {
        filterByLocation,
        minSimilarity: 75,
        maxResults: 5,
      });
      setMatches(result.matches);
    } catch (err) {
      console.error('[useCatchMatches] Error:', err);
      setError(err instanceof Error ? err.message : 'Error buscando coincidencias');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [userId, conditions, filterByLocation, enabled]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refresh: fetchMatches,
  };
}
