export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

type LoopRouteResponse = {
  coordinates: RouteCoordinate[];
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

export async function fetchLoopRoute(
  origin: RouteCoordinate,
  signal?: AbortSignal,
): Promise<RouteCoordinate[]> {
  if (!API_BASE_URL) {
    throw new Error('APIの接続先が設定されていません。EXPO_PUBLIC_API_BASE_URLを確認してください。');
  }

  const response = await fetch(`${API_BASE_URL}/routes/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`ルート取得APIがエラーを返しました（${response.status}）。`);
  }

  const body: unknown = await response.json();

  if (!isLoopRouteResponse(body)) {
    throw new Error('ルート取得APIのレスポンス形式が正しくありません。');
  }

  return body.coordinates;
}

function isLoopRouteResponse(value: unknown): value is LoopRouteResponse {
  if (!isRecord(value) || !Array.isArray(value.coordinates) || value.coordinates.length < 2) {
    return false;
  }

  return value.coordinates.every(
    (coordinate) =>
      isRecord(coordinate) &&
      isValidNumber(coordinate.latitude, -90, 90) &&
      isValidNumber(coordinate.longitude, -180, 180),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}
