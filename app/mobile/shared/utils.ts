export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/** Formats an amount as Polish złoty, e.g. "1 234,56 zł". */
export function formatCurrency(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? "-" : "";
  const [intPart, decPart] = Math.abs(value).toFixed(2).split(".");
  // Manual formatting: Hermes' Intl support for pl-PL differs between builds.
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped},${decPart} zł`;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Parses "YYYY-MM-DD" (or a full ISO string) as a LOCAL date.
 * `new Date("2021-03-27")` would be parsed as UTC midnight, which shifts the day
 * in some time zones.
 */
export function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? "");
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(dateStr);
}

/** Returns "YYYY-MM" month key for a transaction date. */
export function monthKey(dateStr: string): string {
  return (dateStr ?? "").slice(0, 7);
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Mar 27", or "Mar 27, 2021" when the date is not in the current year. */
export function formatShortDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const base = `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear()
    ? base
    : `${base}, ${d.getFullYear()}`;
}

export function formatMonthYear(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
