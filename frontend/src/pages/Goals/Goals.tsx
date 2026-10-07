import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import type { AnalyticsSummary, SavingsGoal, SavingsGoalCreate, SavingsGoalUpdate } from '../../types/api'
import { getAnalyticsSummary } from '../../services/analyticsApi'
import { createGoal, deleteGoal, listGoals, updateGoal } from '../../services/goalApi'

const emptyForm: SavingsGoalCreate = {
  name: '',
  target_amount: '',
  current_amount: '0.00',
  target_date: null,
}

function formatMoney(value: string) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function getCurrentMonthRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const toISO = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return { startDate: toISO(start), endDate: toISO(end) }
}

function Goals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SavingsGoalCreate>({ ...emptyForm })

  useEffect(() => {
    let active = true
    const { startDate, endDate } = getCurrentMonthRange()
    Promise.allSettled([listGoals(), getAnalyticsSummary(startDate, endDate)])
      .then(([goalResult, analyticsResult]) => {
        if (!active) return
        if (goalResult.status === 'fulfilled') setGoals(goalResult.value)
        if (analyticsResult.status === 'fulfilled') setSummary(analyticsResult.value)
        if (goalResult.status === 'rejected') {
          setError(goalResult.reason instanceof Error ? goalResult.reason.message : 'Could not load savings goals.')
        } else if (analyticsResult.status === 'rejected') {
          setError(analyticsResult.reason instanceof Error ? analyticsResult.reason.message : 'Could not load this month’s savings.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const openCreate = () => {
    setError(null)
    setEditingGoal(null)
    setForm({ ...emptyForm })
    setFormOpen(true)
  }

  const openEdit = (goal: SavingsGoal) => {
    setError(null)
    setEditingGoal(goal)
    setFormOpen(true)
    setForm({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      target_date: goal.target_date,
    })
  }

  const closeForm = () => {
    if (saving) return
    setEditingGoal(null)
    setForm({ ...emptyForm })
    setFormOpen(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const name = form.name.trim()
    const target = Number(form.target_amount)
    const current = Number(form.current_amount ?? '0')

    if (!name || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0) {
      setError('Enter a goal name and valid amounts.')
      return
    }
    if (current > target) {
      setError('Current amount cannot be greater than the target.')
      return
    }

    setSaving(true)
    try {
      if (editingGoal) {
        const payload: SavingsGoalUpdate = {
          name,
          target_amount: form.target_amount,
          current_amount: form.current_amount,
          target_date: form.target_date || null,
        }
        const updated = await updateGoal(editingGoal.id, payload)
        setGoals((items) => items.map((goal) => (goal.id === updated.id ? updated : goal)))
      } else {
        const created = await createGoal({
          name,
          target_amount: form.target_amount,
          current_amount: form.current_amount || '0.00',
          target_date: form.target_date || null,
        })
        setGoals((items) => [...items, created])
      }
      closeForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save this goal.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (goal: SavingsGoal) => {
    if (!window.confirm(`Delete “${goal.name}”? This cannot be undone.`)) return

    setError(null)
    try {
      await deleteGoal(goal.id)
      setGoals((items) => items.filter((item) => item.id !== goal.id))
      if (editingGoal?.id === goal.id) closeForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete this goal.')
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#9a9187]">Future plans</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Savings Goals</h2>
          <p className="mt-2 text-[#756c62]">Turn your plans into something measurable.</p>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5">
          + New goal
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && summary && (
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-[#8a8178]">Income this month</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(summary.total_income)}</p>
          </article>
          <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-[#8a8178]">Spent this month</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(summary.total_expenses)}</p>
          </article>
          <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-[#8a8178]">Net saved this month</p>
            <p className={`mt-2 text-2xl font-semibold ${Number(summary.net_cash_flow) < 0 ? 'text-red-600' : ''}`}>
              {formatMoney(summary.net_cash_flow)}
            </p>
          </article>
        </section>
      )}

      {loading ? (
        <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 text-sm text-[#8a8178]">Loading your goals…</section>
      ) : goals.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#d8d0c4] bg-[#faf8f4] p-8">
          <p className="text-2xl">＋</p>
          <h3 className="mt-4 font-semibold">Create your first goal</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#8a8178]">A trip, emergency fund, new laptop — give your next goal a number and a deadline.</p>
          <button onClick={openCreate} className="mt-5 rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white">Create goal</button>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2">
          {goals.map((goal) => {
            const progress = Math.min(Number(goal.progress_percentage), 100)
            return (
              <article key={goal.id} className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{goal.name}</h3>
                    <p className="mt-2 text-2xl font-semibold">{formatMoney(goal.current_amount)} <span className="text-sm font-normal text-[#9a9187]">/ {formatMoney(goal.target_amount)}</span></p>
                  </div>
                  <span className="text-sm text-[#8a8178]">{progress.toFixed(0)}%</span>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-[#eee9e2]">
                  <div className="h-full rounded-full bg-[#2d2926] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#756c62]">
                  <span>{formatMoney(goal.remaining_amount)} remaining</span>
                  <span>{goal.target_date ? `Target ${new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'No deadline'}</span>
                </div>
                <div className="mt-5 flex gap-2 border-t border-[#eee9e2] pt-4">
                  <button onClick={() => openEdit(goal)} className="rounded-lg px-3 py-2 text-sm font-medium text-[#4b443e] transition hover:bg-[#f3efe9]">Edit</button>
                  <button onClick={() => void handleDelete(goal)} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">Delete</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]" onMouseDown={(event) => event.currentTarget === event.target && closeForm()}>
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-[#e3ddd4] bg-[#fcfaf7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#9a9187]">Savings goal</p>
                <h3 className="mt-1 text-xl font-semibold">{editingGoal ? 'Edit goal' : 'New goal'}</h3>
              </div>
              <button type="button" onClick={closeForm} className="rounded-lg px-2 py-1 text-lg text-[#8a8178] hover:bg-[#eee9e2]">×</button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Goal name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" placeholder="e.g. Goa Trip" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Target amount<input type="number" min="0.01" step="0.01" value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label>
                <label className="block text-sm font-medium">Saved so far<input type="number" min="0" step="0.01" value={form.current_amount ?? ''} onChange={(event) => setForm({ ...form, current_amount: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label>
              </div>
              <label className="block text-sm font-medium">Target date<input type="date" value={form.target_date ?? ''} onChange={(event) => setForm({ ...form, target_date: event.target.value || null })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#756c62] hover:bg-[#eee9e2]">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editingGoal ? 'Save changes' : 'Create goal'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Goals
