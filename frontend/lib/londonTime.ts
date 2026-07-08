import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

const LONDON_TZ = "Europe/London";

/** Converts a date+time picked as Europe/London wall-clock time into the correct UTC Date (DST-aware). */
export function londonInputToUtc(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, LONDON_TZ);
}

/** Splits a UTC instant into the `{date, time}` picker values it corresponds to in Europe/London. */
export function utcToLondonInputParts(iso: string | Date): { date: string; time: string } {
  return {
    date: formatInTimeZone(iso, LONDON_TZ, "yyyy-MM-dd"),
    time: formatInTimeZone(iso, LONDON_TZ, "HH:mm"),
  };
}

/** Human-readable Europe/London display, e.g. "1 Jul 2026, 00:00 (BST)". */
export function formatLondon(iso: string | Date, pattern = "d MMM yyyy, HH:mm"): string {
  const tzLabel = formatInTimeZone(iso, LONDON_TZ, "zzz");
  return `${formatInTimeZone(iso, LONDON_TZ, pattern)} (${tzLabel})`;
}
