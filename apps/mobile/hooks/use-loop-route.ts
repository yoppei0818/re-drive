import { useCallback, useEffect, useState } from 'react';

import {
  fetchLoopRoute,
  type LoopRouteResponse,
  type RouteCoordinate,
} from '../services/loop-route-api';
import { type RouteConditions } from '../services/route-conditions';

export type LoopRouteState =
  | { status: 'loading' }
  | ({ status: 'success' } & LoopRouteResponse)
  | { status: 'error'; message: string };

export function useLoopRoute(origin: RouteCoordinate, conditions: RouteConditions) {
  const { latitude, longitude } = origin;
  const [attempt, setAttempt] = useState(0);
  const [routeState, setRouteState] = useState<LoopRouteState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoute() {
      setRouteState({ status: 'loading' });

      try {
        const route = await fetchLoopRoute({ latitude, longitude }, conditions, controller.signal);
        setRouteState({ status: 'success', ...route });
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
  }, [attempt, conditions, latitude, longitude]);

  const retry = useCallback(() => {
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  return { routeState, retry };
}
