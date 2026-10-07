import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { logout } from '../../services/authApi'

const navigation = [
  { label: 'Dashboard', to: '/', icon: '⌂' },
  { label: 'Expenses', to: '/expenses', icon: '−' },
  { label: 'Income', to: '/income', icon: '+' },
  { label: 'Budgets', to: '/budgets', icon: '◫' },
  { label: 'Savings Goals', to: '/goals', icon: '◎' },
  { label: 'Analytics', to: '/analytics', icon: '⌁' },
  { label: 'AI Advisor', to: '/ai', icon: '✦' },
]

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-[#2d2926] text-white shadow-sm'
      : 'text-[#756c62] hover:bg-white hover:text-[#2d2926]'
  }`

function AppLayout() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // Even if the request fails, clear the client-side session by redirecting to login.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2d2926]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#e5dfd6] bg-[#f9f7f3] px-5 py-6 lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a9187]">
            Smart
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Expense Tracker</h1>
        </div>

        <nav className="space-y-1.5" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClasses}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 text-sm">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-[#e5dfd6] pt-5">
          <NavLink to="/profile" className={linkClasses}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5">◯</span>
            Profile
          </NavLink>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#756c62] transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5">⏻</span>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#e5dfd6] bg-[#f7f4ef]/90 px-5 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9a9187]">Smart</p>
              <p className="font-semibold">Expense Tracker</p>
            </div>
            <span className="rounded-full border border-[#ddd5ca] bg-white px-3 py-1.5 text-xs font-medium text-[#756c62]">
              Overview
            </span>
          </div>
        </header>

        <main className="mx-auto min-h-screen max-w-7xl px-5 py-7 pb-24 sm:px-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5dfd6] bg-[#faf8f4]/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-xl items-center justify-around">
            {navigation.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium ${
                    isActive ? 'text-[#2d2926]' : 'text-[#9a9187]'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label === 'Savings Goals' ? 'Goals' : item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default AppLayout
