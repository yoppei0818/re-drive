import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_ROUTE_CONDITIONS, validateRouteConditions } from './route-conditions.ts';

test('既定のルート条件を有効と判定する', () => {
  assert.equal(validateRouteConditions(DEFAULT_ROUTE_CONDITIONS), true);
});

test('未対応の走行時間と難易度を拒否する', () => {
  assert.equal(
    validateRouteConditions({ ...DEFAULT_ROUTE_CONDITIONS, targetDurationMinutes: 20 }),
    false,
  );
  assert.equal(
    validateRouteConditions({ ...DEFAULT_ROUTE_CONDITIONS, difficulty: 'expert' }),
    false,
  );
});

test('boolean以外の回避条件を拒否する', () => {
  assert.equal(validateRouteConditions({ ...DEFAULT_ROUTE_CONDITIONS, avoidTolls: 'yes' }), false);
});
