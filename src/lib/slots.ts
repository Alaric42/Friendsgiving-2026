// Nov 20 – Nov 29, 2026 inclusive; start hours 10..21 (10am–10pm).
export const DATES: string[] = Array.from({ length: 10 }, (_, i) =>
  `2026-11-${String(20 + i).padStart(2, "0")}`,
);
export const HOURS: number[] = Array.from({ length: 12 }, (_, i) => 10 + i);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return { weekday: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate() };
}

function fmtHour(h: number) {
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { h12, suffix };
}

export function hourShort(h: number) {
  const { h12, suffix } = fmtHour(h);
  return `${h12}${suffix}`;
}

export function hourRange(h: number) {
  const a = fmtHour(h);
  const b = fmtHour(h + 1);
  return a.suffix === b.suffix
    ? `${a.h12}–${b.h12}${b.suffix}`
    : `${a.h12}${a.suffix}–${b.h12}${b.suffix}`;
}

export const slotKey = (date: string, hour: number) => `${date}|${hour}`;
