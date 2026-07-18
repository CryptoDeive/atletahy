function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function parseDurationToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length < 1 || parts.length > 3 || parts.some((part) => part.trim() === '' || !/^\d+(?:\.\d+)?$/.test(part.trim()))) return null;
  const numbers = parts.map(Number);
  if (numbers.some((number) => !Number.isFinite(number) || number < 0)) return null;
  if (parts.length > 1 && numbers.at(-1)! >= 60) return null;
  if (parts.length === 3 && numbers[1] >= 60) return null;
  const seconds = parts.length === 3 ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2] : parts.length === 2 ? numbers[0] * 60 + numbers[1] : numbers[0];
  return validPositive(seconds) ? seconds : null;
}

export function formatSecondsAsDuration(seconds: number): string | null {
  if (!validPositive(seconds)) return null;
  const rounded = Math.round(seconds * 10) / 10;
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remaining = rounded % 60;
  const secondsText = remaining.toFixed(Number.isInteger(remaining) ? 0 : 1).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secondsText}` : `${minutes}:${secondsText}`;
}

export function calculatePacePer500m(totalSeconds: number, distanceMeters: number): number | null {
  return validPositive(totalSeconds) && validPositive(distanceMeters) ? totalSeconds / (distanceMeters / 500) : null;
}

export function calculatePacePerKm(totalSeconds: number, distanceMeters: number): number | null {
  return validPositive(totalSeconds) && validPositive(distanceMeters) ? totalSeconds / (distanceMeters / 1000) : null;
}

export function calculateAverageSpeedKmh(distanceMeters: number, totalSeconds: number): number | null {
  return validPositive(distanceMeters) && validPositive(totalSeconds) ? (distanceMeters / 1000) / (totalSeconds / 3600) : null;
}

export function calculateEstimatedFtp(averageWatts: number): number | null {
  return validPositive(averageWatts) ? averageWatts * 0.95 : null;
}

export function calculateWattsPerKg(watts: number, weightKg: number): number | null {
  return validPositive(watts) && validPositive(weightKg) ? watts / weightKg : null;
}

export function calculateVam(distanceMeters: number, totalSeconds: number): number | null {
  return calculateAverageSpeedKmh(distanceMeters, totalSeconds);
}

export function calculateConcept2Watts(paceSecondsPer500m: number): number | null {
  if (!validPositive(paceSecondsPer500m)) return null;
  return 2.8 / Math.pow(paceSecondsPer500m / 500, 3);
}
