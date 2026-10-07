import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { createBudget, deleteBudget, listBudgets, updateBudget } from '../../services/budgetApi'
import { getAnalyticsSummary } from '../../services/analyticsApi'
import type { Budget, BudgetCreate, BudgetUpdate, BudgetUtilization } from '../../types/api'

function formatMoney(value: string) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function currentMonthRange() {
  const today = new Date()
  const toISO = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return {
    start_date: toISO(new Date(today.getFullYear(), today.getMonth(), 1)),
    end_date: toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  }
}

function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [utilization, setUtilization] = useState<Record<string, BudgetUtilization>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [form, setForm] = useState<BudgetCreate>({
    name: '',
    amount: '',
    period: 'monthly',
    ...currentMonthRange(),
  })

  const loadBudgetsAndUtilization = () => {
    const { start_date, end_date } = currentMonthRange()
    return Promise.all([listBudgets(), getAnalyticsSummary(start_date, end_date)])
      .then(([budgetList, summary]) => {
        setBudgets(budgetList)
        const map: Record<string, BudgetUtilization> = {}
        for (const item of summary.budget_utilization) {
          map[item.budget_id] = item
        }
        setUtilization(map)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load your budgets.')
      })
  }

  useEffect(() => {
    void loadBudgetsAndUtilization().finally(() => setLoading(false))
  }, [])

  const monthlyBudgets = useMemo(() => budgets.filter((budget) => budget.period === 'monthly'), [budgets])

  const getUtilization = (budget: Budget): BudgetUtilization =>
    utilization[budget.id] ?? {
      budget_id: budget.id,
      budget_name: budget.name,
      limit: budget.amount,
      spent: '0',
      remaining: budget.amount,
      utilization_percentage: '0',
    }

  const totalBudget = monthlyBudgets.reduce((sum, budget) => sum + Number(budget.amount), 0)
  const totalSpent = monthlyBudgets.reduce((sum, budget) => sum + Number(getUtilization(budget).spent), 0)
  const totalRemaining = Math.max(totalBudget - totalSpent, 0)
  const totalPercent = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  const openCreate = () => {
    setEditingBudget(null)
    setForm({ name: '', amount: '', period: 'monthly', ...currentMonthRange() })
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setForm({
      category_id: budget.category_id,
      name: budget.name,
      amount: budget.amount,
      period: 'monthly',
      start_date: budget.start_date,
      end_date: budget.end_date,
    })
    setError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditingBudget(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name || Number(form.amount) <= 0 || !form.start_date || !form.end_date) {
      setError('Enter a budget name, valid amount, and date range.')
      return
    }
    if (form.start_date > form.end_date) {
      setError('Start date cannot be after the end date.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editingBudget) {
        const payload: BudgetUpdate = {
          category_id: form.category_id,
          name,
          amount: form.amount,
          period: 'monthly',
          start_date: form.start_date,
          end_date: form.end_date,
        }
        const updated = await updateBudget(editingBudget.id, payload)
        setBudgets((items) => items.map((item) => item.id === updated.id ? updated : item))
      } else {
        const created = await createBudget({ ...form, name, period: 'monthly' })
        setBudgets((items) => [...items, created])
      }
      closeForm()
      void loadBudgetsAndUtilization()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save this budget.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (budget: Budget) => {
    if (!window.confirm(`Delete “${budget.name}”? This cannot be undone.`)) return
    try {
      await deleteBudget(budget.id)
      setBudgets((items) => items.filter((item) => item.id !== budget.id))
      setUtilization((map) => {
        const next = { ...map }
        delete next[budget.id]
        return next
      })
      if (editingBudget?.id === budget.id) closeForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete this budget.')
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4">
        <div><p className="text-sm text-[#9a9187]">Planning</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Budgets</h2><p className="mt-2 text-[#756c62]">Give every rupee a purpose.</p></div>
        <button type="button" onClick={openCreate} className="rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white">+ New budget</button>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {loading ? <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 text-sm text-[#8a8178]">Loading your budgets…</section> : (
        <>
          <section className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-sm text-[#8a8178]">Total monthly budget</p><p className="mt-1 text-2xl font-semibold">{formatMoney(totalSpent.toFixed(2))} / {formatMoney(totalBudget.toFixed(2))}</p></div><span className="text-sm font-semibold">{totalPercent.toFixed(0)}%</span></div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#eee9e2]"><div className="h-full rounded-full bg-[#2d2926] transition-all" style={{ width: `${totalPercent}%` }} /></div>
            <p className="mt-3 text-sm text-[#756c62]">{formatMoney(totalRemaining.toFixed(2))} remaining · Edit the individual budgets below to change this total.</p>
          </section>

          {monthlyBudgets.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-[#d8d0c4] bg-[#faf8f4] p-8"><h3 className="font-semibold">Create your first budget</h3><p className="mt-2 text-sm text-[#8a8178]">Set a monthly spending limit for food, transport, entertainment, or anything else.</p><button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white">Create budget</button></section>
          ) : (
            <section className="grid gap-4 md:grid-cols-3">
              {monthlyBudgets.map((budget) => {
                const budgetUtilization = getUtilization(budget)
                const percent = Number(budgetUtilization.utilization_percentage)
                const barPercent = Math.min(percent, 100)
                return <article key={budget.id} className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><p className="font-semibold">{budget.name}</p><span className="text-xs text-[#9a9187]">{percent.toFixed(0)}% used</span></div>
                  <p className="mt-3 text-sm text-[#756c62]">{formatMoney(budgetUtilization.spent)} / {formatMoney(budget.amount)}</p>
                  <div className="mt-4 h-2 rounded-full bg-[#eee9e2]"><div className="h-full rounded-full bg-[#b9afa2] transition-all" style={{ width: `${barPercent}%` }} /></div>
                  <p className="mt-2 text-xs text-[#9a9187]">{formatMoney(budgetUtilization.remaining)} remaining</p>
                  <div className="mt-4 flex gap-2 border-t border-[#eee9e2] pt-3"><button type="button" onClick={() => openEdit(budget)} className="rounded-lg px-2 py-1.5 text-sm font-medium text-[#4b443e] hover:bg-[#f3efe9]">Edit</button><button type="button" onClick={() => void handleDelete(budget)} className="rounded-lg px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button></div>
                </article>
              })}
            </section>
          )}
        </>
      )}

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]" onMouseDown={(event) => event.currentTarget === event.target && closeForm()}>
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-[#e3ddd4] bg-[#fcfaf7] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-[#9a9187]">Monthly budget</p><h3 className="mt-1 text-xl font-semibold">{editingBudget ? 'Edit budget' : 'New budget'}</h3></div><button type="button" onClick={closeForm} className="rounded-lg px-2 py-1 text-lg text-[#8a8178] hover:bg-[#eee9e2]">×</button></div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Budget name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" placeholder="e.g. Food" /></label>
            <label className="block text-sm font-medium">Monthly limit<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Start date<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label><label className="block text-sm font-medium">End date<input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[#d8d0c4] bg-white px-3 py-2.5 outline-none focus:border-[#2d2926]" /></label></div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#756c62] hover:bg-[#eee9e2]">Cancel</button><button disabled={saving} className="rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editingBudget ? 'Save changes' : 'Create budget'}</button></div>
        </form>
      </div>}
    </div>
  )
}
export default Budgets
