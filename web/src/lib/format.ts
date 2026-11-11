export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

/** Short form for chart axes: 12.5K, 1.2M. */
export function compact(amount: number): string {
  return new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
}

/** "2026-01-31" → "31 Jan 2026". Parsed as a calendar date, so the time zone can't shift the day. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "2026-05" → "May 26". */
export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const frequencyLabel: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-annual',
  ANNUAL: 'Annual',
}

/** Pulls the readable message out of an Apollo error (GraphQL errors first, then network errors). */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors) && error.errors.length) {
    return error.errors.map((e: { message: string }) => e.message).join(' ')
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}
