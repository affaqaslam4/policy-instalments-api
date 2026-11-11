import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Link } from 'react-router'
import { POLICIES, type PolicySummary } from '../lib/graphql'
import { errorMessage, frequencyLabel, money } from '../lib/format'
import { gridTheme } from '../lib/gridTheme'

export function PoliciesPage() {
  const { data, loading, error } = useQuery(POLICIES, { fetchPolicy: 'cache-and-network' })

  const columns = useMemo<ColDef<PolicySummary>[]>(() => [
    {
      field: 'policyNumber', headerName: 'Policy', minWidth: 140,
      cellRenderer: (p: { data?: PolicySummary }) =>
        p.data ? <Link to={`/policies/${p.data.id}`}>{p.data.policyNumber}</Link> : null,
    },
    { field: 'insuredName', headerName: 'Insured', flex: 1.5, minWidth: 180 },
    { field: 'frequency', headerName: 'Frequency', valueFormatter: (p) => frequencyLabel[p.value] ?? p.value },
    {
      field: 'totalPremium', headerName: 'Premium', type: 'rightAligned',
      valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''),
    },
    {
      field: 'amountPaid', headerName: 'Collected', type: 'rightAligned',
      valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''),
    },
    {
      field: 'outstanding', headerName: 'Outstanding', type: 'rightAligned',
      valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''),
    },
    {
      headerName: 'Paid', minWidth: 110,
      valueGetter: (p) => (p.data ? Math.round((p.data.amountPaid / p.data.totalPremium) * 100) : 0),
      valueFormatter: (p) => `${p.value}%`,
      type: 'rightAligned',
    },
  ], [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Policies</h1>
          <p className="subtle">{data ? `${data.policies.length} policies` : ' '}</p>
        </div>
        <Link to="/policies/new" className="btn">New policy</Link>
      </div>

      {error && <div className="alert error" role="alert">{errorMessage(error)}</div>}

      {!loading && data?.policies.length === 0 ? (
        <div className="card empty">
          <p>No policies yet.</p>
          <Link to="/policies/new" className="btn">Create the first policy</Link>
        </div>
      ) : (
        <div className="grid-wrap">
          <AgGridReact<PolicySummary>
            theme={gridTheme}
            rowData={data?.policies}
            columnDefs={columns}
            defaultColDef={{ flex: 1, minWidth: 120, sortable: true, filter: true }}
            getRowId={(p) => p.data.id}
            loading={loading && !data}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
          />
        </div>
      )}
    </>
  )
}
