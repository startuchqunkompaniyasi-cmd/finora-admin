/**
 * shared/dates.js
 * Timezone-aware "civil day" helpers.
 *
 * Transactions are stored as UTC instants, but people think in local days.
 * We convert an instant to a day key ("YYYY-MM-DD") in the user's timezone once,
 * then do all calendar math on those keys with UTC arithmetic (no DST surprises).
 * Weeks start on Monday (ISO 8601).
 */

const partsFormatters = new Map();

function getPartsFormatter(timeZone) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** @returns {{year:number, month:number, day:number, hour:number, minute:number}} */
export function getZonedParts(input, timeZone) {
  const date = input instanceof Date ? input : new Date(input);
  const parts = {};
  for (const { type, value } of getPartsFormatter(timeZone).formatToParts(date)) {
    if (type !== 'literal') parts[type] = Number(value);
  }
  return parts;
}

const pad = (n) => String(n).padStart(2, '0');

export function toDayKey(input, timeZone) {
  const { year, month, day } = getZonedParts(input, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayKey(timeZone, now = new Date()) {
  return toDayKey(now, timeZone);
}

export function isValidDayKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return formatDayKey(parseDayKey(key)) === key;
}

/** Day key -> Date at 00:00 UTC (only for calendar arithmetic, never for display of time). */
export function parseDayKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDayKey(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(key, amount) {
  const date = parseDayKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDayKey(date);
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(key) {
  return (parseDayKey(key).getUTCDay() + 6) % 7;
}

export function startOfWeek(key) {
  return addDays(key, -weekdayIndex(key));
}

/** The seven day keys (Monday -> Sunday) of the week containing `key`. */
export function weekDayKeys(key) {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const monthKeyOf = (key) => key.slice(0, 7);

export function startOfMonth(key) {
  return `${monthKeyOf(key)}-01`;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function endOfMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
}

/**
 * Local wall-clock time in `timeZone` -> UTC Date.
 * e.g. zonedTimeToUtc('2026-09-20', 14, 30, 'Asia/Tashkent') -> 2026-09-20T09:30:00Z
 */
export function zonedTimeToUtc(dayKey, hour, minute, timeZone) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const seen = getZonedParts(guess, timeZone);
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
  return new Date(guess - (seenAsUtc - guess));
}

/** Whole days from `fromKey` to `toKey` (negative if `toKey` is earlier). */
export function daysBetween(fromKey, toKey) {
  return Math.round((parseDayKey(toKey) - parseDayKey(fromKey)) / 86_400_000);
}

/** First day of the month before the one containing `key`. */
export function previousMonthStart(key) {
  const [year, month] = key.split('-').map(Number);
  return month === 1 ? `${year - 1}-12-01` : `${year}-${pad(month - 1)}-01`;
}
