import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDayKey, weekDayKeys, startOfWeek, weekdayIndex, endOfMonth, isValidDayKey } from '../../shared/dates.js';

test('toDayKey respects the timezone (UTC+5 crosses midnight)', () => {
  // 20:00 UTC on 19 Sep is already 01:00 on 20 Sep in Tashkent.
  assert.equal(toDayKey('2026-09-19T20:00:00Z', 'Asia/Tashkent'), '2026-09-20');
  assert.equal(toDayKey('2026-09-19T20:00:00Z', 'UTC'), '2026-09-19');
});

test('weeks run Monday to Sunday', () => {
  // 20 Sep 2026 is a Sunday.
  assert.equal(weekdayIndex('2026-09-20'), 6);
  assert.equal(startOfWeek('2026-09-20'), '2026-09-14');
  assert.deepEqual(weekDayKeys('2026-09-16'), [
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20',
  ]);
});

test('month helpers and validation', () => {
  assert.equal(endOfMonth('2028-02-10'), '2028-02-29');
  assert.ok(isValidDayKey('2026-09-20'));
  assert.ok(!isValidDayKey('2026-02-30'));
  assert.ok(!isValidDayKey('20-09-2026'));
});

import { zonedTimeToUtc } from '../../shared/dates.js';

test('zonedTimeToUtc converts Tashkent wall-clock time to UTC', () => {
  assert.equal(zonedTimeToUtc('2026-09-20', 14, 30, 'Asia/Tashkent').toISOString(), '2026-09-20T09:30:00.000Z');
  assert.equal(zonedTimeToUtc('2026-09-20', 2, 0, 'Asia/Tashkent').toISOString(), '2026-09-19T21:00:00.000Z');
});
