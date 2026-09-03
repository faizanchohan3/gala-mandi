/**
 * Parse a "YYYY-MM-DD" date string from a backdated payment form into a Date.
 * Anchored at local noon so the calendar day never shifts across timezones.
 * Returns undefined for empty/invalid input so callers can fall back to now().
 */
export function parsePaymentDate(date?: string | null): Date | undefined {
  if (!date || typeof date !== "string") return undefined
  const d = new Date(`${date}T12:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}
