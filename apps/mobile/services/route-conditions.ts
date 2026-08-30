export const ROUTE_DURATIONS = [30, 45, 60] as const;
export const ROUTE_DIFFICULTIES = ['easy', 'standard', 'challenge'] as const;

export type RouteDuration = (typeof ROUTE_DURATIONS)[number];
export type RouteDifficulty = (typeof ROUTE_DIFFICULTIES)[number];

export type RouteConditions = {
  targetDurationMinutes: RouteDuration;
  difficulty: RouteDifficulty;
  avoidTolls: boolean;
  avoidHighways: boolean;
};

export const DEFAULT_ROUTE_CONDITIONS: RouteConditions = {
  targetDurationMinutes: 30,
  difficulty: 'standard',
  avoidTolls: true,
  avoidHighways: true,
};

export function validateRouteConditions(value: unknown): value is RouteConditions {
  if (!isRecord(value)) {
    return false;
  }

  return (
    ROUTE_DURATIONS.some((duration) => duration === value.targetDurationMinutes) &&
    ROUTE_DIFFICULTIES.some((difficulty) => difficulty === value.difficulty) &&
    typeof value.avoidTolls === 'boolean' &&
    typeof value.avoidHighways === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
