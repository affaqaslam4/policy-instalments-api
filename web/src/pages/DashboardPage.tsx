import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Link } from 'react-router'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PORTFOLIO_REPORT } from '../lib/graphql'
import { compact, errorMessage, formatDate, money, monthLabel, todayIso } from '../lib/format'
import { agingSeries, collectionSplit, upcomingSeries } from '../lib/dashboard'

// Colour by job: identity = categorical slot 1, state = reserved status colour, remainder = neutral.
const COLORS = { collected: '#2a78d6', notDue: '#c3c2b7', overdue: '#d03b3b' } as const
const AXIS = { stroke: '#c3c2b7', tick: { fill: '#898781', fontSize: 12 } }

function ChartTooltip({ active, payload, title, currency, extra }: {
  active?: boolean
  payload?: { value: number; payload: Record<string, number | string> }[]
  title: (p: Record<string, number | string>) => string
  currency: string
  extra?: (p: Record<string, number | string>) => string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tooltip">
      <strong>{title(p)}</strong>
      <span className="num">{money(payload[0].value, currency)}</span>
      {extra && <div className="subtle">{extra(p)}</div>}
    </div>
  )
}

export function DashboardPage() {
  // The report uses the user's local date, the same "today" the policy page uses for overdue badges.
  const { data, loading, error } = useQuery(PORTFOLIO_REPORT, {
    variables: { asOf: todayIso() },
    fetchPolicy: 'cache-and-network',
  })
  const [picked, setPicked] = useState<string | null>(null)

  if (loading && !data) return <p className="subtle">Loading dashboard…</p>
  if (error) return <div className="alert error" role="alert">{errorMessage(error)}</div>

  const report = data!.portfolioReport
  if (report.byCurrency.length === 0) {
    return (
      <div className="card empty">
        <h1>Dashboard</h1>
        <p>No policies yet, so there is nothing to report.</p>
        <Link to="/policies/new" className="btn">Create a policy</Link>
      </div>
    )
  }

  // Amounts are never added across currencies, so the whole dashboard shows one currency at a time.
  // Default to the currency with the most policies.
  const busiest = [...report.byCurrency].sort((a, b) => b.policies - a.policies)[0].currency
  const currency = picked && report.byCurrency.some((c) => c.currency === picked) ? picked : busiest
  const summary = report.byCurrency.find((c) => c.currency === currency)!
  const split = collectionSplit(report, currency)
  const upcoming = upcomingSeries(report, currency)
  const aging = agingSeries(report, currency)
  const overdueRows = report.overdue.filter((o) => o.currency === currency)
  const collectedPct = summary.totalPremium ? Math.round((summary.collected / summary.totalPremium) * 100) : 0

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Dashboard</h1>
          <p className="subtle">Portfolio as of {formatDate(report.asOf)}</p>
        </div>
        {report.byCurrency.length > 1 && (
          <div className="filters" role="group" aria-label="Currency">
            <div className="seg">
              {report.byCurrency.map((c) => (
                <button key={c.currency} type="button" aria-pressed={c.currency === currency}
                  onClick={() => setPicked(c.currency)}>
                  {c.currency}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Policies</div>
          <div className="value">{summary.policies}</div>
          <div className="hint">in {currency}</div>
        </div>
        <div className="tile">
          <div className="label">Written premium</div>
          <div className="value">{money(summary.totalPremium, currency)}</div>
        </div>
        <div className="tile">
          <div className="label">Collected</div>
          <div className="value">{money(summary.collected, currency)}</div>
          <div className="hint">{collectedPct}% of premium</div>
        </div>
        <div className={`tile${summary.overdueCount ? ' critical' : ''}`}>
          <div className="label">Overdue</div>
          <div className="value">{money(summary.overdueAmount, currency)}</div>
          <div className="hint">{summary.overdueCount} instalment{summary.overdueCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="split-title">
          <div className="chart-title">
            <h2 id="split-title">Premium collection status</h2>
          </div>
          <div className="donut-wrap" style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={split} dataKey="amount" nameKey="label" innerRadius={72} outerRadius={104}
                  paddingAngle={1} stroke="#fcfcfb" strokeWidth={2} isAnimationActive={false}>
                  {split.map((s) => <Cell key={s.key} fill={COLORS[s.key as keyof typeof COLORS]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} title={(p) => String(p.label)} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span className="big">{collectedPct}%</span>
              <span className="small">collected</span>
            </div>
          </div>
          <div className="legend">
            {split.map((s) => (
              <span key={s.key}>
                <i style={{ background: COLORS[s.key as keyof typeof COLORS] }} />
                {s.label} <span className="num">{money(s.amount, currency)}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="upcoming-title">
          <div className="chart-title">
            <h2 id="upcoming-title">Expected collections, next 6 months</h2>
          </div>
          <div style={{ height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={upcoming} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e1e0d9" />
                <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} tickLine={false} />
                <YAxis tickFormatter={compact} {...AXIS} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }}
                  content={<ChartTooltip currency={currency} title={(p) => monthLabel(String(p.month))}
                    extra={(p) => `${p.instalments} instalment${p.instalments === 1 ? '' : 's'} due`} />} />
                <Bar dataKey="amount" fill={COLORS.collected} radius={[4, 4, 0, 0]} maxBarSize={36}
                  isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="aging-title">
          <div className="chart-title">
            <h2 id="aging-title">Overdue by age</h2>
            <span className="subtle num">{money(summary.overdueAmount, currency)}</span>
          </div>
          {summary.overdueCount === 0 ? (
            <p className="empty">✓ Nothing is overdue.</p>
          ) : (
            <div style={{ height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={aging} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                  <XAxis type="number" tickFormatter={compact} {...AXIS} tickLine={false} />
                  <YAxis type="category" dataKey="bucket" {...AXIS} tickLine={false} axisLine={false} width={84} />
                  <Tooltip cursor={{ fill: 'rgba(208,59,59,0.06)' }}
                    content={<ChartTooltip currency={currency} title={(p) => `${p.bucket} overdue`}
                      extra={(p) => `${p.count} instalment${p.count === 1 ? '' : 's'}`} />} />
                  <Bar dataKey="amount" fill={COLORS.overdue} radius={[0, 4, 4, 0]} maxBarSize={28}
                    isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="overdue-title">
          <div className="chart-title">
            <h2 id="overdue-title">Overdue instalments</h2>
            <span className="subtle">{overdueRows.length}</span>
          </div>
          {overdueRows.length === 0 ? (
            <p className="empty">✓ Nothing is overdue.</p>
          ) : (
            <div style={{ maxHeight: 250, overflow: 'auto' }}>
              <table className="simple">
                <thead>
                  <tr>
                    <th>Policy</th><th>Insured</th><th>#</th><th>Due</th>
                    <th className="r">Days</th><th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueRows.map((o) => (
                    <tr key={`${o.policyId}-${o.instalmentNumber}`}>
                      <td><Link to={`/policies/${o.policyId}`}>{o.policyNumber}</Link></td>
                      <td className="wrap">{o.insuredName}</td>
                      <td className="num">{o.instalmentNumber}</td>
                      <td>{formatDate(o.dueDate)}</td>
                      <td className="r num">{o.daysOverdue}</td>
                      <td className="r num">{money(o.amount, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
