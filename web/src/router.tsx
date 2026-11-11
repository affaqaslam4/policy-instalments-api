import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'

// Pages are loaded on demand: the charts (Recharts) and the grid (AG Grid) are large,
// and each page only downloads what it uses.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: <p className="subtle">Loading…</p>,
    children: [
      { path: '/', lazy: async () => ({ Component: (await import('./pages/DashboardPage')).DashboardPage }) },
      { path: '/policies', lazy: async () => ({ Component: (await import('./pages/PoliciesPage')).PoliciesPage }) },
      {
        path: '/policies/new',
        lazy: async () => ({ Component: (await import('./pages/CreatePolicyPage')).CreatePolicyPage }),
      },
      { path: '/policies/:id', lazy: async () => ({ Component: (await import('./pages/PolicyPage')).PolicyPage }) },
    ],
  },
])
