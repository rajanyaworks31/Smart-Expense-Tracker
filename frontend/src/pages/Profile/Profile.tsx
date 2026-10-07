import { useEffect, useState } from 'react'
import { getCurrentUser } from '../../services/authApi'
import type { User } from '../../types/api'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUser()
      .then((data) => { if (!cancelled) setUser(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your profile.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <header>
        <p className="text-sm text-[#9a9187]">Account</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h2>
        <p className="mt-2 text-[#756c62]">Your account details.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {loading ? (
        <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 text-sm text-[#8a8178]">Loading your profile…</section>
      ) : user ? (
        <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2d2926] text-lg font-semibold text-white">
              {initials(user.full_name)}
            </div>
            <div>
              <p className="text-xl font-semibold">{user.full_name}</p>
              <p className="text-sm text-[#756c62]">{user.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-[#eee9e2] pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9187]">Member since</dt>
              <dd className="mt-1 text-sm text-[#302b27]">{formatDate(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9187]">Last updated</dt>
              <dd className="mt-1 text-sm text-[#302b27]">{formatDate(user.updated_at)}</dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-[#9a9187]">Editing your name, email, or password isn't available yet.</p>
        </section>
      ) : null}

    </div>
  )
}

export default Profile
