import { NavLink, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Policy Instalments</span>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/policies" end>Policies</NavLink>
          <NavLink to="/policies/new" className="nav-cta">New policy</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
