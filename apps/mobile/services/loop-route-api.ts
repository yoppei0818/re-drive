export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type LoopRouteResponse = {
  coordinates: RouteCoordinate[];
  googleMapsUrl: string;
};

type LoopRouteApiResponse = {
  coordinates: RouteCoordinate[];
  google_maps_url: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchLoopRoute(
  origin: RouteCoordinate,
  signal?: AbortSignal,
): Promise<LoopRouteResponse> {
  if (!API_BASE_URL) {
    throw new Error('APIの接続先が設定されていません。EXPO_PUBLIC_API_BASE_URLを確認してください。');
  }

  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  const timeout = setTimeout(abortRequest, REQUEST_TIMEOUT_MS);
  signal?.addEventListener('abort', abortRequest);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/routes/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin }),
      signal: requestController.signal,
    });
  } catch (error) {
    if (requestController.signal.aborted && !signal?.aborted) {
      throw new Error('ルート取得APIへの接続がタイムアウトしました。接続先を確認してください。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }

  if (!response.ok) {
    throw new Error(`ルート取得APIがエラーを返しました（${response.status}）。`);
  }

  const body: unknown = await response.json();

  if (!isLoopRouteResponse(body)) {
    throw new Error('ルート取得APIのレスポンス形式が正しくありません。');
  }

  return {
    coordinates: body.coordinates,
    googleMapsUrl: body.google_maps_url,
  };
}

function isLoopRouteResponse(value: unknown): value is LoopRouteApiResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.coordinates) ||
    value.coordinates.length < 2 ||
    !isGoogleMapsUrl(value.google_maps_url)
  ) {
    return false;
  }

  return value.coordinates.every(
    (coordinate) =>
      isRecord(coordinate) &&
      isValidNumber(coordinate.latitude, -90, 90) &&
      isValidNumber(coordinate.longitude, -180, 180),
  );
}

function isGoogleMapsUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.google.com' && url.pathname === '/maps/dir/';
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidNumber(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}
