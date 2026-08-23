import { useCallback, useEffect, useState } from 'react';

import {
  fetchLoopRoute,
  type RouteCoordinate,
} from '../services/loop-route-api';

export type LoopRouteState =
  | { status: 'loading' }
  | { status: 'success'; coordinates: RouteCoordinate[] }
  | { status: 'error'; message: string };

export function useLoopRoute(origin: RouteCoordinate) {
  const { latitude, longitude } = origin;
  const [attempt, setAttempt] = useState(0);
  const [routeState, setRouteState] = useState<LoopRouteState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoute() {
      setRouteState({ status: 'loading' });

      try {
        const coordinates = await fetchLoopRoute({ latitude, longitude }, controller.signal);
        setRouteState({ status: 'success', coordinates });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRouteState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : '周回ルートを取得できませんでした。もう一度お試しください。',
        });
      }
    }

    void loadRoute();

    return () => controller.abort();
  }, [attempt, latitude, longitude]);

  const retry = useCallback(() => {
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  return { routeState, retry };
}
