import type { PortfolioReport } from './graphql'
import { agingBucket, agingBuckets } from './instalments'

/** Six calendar months starting the month after `asOf`, with zero for months that have nothing due. */
export function upcomingSeries(report: PortfolioReport, currency: string, months = 6) {
  const [y, m] = report.asOf.split('-').map(Number)
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m + i, 1)) // month index m is already "next month" (JS months are 0-based)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const hit = report.upcoming.find((u) => u.month === key && u.currency === currency)
    return { month: key, amount: hit?.amount ?? 0, instalments: hit?.instalments ?? 0 }
  })
}

export function agingSeries(report: PortfolioReport, currency: string) {
  const rows = report.overdue.filter((o) => o.currency === currency)
  return agingBuckets.map((bucket) => {
    const inBucket = rows.filter((o) => agingBucket(o.daysOverdue) === bucket)
    return { bucket, amount: inBucket.reduce((s, o) => s + o.amount, 0), count: inBucket.length }
  })
}

export function collectionSplit(report: PortfolioReport, currency: string) {
  const c = report.byCurrency.find((x) => x.currency === currency)
  if (!c) return []
  return [
    { key: 'collected', label: 'Collected', amount: c.collected },
    { key: 'notDue', label: 'Not yet due', amount: Math.max(c.outstanding - c.overdueAmount, 0) },
    { key: 'overdue', label: 'Overdue', amount: c.overdueAmount },
  ]
}
