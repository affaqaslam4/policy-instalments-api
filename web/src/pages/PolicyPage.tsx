import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Link, useParams } from 'react-router'
import { PAY_INSTALMENT, POLICIES, POLICY, PORTFOLIO_REPORT, type Instalment } from '../lib/graphql'
import { errorMessage, formatDate, frequencyLabel, money, todayIso } from '../lib/format'
import { displayStatus, nextPayable } from '../lib/instalments'
import { gridTheme } from '../lib/gridTheme'
import { StatusBadge } from '../components/StatusBadge'
import { PayDialog } from '../components/PayDialog'

export function PolicyPage() {
  const { id = '' } = useParams()
  const { data, loading, error } = useQuery(POLICY, { variables: { id } })
  const [paying, setPaying] = useState<Instalment | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pay, { loading: submitting }] = useMutation(PAY_INSTALMENT, {
    // The policy itself updates through the normalised cache; the list and dashboard are refetched.
    refetchQueries: [POLICIES, PORTFOLIO_REPORT],
  })

  const policy = data?.policyById
  const today = todayIso()
  const next = policy ? nextPayable(policy.instalments) : undefined

  const columns = useMemo<ColDef<Instalment>[]>(() => {
    if (!policy) return []
    return [
      { field: 'number', headerName: '#', maxWidth: 80, sort: 'asc' },
      { field: 'dueDate', headerName: 'Due date', valueFormatter: (p) => formatDate(p.value) },
      {
        field: 'amount', headerName: 'Amount', type: 'rightAligned',
        valueFormatter: (p) => money(p.value, policy.currency),
      },
      {
        headerName: 'Status', colId: 'status',
        valueGetter: (p) => (p.data ? displayStatus(p.data, today) : ''),
        cellRenderer: (p: { data?: Instalment }) =>
          p.data ? <StatusBadge status={displayStatus(p.data, today)} /> : null,
      },
      { field: 'paidOn', headerName: 'Paid on', valueFormatter: (p) => formatDate(p.value) },
      {
        headerName: '', colId: 'action', sortable: false, filter: false, maxWidth: 140,
        cellRenderer: (p: { data?: Instalment }) => {
          if (!p.data || p.data.status === 'PAID') return null
          const isNext = p.data.number === next?.number
          return (
            <button type="button" className="btn small" disabled={!isNext}
              title={isNext ? undefined : 'Pay the earlier instalments first'}
              onClick={() => { setPayError(null); setNotice(null); setPaying(p.data!) }}>
              Pay
            </button>
          )
        },
      },
    ]
  }, [policy, next?.number, today])

  if (loading && !data) return <p className="subtle">Loading policy…</p>
  if (error) return <div className="alert error" role="alert">{errorMessage(error)}</div>
  if (!policy) {
    return (
      <div className="card empty">
        <p>Policy not found.</p>
        <Link to="/policies">Back to policies</Link>
      </div>
    )
  }

  const paidPct = Math.round((policy.amountPaid / policy.totalPremium) * 100)
  const overdue = policy.instalments.filter((i) => displayStatus(i, today) === 'Overdue')

  const confirmPayment = async (amount: number, paidOn: string) => {
    if (!paying) return
    try {
      await pay({ variables: { input: { policyId: policy.id, instalmentNumber: paying.number, amount, paidOn } } })
      setNotice(`Instalment ${paying.number} recorded as paid.`)
      setPaying(null)
    } catch (e) {
      setPayError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <p className="subtle"><Link to="/policies">Policies</Link> / {policy.policyNumber}</p>
          <h1>{policy.insuredName}</h1>
          <p className="subtle">{policy.policyNumber}</p>
        </div>
        {next && (
          <button type="button" className="btn" onClick={() => { setPayError(null); setNotice(null); setPaying(next) }}>
            Pay instalment {next.number}
          </button>
        )}
      </div>

      {notice && <div className="alert success" role="status">{notice}</div>}

      <section className="card" aria-label="Policy details">
        <dl className="facts">
          <div><dt>Total premium</dt><dd>{money(policy.totalPremium, policy.currency)}</dd></div>
          <div><dt>Collected</dt><dd>{money(policy.amountPaid, policy.currency)}</dd></div>
          <div><dt>Outstanding</dt><dd>{money(policy.outstanding, policy.currency)}</dd></div>
          <div>
            <dt>Overdue</dt>
            <dd style={{ color: overdue.length ? 'var(--critical)' : undefined }}>
              {overdue.length
                ? `${overdue.length} · ${money(overdue.reduce((s, i) => s + i.amount, 0), policy.currency)}`
                : 'None'}
            </dd>
          </div>
          <div><dt>Inception</dt><dd>{formatDate(policy.inceptionDate)}</dd></div>
          <div><dt>Frequency</dt><dd>{frequencyLabel[policy.frequency]} · {policy.instalments.length} instalments</dd></div>
        </dl>
        <div className="progress" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100}
          aria-label="Premium collected">
          <span style={{ width: `${paidPct}%` }} />
        </div>
        <p className="subtle" style={{ marginTop: 6, fontSize: '0.85rem' }}>{paidPct}% of the premium collected</p>
      </section>

      <section>
        <h2>Instalments</h2>
        <div style={{ height: Math.min(56 + policy.instalments.length * 43, 600) }}>
          <AgGridReact<Instalment>
            theme={gridTheme}
            rowData={policy.instalments}
            columnDefs={columns}
            defaultColDef={{ flex: 1, minWidth: 110, sortable: true }}
            getRowId={(p) => String(p.data.number)}
          />
        </div>
      </section>

      {paying && (
        <PayDialog
          instalment={paying}
          currency={policy.currency}
          submitting={submitting}
          error={payError}
          onConfirm={confirmPayment}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  )
}
