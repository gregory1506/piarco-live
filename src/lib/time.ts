export const TT_TIMEZONE = 'America/Port_of_Spain';
export const MINUTE = 60_000;
/** Trinidad and Tobago is UTC−4 year-round (no DST). */
const AST_OFFSET_MS = -4 * 60 * MINUTE;
const DAY = 24 * 60 * MINUTE;

const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TT_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const hms = new Intl.DateTimeFormat('en-GB', {
  timeZone: TT_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** HH:MM in Trinidad local time (AST). */
export function formatHM(ms: number | undefined): string {
  return ms == null ? '--:--' : hm.format(ms);
}

/** HH:MM:SS in Trinidad local time (AST). */
export function formatHMS(ms: number): string {
  return hms.format(ms);
}

/** Calendar-day difference between two instants, in AST (e.g. +1 for tomorrow). */
export function dayOffset(ms: number, now: number): number {
  return Math.floor((ms + AST_OFFSET_MS) / DAY) - Math.floor((now + AST_OFFSET_MS) / DAY);
}

/** Signed minute offset as a compact label: "NOW", "+45m", "−1h 05m". */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'NOW';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h ? `${sign}${h}h ${String(m).padStart(2, '0')}m` : `${sign}${m}m`;
}

/** "just now", "4m ago", "2h ago". */
export function formatAge(ms: number, now: number): string {
  const min = Math.round((now - ms) / MINUTE);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
