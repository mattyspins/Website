// ISO-8601 week number (Monday-start weeks, week 1 contains the year's first Thursday).
export function isoWeekNumber(date: Date | string): number {
  const d = new Date(typeof date === "string" ? date : date.getTime());
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const diff = utc.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}
