import type { Instalment } from './graphql'

export type DisplayStatus = 'Paid' | 'Overdue' | 'Due'

/** The server stores Paid/Pending; "Overdue" is a view of a pending instalment whose due date has passed. */
export function displayStatus(i: Instalment, today: string): DisplayStatus {
  if (i.status === 'PAID') return 'Paid'
  return i.dueDate < today ? 'Overdue' : 'Due'
}

/** Instalments must be paid in order, so only the earliest pending one can be paid. */
export function nextPayable(instalments: Instalment[]): Instalment | undefined {
  return [...instalments].sort((a, b) => a.number - b.number).find((i) => i.status === 'PENDING')
}

export const agingBuckets = ['1–30 days', '31–60 days', '61–90 days', '90+ days'] as const

export function agingBucket(daysOverdue: number): (typeof agingBuckets)[number] {
  if (daysOverdue <= 30) return '1–30 days'
  if (daysOverdue <= 60) return '31–60 days'
  if (daysOverdue <= 90) return '61–90 days'
  return '90+ days'
}
