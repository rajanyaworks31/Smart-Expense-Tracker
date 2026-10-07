import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../../services/authApi'

function ProtectedRoute() {
  const location = useLocation()
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then(() => {
        if (active) setStatus('authenticated')
      })
      .catch(() => {
        if (active) setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2eb] px-5 text-[#302b26]">
        <div className="rounded-2xl border border-[#e3dbd0] bg-[#fffdfa] px-6 py-4 text-sm text-[#766e64] shadow-[0_16px_40px_rgba(77,65,52,0.06)]">
          Loading your money space…
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute
