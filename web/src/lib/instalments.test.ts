import { agingBucket, displayStatus, nextPayable } from './instalments'
import { agingSeries, upcomingSeries } from './dashboard'
import type { Instalment, PortfolioReport } from './graphql'

const inst = (number: number, dueDate: string, status: Instalment['status'] = 'PENDING'): Instalment => ({
  number, dueDate, amount: 100, status, paidOn: status === 'PAID' ? dueDate : null,
})

describe('displayStatus', () => {
  it('shows paid, overdue and due', () => {
    expect(displayStatus(inst(1, '2026-01-01', 'PAID'), '2026-03-01')).toBe('Paid')
    expect(displayStatus(inst(2, '2026-02-01'), '2026-03-01')).toBe('Overdue')
    expect(displayStatus(inst(3, '2026-03-01'), '2026-03-01')).toBe('Due') // due today is not overdue yet
  })
})

it('nextPayable is the earliest pending instalment, whatever the input order', () => {
  expect(nextPayable([inst(3, '2026-03-01'), inst(1, '2026-01-01', 'PAID'), inst(2, '2026-02-01')])?.number).toBe(2)
  expect(nextPayable([inst(1, '2026-01-01', 'PAID')])).toBeUndefined()
})

it.each([
  [1, '1–30 days'], [30, '1–30 days'], [31, '31–60 days'], [90, '61–90 days'], [91, '90+ days'],
])('agingBucket(%i) is %s', (days, bucket) => {
  expect(agingBucket(days)).toBe(bucket)
})

const report: PortfolioReport = {
  asOf: '2026-11-12',
  byCurrency: [],
  upcoming: [
    { month: '2026-12', currency: 'USD', amount: 500, instalments: 2 },
    { month: '2027-02', currency: 'USD', amount: 250, instalments: 1 },
    { month: '2026-12', currency: 'EUR', amount: 999, instalments: 1 },
  ],
  overdue: [
    { policyId: 'a', policyNumber: 'P1', insuredName: 'A', currency: 'USD', instalmentNumber: 1, dueDate: '2026-10-01', amount: 100, daysOverdue: 42 },
    { policyId: 'a', policyNumber: 'P1', insuredName: 'A', currency: 'USD', instalmentNumber: 2, dueDate: '2026-11-01', amount: 100, daysOverdue: 11 },
    { policyId: 'b', policyNumber: 'P2', insuredName: 'B', currency: 'EUR', instalmentNumber: 1, dueDate: '2026-11-01', amount: 700, daysOverdue: 11 },
  ],
}

it('upcomingSeries fills six months from next month, zeros included, one currency only', () => {
  expect(upcomingSeries(report, 'USD')).toEqual([
    { month: '2026-12', amount: 500, instalments: 2 },
    { month: '2027-01', amount: 0, instalments: 0 },
    { month: '2027-02', amount: 250, instalments: 1 },
    { month: '2027-03', amount: 0, instalments: 0 },
    { month: '2027-04', amount: 0, instalments: 0 },
    { month: '2027-05', amount: 0, instalments: 0 },
  ])
})

it('agingSeries groups one currency into the four buckets', () => {
  expect(agingSeries(report, 'USD').map((a) => [a.bucket, a.amount, a.count])).toEqual([
    ['1–30 days', 100, 1],
    ['31–60 days', 100, 1],
    ['61–90 days', 0, 0],
    ['90+ days', 0, 0],
  ])
})
