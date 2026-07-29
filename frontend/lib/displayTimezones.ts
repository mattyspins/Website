import { formatInTimeZone } from "date-fns-tz";

// Weekly Raffle windows are always defined in UTC (Monday 00:00 UTC through the
// following Monday), but the admin creating/reviewing one needs to know what that
// actually means in the timezones the audience — and the admin — are in.
const DISPLAY_TIMEZONES = [
  { key: "UTC", tz: "UTC", label: "UTC" },
  { key: "IST", tz: "Asia/Kolkata", label: "IST" },
  { key: "EU", tz: "Europe/Berlin", label: "CET/CEST" },
  { key: "UK", tz: "Europe/London", label: "UK" },
  { key: "ET", tz: "America/New_York", label: "US ET" },
] as const;

/** Monday 00:00 UTC of the current week through the following Monday — mirrors the
 *  backend's WeeklyRaffleService.getCurrentWeekBounds, for previewing before creation. */
export function getCurrentWeekBoundsUtc(referenceDate: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const d = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  const weekEnd = new Date(d);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { weekStart: d, weekEnd };
}

/** e.g. "00:00 UTC · 05:30 IST · 01:00 CET/CEST · 00:00 UK · 20:00 US ET (Sun)" */
export function formatAcrossTimezones(iso: string | Date, pattern = "HH:mm"): string {
  const dayLabel = (tz: string) => formatInTimeZone(iso, tz, "EEE");
  const utcDay = dayLabel("UTC");
  return DISPLAY_TIMEZONES.map(({ tz, label }) => {
    const time = formatInTimeZone(iso, tz, pattern);
    const day = dayLabel(tz);
    return `${time} ${label}${day !== utcDay ? ` (${day})` : ""}`;
  }).join(" · ");
}
