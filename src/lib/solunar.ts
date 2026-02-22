/**
 * Periodos solunares (major/minor) para pesca.
 * Cálculo aproximado sin dependencias externas (evita errores 500 con paquetes CJS en Vite).
 * Basado en ciclo lunar ~29.5 días y ajuste por latitud para salida/puesta aproximadas.
 */

export interface SolunarPeriod {
  type: 'major' | 'minor';
  label: string;
  start: Date;
  end: Date;
}

const MAJOR_DURATION_H = 2;
const MINOR_DURATION_H = 1;

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatPeriodRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Julian day number (días desde epoch J2000 aproximado) para una fecha a mediodía local. */
function toJulianDay(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getTime() / (24 * 60 * 60 * 1000) - 2451545;
}

/** Fase lunar 0–1 (0 = luna nueva, 0.5 = llena, 1 = nueva). */
export function getMoonPhase(dateStr: string): number {
  const jd = toJulianDay(dateStr);
  const phase = (jd % 29.53 + 29.53) % 29.53;
  return phase / 29.53;
}

const MOON_PHASE_LABELS: Record<number, string> = {
  0: 'Luna nueva',
  1: 'Creciente',
  2: 'Cuarto creciente',
  3: 'Creciente gibosa',
  4: 'Luna llena',
  5: 'Menguante gibosa',
  6: 'Cuarto menguante',
  7: 'Menguante',
};

/** Etiqueta de la fase lunar para una fecha. */
export function getMoonPhaseLabel(dateStr: string): string {
  const p = getMoonPhase(dateStr);
  const index = Math.min(7, Math.floor(p * 8));
  return MOON_PHASE_LABELS[index] ?? 'Luna llena';
}

/**
 * Aproximación de salida y puesta de luna (en horas locales 0–24) para una fecha y latitud.
 * El ciclo lunar es ~29.53 días; la luna se retrasa ~50 min/día respecto al sol.
 */
function getMoonRiseSetHours(dateStr: string, lat: number): { riseHours: number; setHours: number } {
  const jd = toJulianDay(dateStr);
  const lunarPhase = (jd % 29.53 + 29.53) % 29.53;
  const moonOffset = (lunarPhase / 29.53) * 24;
  const latFactor = (lat / 90) * 1.5;
  const riseHours = (6 + moonOffset + latFactor) % 24;
  const setHours = (riseHours + 12.4) % 24;
  return { riseHours: (riseHours + 24) % 24, setHours: (setHours + 24) % 24 };
}

function hoursToDate(dateStr: string, hours: number): Date {
  const d = new Date(dateStr + 'T00:00:00');
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calcula los periodos solunares para una fecha y coordenadas.
 * Major: ~2h alrededor de luna en cenit y en nadir.
 * Minor: ~1h alrededor de salida y puesta de luna.
 */
export function getSolunarPeriods(dateStr: string, lat: number, _lon: number): SolunarPeriod[] {
  const { riseHours, setHours } = getMoonRiseSetHours(dateStr, lat);
  const rise = hoursToDate(dateStr, riseHours);
  const set = hoursToDate(dateStr, setHours);

  const result: SolunarPeriod[] = [];
  const halfMajor = MAJOR_DURATION_H / 2;
  const halfMinor = MINOR_DURATION_H / 2;

  const transit = new Date((rise.getTime() + set.getTime()) / 2);
  const underfoot = addHours(transit, 12);

  result.push({
    type: 'major',
    label: 'Mayor (luna cenit)',
    start: addHours(transit, -halfMajor),
    end: addHours(transit, halfMajor),
  });
  result.push({
    type: 'major',
    label: 'Mayor (luna nadir)',
    start: addHours(underfoot, -halfMajor),
    end: addHours(underfoot, halfMajor),
  });
  result.push({
    type: 'minor',
    label: 'Menor (salida luna)',
    start: addHours(rise, -halfMinor),
    end: addHours(rise, halfMinor),
  });
  result.push({
    type: 'minor',
    label: 'Menor (puesta luna)',
    start: addHours(set, -halfMinor),
    end: addHours(set, halfMinor),
  });

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}
