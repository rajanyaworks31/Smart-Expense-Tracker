import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createIncome, deleteIncome, listIncome, updateIncome } from '../../services/incomeApi'
import { getApiErrorStatus } from '../../services/api'
import type { Income as ApiIncome, IncomeCreate } from '../../types/api'

type IncomeForm = {
  amount: string
  source: string
  incomeDate: string
  notes: string
}

const emptyForm: IncomeForm = {
  amount: '',
  source: '',
  incomeDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function formatMoney(value: string | number) {
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function Income() {
  const [income, setIncome] = useState<ApiIncome[]>([])
  const [form, setForm] = useState<IncomeForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await listIncome({ page: 1, pageSize: 100 })
        if (!cancelled) setIncome(response.items)
      } catch (loadError) {
        if (cancelled) return
        setError(getApiErrorStatus(loadError) === 401 ? 'Your session has expired. Please log in again.' : loadError instanceof Error ? loadError.message : 'Could not load your income.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const filteredIncome = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return income
    return income.filter((item) => item.source.toLowerCase().includes(needle) || (item.notes ?? '').toLowerCase().includes(needle))
  }, [income, search])

  const monthIncome = income.reduce((total, item) => total + Number(item.amount), 0)
  const averageIncome = income.length ? monthIncome / income.length : 0

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  const openEdit = (item: ApiIncome) => {
    setEditingId(item.id)
    setForm({ amount: item.amount, source: item.source, incomeDate: item.income_date, notes: item.notes ?? '' })
    setShowForm(true)
    setError('')
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const payload: IncomeCreate = {
      amount: form.amount,
      source: form.source.trim(),
      income_date: form.incomeDate,
      notes: form.notes.trim() || null,
    }

    try {
      if (editingId) {
        const updated = await updateIncome(editingId, payload)
        setIncome((current) => current.map((item) => item.id === editingId ? updated : item))
      } else {
        const created = await createIncome(payload)
        setIncome((current) => [created, ...current])
      }
      closeForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this income.')
    }
  }

  const handleDelete = async (item: ApiIncome) => {
    if (!window.confirm(`Delete "${item.source}" income of ₹${formatMoney(item.amount)}?`)) return
    setError('')
    try {
      await deleteIncome(item.id)
      setIncome((current) => current.filter((entry) => entry.id !== item.id))
      if (editingId === item.id) closeForm()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this income.')
    }
  }

  return (
    <div className="space-y-7 pb-10">
      <header className="relative overflow-hidden rounded-[28px] border border-[#e5ded4] bg-[#fbf7f0] px-6 py-7 shadow-[0_14px_45px_rgba(77,65,52,0.06)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#e8dfcf]/70 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a08f7b]">Money in · August</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#29251f] sm:text-4xl">Keep your money coming into view. ✦</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#766e64] sm:text-base">Track salary, freelance work, gifts, and every other stream without losing the bigger picture.</p>
          </div>
          <button type="button" onClick={showForm ? closeForm : openCreate} className="w-fit rounded-2xl bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,43,39,0.16)] transition hover:-translate-y-0.5">{showForm ? 'Close form' : '+ Add income'}</button>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-[#efd5cc] bg-[#fdf1ed] px-4 py-3 text-sm text-[#8f564a]" role="alert">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-[26px] border border-[#e5ded4] bg-white/85 p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a0968b]">{editingId ? 'Edit income' : 'New income'}</p>
              <h3 className="mt-1 text-xl font-semibold text-[#37312b]">{editingId ? 'Update this money entry' : 'Add money received'}</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#5f574e]">Amount<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e1d9cf] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#b7aa99] focus:bg-white" placeholder="65000" /></label>
            <label className="text-sm font-medium text-[#5f574e]">Source<input required maxLength={120} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e1d9cf] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#b7aa99] focus:bg-white" placeholder="Salary" /></label>
            <label className="text-sm font-medium text-[#5f574e]">Date<input required type="date" value={form.incomeDate} onChange={(event) => setForm({ ...form, incomeDate: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e1d9cf] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#b7aa99] focus:bg-white" /></label>
            <label className="text-sm font-medium text-[#5f574e]">Notes <span className="font-normal text-[#9a9187]">(optional)</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e1d9cf] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#b7aa99] focus:bg-white" placeholder="August salary" /></label>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-xl bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white">{editingId ? 'Save changes' : 'Add income'}</button>
            <button type="button" onClick={closeForm} className="rounded-xl border border-[#e1d9cf] px-5 py-3 text-sm font-semibold text-[#6f665d]">Cancel</button>
          </div>
        </form>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-[#e8e0d6] bg-white/75 p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#a1988e]">Income this month</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[#2e2a25]">₹{formatMoney(monthIncome)}</p><p className="mt-1 text-xs text-[#8d847a]">Across {income.length} entries</p></div>
        <div className="rounded-[22px] border border-[#dfe8e2] bg-[#edf4ef] p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#83978b]">Average entry</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[#34483d]">₹{formatMoney(averageIncome)}</p><p className="mt-1 text-xs text-[#73867c]">Per recorded income</p></div>
        <div className="rounded-[22px] border border-[#e8e0d6] bg-[#f1ebe1] p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9b8d7c]">Latest source</p><p className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#40382f]">{income[0]?.source ?? '—'}</p><p className="mt-1 text-xs text-[#8b8176]">{income[0] ? formatDate(income[0].income_date) : 'No income yet'}</p></div>
      </section>

      <section className="rounded-[26px] border border-[#e5ded4] bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a0968b]">Your transactions</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-[#302b26]">Recent income</h3></div>
          <span className="w-fit rounded-full bg-[#f4f0e9] px-3 py-1.5 text-xs font-medium text-[#81776c]">{filteredIncome.length} shown</span>
        </div>
        <div className="mt-5 flex items-center rounded-2xl border border-[#e3dcd2] bg-[#faf8f4] px-4 focus-within:border-[#b7aa99] focus-within:bg-white">
          <span className="mr-2 text-sm text-[#9b9186]">⌕</span><input aria-label="Search income" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-3 text-sm text-[#38322c] outline-none placeholder:text-[#aaa095]" placeholder="Search salary, freelance, gifts..." />
        </div>
        <div className="mt-4 space-y-2.5">
          {isLoading ? <div className="rounded-[20px] border border-dashed border-[#ddd4c9] px-5 py-14 text-center text-sm text-[#8f877e]">Loading your income…</div> : filteredIncome.length ? filteredIncome.map((item) => (
            <article key={item.id} className="group flex items-center gap-4 rounded-[19px] bg-[#faf8f4] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_rgba(70,59,48,0.07)]">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3eee6] text-[#587765]">↑</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#37312b]">{item.source}</p><p className="mt-1 text-xs text-[#968c82]">{formatDate(item.income_date)}{item.notes ? ` · ${item.notes}` : ''}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm font-semibold text-[#4b695a]">+ ₹{formatMoney(item.amount)}</span><div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100"><button type="button" onClick={() => openEdit(item)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756c62] hover:bg-[#eee9e2]">Edit</button><button type="button" onClick={() => void handleDelete(item)} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#9a5d4f] hover:bg-[#fdf1ed]">Delete</button></div></div>
            </article>
          )) : <div className="rounded-[20px] border border-dashed border-[#ddd4c9] px-5 py-14 text-center text-sm text-[#8f877e]">No income entries found.</div>}
        </div>
      </section>
    </div>
  )
}

export default Income
