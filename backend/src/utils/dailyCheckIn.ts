// Shared between the check-in endpoints and the activation checklist. Both have to
// agree on what "today" means — if they drift, the checklist can advertise a claim
// the claim endpoint then rejects as already taken.
export const DAILY_REWARD = 5;

export function isSameUTCDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
