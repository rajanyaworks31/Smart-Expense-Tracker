import { useEffect, useMemo, useState } from 'react'
import AddExpenseForm from '../../components/expenses/AddExpenseForm'
import type { ExpenseFormData } from '../../components/expenses/AddExpenseForm'
import { createCategory, createExpense, deleteExpense, listCategories, listExpenses, updateExpense } from '../../services/expenseApi'
import { getApiErrorStatus } from '../../services/api'
import type { Category as ApiCategory, Expense as ApiExpense } from '../../types/api'

type Expense = ExpenseFormData & { id: string }

type Category = {
  id: string
  name: string
  icon: string
  tone: string
  soft: string
}

const categoryPresentation: Record<string, Omit<Category, 'id' | 'name'>> = {
  Food: { icon: '☕', tone: 'text-[#8b5e3c]', soft: 'bg-[#f5e8dc]' },
  Transport: { icon: '↗', tone: 'text-[#56706a]', soft: 'bg-[#e2eee9]' },
  Shopping: { icon: '✦', tone: 'text-[#7a638a]', soft: 'bg-[#eee5f3]' },
  Entertainment: { icon: '◌', tone: 'text-[#8b6170]', soft: 'bg-[#f4e4e9]' },
  Bills: { icon: '⌁', tone: 'text-[#6a6f85]', soft: 'bg-[#e8eaf2]' },
  Health: { icon: '+', tone: 'text-[#587765]', soft: 'bg-[#e3eee6]' },
  Education: { icon: '✎', tone: 'text-[#746b55]', soft: 'bg-[#f1ecd9]' },
  Other: { icon: '•', tone: 'text-[#6e6962]', soft: 'bg-[#ebe8e3]' },
}

const defaultCategories = Object.keys(categoryPresentation)

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const pad = (value: number) => String(value).padStart(2, '0')
  const startDate = `${year}-${pad(month + 1)}-01`
  const nextMonth = month === 11 ? 0 : month + 1
  const nextMonthYear = month === 11 ? year + 1 : year
  const nextMonthStart = `${nextMonthYear}-${pad(nextMonth + 1)}-01`
  return { startDate, nextMonthStart }
}

function toUiCategory(category: ApiCategory): Category {
  const presentation = categoryPresentation[category.name] ?? categoryPresentation.Other
  return { id: category.id, name: category.name, ...presentation }
}

function toUiExpense(expense: ApiExpense, categories: Category[]): Expense {
  return {
    id: expense.id,
    description: expense.description,
    category: categories.find((category) => category.id === expense.category_id)?.name ?? 'Other',
    date: expense.expense_date,
    amount: Number(expense.amount),
  }
}

function toApiExpense(data: ExpenseFormData, categories: Category[]) {
  const category = categories.find((item) => item.name === data.category)
  if (!category) throw new Error(`Category "${data.category}" is not available.`)

  return {
    category_id: category.id,
    amount: data.amount.toFixed(2),
    description: data.description,
    expense_date: data.date,
  }
}

function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        let apiCategories = await listCategories()

        if (apiCategories.length === 0) {
          apiCategories = await Promise.all(
            defaultCategories.map((name) => createCategory({ name, icon: categoryPresentation[name].icon })),
          )
        }

        if (cancelled) return
        const categoryList = apiCategories.map(toUiCategory)
        setCategories(categoryList)
        const response = await listExpenses({ page: 1, pageSize: 100 })
        if (!cancelled) setExpenses(response.items.map((expense) => toUiExpense(expense, categoryList)))
      } catch (loadError) {
        if (cancelled) return
        if (getApiErrorStatus(loadError) === 401) {
          setError('Your session has expired. Please log in again.')
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Could not load your expenses.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const matchesSearch = `${expense.description} ${expense.category}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || expense.category === activeCategory
    return matchesSearch && matchesCategory
  }), [expenses, search, activeCategory])

  const { startDate: currentMonthStart, nextMonthStart } = getCurrentMonthRange()
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date >= currentMonthStart && expense.date < nextMonthStart),
    [expenses, currentMonthStart, nextMonthStart],
  )
  const monthTotal = monthExpenses.reduce((total, expense) => total + expense.amount, 0)
  const dailyAverage = Math.round(monthTotal / Math.max(new Date().getDate(), 1))
  const average = monthExpenses.length ? Math.round(monthTotal / monthExpenses.length) : 0

  const categoryTotals = categories
    .map((category) => ({ ...category, total: monthExpenses.filter((expense) => expense.category === category.name).reduce((sum, expense) => sum + expense.amount, 0) }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total)

  const handleAddExpense = async (expense: ExpenseFormData) => {
    setError('')
    try {
      const created = await createExpense(toApiExpense(expense, categories))
      setExpenses((current) => [toUiExpense(created, categories), ...current])
      setShowForm(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add the expense.')
    }
  }

  const handleUpdateExpense = async (expense: ExpenseFormData) => {
    if (editingExpenseId === null) return
    setError('')
    try {
      const updated = await updateExpense(editingExpenseId, toApiExpense(expense, categories))
      setExpenses((current) => current.map((item) => (item.id === editingExpenseId ? toUiExpense(updated, categories) : item)))
      setEditingExpenseId(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update the expense.')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    const expense = expenses.find((item) => item.id === id)
    if (!expense) return
    if (!window.confirm(`Delete "${expense.description}"?`)) return

    setError('')
    try {
      await deleteExpense(id)
      setExpenses((current) => current.filter((item) => item.id !== id))
      setDeletedExpense(expense)
      if (editingExpenseId === id) setEditingExpenseId(null)
      if (selectedExpenseId === id) setSelectedExpenseId(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the expense.')
    }
  }

  const handleUndoDelete = async () => {
    if (!deletedExpense) return
    setError('')
    try {
      const restored = await createExpense(toApiExpense(deletedExpense, categories))
      setExpenses((current) => [toUiExpense(restored, categories), ...current])
      setDeletedExpense(null)
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Could not restore the expense.')
    }
  }

  useEffect(() => {
    if (!deletedExpense) return
    const timeout = window.setTimeout(() => setDeletedExpense(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [deletedExpense])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedExpenseId(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const getCategory = (name: string) => categories.find((item) => item.name === name) ?? { id: '', name: 'Other', ...categoryPresentation.Other }

  return (
    <div className="space-y-7 pb-10">
      <header className="relative overflow-hidden rounded-[28px] border border-[#e5ded4] bg-[#fbf7f0] px-6 py-7 shadow-[0_14px_45px_rgba(77,65,52,0.06)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#eadfce]/70 blur-2xl" />
        <div className="absolute bottom-[-70px] left-1/3 h-40 w-40 rounded-full bg-[#e4ebe5]/70 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a08f7b]">Your spending space · {new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date())}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#29251f] sm:text-4xl">Where did your money wander? ✦</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#766e64] sm:text-base">A calmer way to see your everyday spending, spot little patterns, and keep your money story in view.</p>
          </div>
          <button type="button" onClick={() => { setEditingExpenseId(null); setShowForm((current) => !current) }} className="group inline-flex w-fit items-center gap-2 rounded-2xl bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,43,39,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(47,43,39,0.2)]">
            <span className="text-lg leading-none transition-transform duration-200 group-hover:rotate-90">+</span>
            {showForm ? 'Close form' : 'Add expense'}
          </button>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-[#efd5cc] bg-[#fdf1ed] px-4 py-3 text-sm text-[#8f564a]" role="alert">{error}</div>}

      {showForm && <AddExpenseForm categories={categories.map((item) => item.name)} onAdd={handleAddExpense} onCancel={() => setShowForm(false)} />}

      {editingExpenseId !== null && (() => {
        const expenseToEdit = expenses.find((item) => item.id === editingExpenseId)
        if (!expenseToEdit) return null
        return <AddExpenseForm categories={categories.map((item) => item.name)} title="Edit expense" submitLabel="Save changes" initialData={expenseToEdit} onAdd={handleUpdateExpense} onCancel={() => setEditingExpenseId(null)} />
      })()}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-[#e8e0d6] bg-white/75 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#a1988e]">Spent this month</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#2e2a25]">₹{monthTotal.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-[#8d847a]">Across {monthExpenses.length} transactions</p>
        </div>
        <div className="rounded-[22px] border border-[#e8e0d6] bg-[#f1ebe1] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9b8d7c]">Average transaction</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#40382f]">₹{average.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-[#8b8176]">~₹{dailyAverage.toLocaleString('en-IN')} per day so far</p>
        </div>
        <div className="rounded-[22px] border border-[#dfe8e2] bg-[#edf4ef] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#83978b]">Biggest category</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#34483d]">{categoryTotals[0]?.name ?? '—'}</p>
          <p className="mt-1 text-xs text-[#73867c]">₹{(categoryTotals[0]?.total ?? 0).toLocaleString('en-IN')} so far</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <section className="rounded-[26px] border border-[#e5ded4] bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a0968b]">Your transactions</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#302b26]">Recent expenses</h3>
            </div>
            <span className="w-fit rounded-full bg-[#f4f0e9] px-3 py-1.5 text-xs font-medium text-[#81776c]">{filteredExpenses.length} shown</span>
          </div>

          <div className="mt-5">
            <label htmlFor="expense-search" className="sr-only">Search expenses</label>
            <div className="flex items-center rounded-2xl border border-[#e3dcd2] bg-[#faf8f4] px-4 transition focus-within:border-[#b7aa99] focus-within:bg-white">
              <span className="mr-2 text-sm text-[#9b9186]">⌕</span>
              <input id="expense-search" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-3 text-sm text-[#38322c] outline-none placeholder:text-[#aaa095]" placeholder="Search coffee, Uber, shopping..." />
              {search && <button type="button" onClick={() => setSearch('')} className="rounded-full px-2 py-1 text-xs text-[#81776c] hover:bg-[#eee9e2]">Clear</button>}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {['All', ...categories.filter((item) => expenses.some((expense) => expense.category === item.name)).map((item) => item.name)].map((category) => (
                <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${activeCategory === category ? 'bg-[#2f2b27] text-white shadow-sm' : 'border border-[#e3dcd2] bg-white text-[#7d746a] hover:-translate-y-0.5 hover:bg-[#faf8f4]'}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {isLoading ? (
              <div className="rounded-[20px] border border-dashed border-[#ddd4c9] px-5 py-14 text-center text-sm text-[#8f877e]">Loading your expenses…</div>
            ) : filteredExpenses.length > 0 ? filteredExpenses.map((expense) => {
              const category = getCategory(expense.category)
              return (
                <article key={expense.id} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[19px] border border-transparent bg-[#faf8f4] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e4dcd1] hover:bg-white hover:shadow-[0_8px_24px_rgba(70,59,48,0.07)] sm:gap-4">
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl text-base ${category.soft} ${category.tone}`}>{category.icon}</div>
                  <button type="button" onClick={() => setSelectedExpenseId(expense.id)} className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[#c7b9a7] focus:ring-offset-2 focus:ring-offset-[#faf8f4]">
                    <p className="truncate text-sm font-semibold text-[#37312b]">{expense.description}</p>
                    <p className="mt-1 text-xs text-[#968c82]">{expense.category} · {formatDate(expense.date)}</p>
                  </button>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold text-[#36302a]">− ₹{expense.amount.toLocaleString('en-IN')}</span>
                    <div className="flex max-h-0 gap-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-8 group-hover:opacity-100">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setShowForm(false); setEditingExpenseId(expense.id) }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756c62] hover:bg-[#eee9e2]">Edit</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); void handleDeleteExpense(expense.id) }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#9a5d4f] hover:bg-[#fdf1ed]">Delete</button>
                    </div>
                  </div>
                </article>
              )
            }) : (
              <div className="rounded-[20px] border border-dashed border-[#ddd4c9] px-5 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1ece5] text-lg text-[#94887a]">⌕</div>
                <p className="mt-3 text-sm font-semibold text-[#4a433b]">Nothing found</p>
                <p className="mt-1 text-xs text-[#9a9187]">Try another search or category.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="relative overflow-hidden rounded-[26px] border border-[#dfd7cb] bg-[#f2eadf] p-6 shadow-sm">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#e5d4bd] blur-xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a8874]">✦ A little money note</p>
              <h3 className="mt-3 text-xl font-semibold leading-7 tracking-tight text-[#433a30]">{categoryTotals[0]?.name ?? 'Your spending'} is leading the month.</h3>
              <p className="mt-3 text-sm leading-6 text-[#756b60]">You've spent <strong className="text-[#50463b]">₹{(categoryTotals[0]?.total ?? 0).toLocaleString('en-IN')}</strong> on {categoryTotals[0]?.name.toLowerCase() ?? 'spending'} so far. Later, Gemini can compare this with your history and explain whether the pattern is unusual.</p>
              <button type="button" onClick={() => setActiveCategory(categoryTotals[0]?.name ?? 'All')} className="mt-5 w-full rounded-2xl border border-[#d8ccbd] bg-white/60 px-4 py-3 text-sm font-semibold text-[#5a4e42] transition hover:-translate-y-0.5 hover:bg-white">Explore this pattern →</button>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#e5ded4] bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a0968b]">Spending mix</p>
                <h3 className="mt-1 text-lg font-semibold text-[#37312b]">Where it went</h3>
              </div>
              <span className="text-xs text-[#9a9187]">this month</span>
            </div>
            <div className="mt-5 space-y-4">
              {categoryTotals.slice(0, 4).map((category) => {
                const percent = monthTotal ? Math.round((category.total / monthTotal) * 100) : 0
                const isActive = activeCategory === category.name
                return (
                  <button key={category.name} type="button" onClick={() => setActiveCategory(isActive ? 'All' : category.name)} className={`w-full rounded-2xl p-2 text-left transition hover:bg-[#faf8f4] ${isActive ? 'bg-[#faf8f4]' : ''}`} aria-pressed={isActive}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#5f574e]">{category.icon} {category.name}</span>
                      <span className="text-[#91877c]">₹{category.total.toLocaleString('en-IN')} · {percent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee9e2]"><div className={`h-full rounded-full ${category.soft} transition-[width] duration-500`} style={{ width: `${Math.max(percent, 3)}%` }} /></div>
                  </button>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      {deletedExpense && (
        <div className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-[#ded5ca] bg-[#2f2b27] px-4 py-3 text-sm text-white shadow-[0_14px_40px_rgba(47,43,39,0.2)]" role="status" aria-live="polite">
          <span>Deleted <strong>{deletedExpense.description}</strong>.</span>
          <button type="button" onClick={() => void handleUndoDelete()} className="rounded-xl bg-white/10 px-3 py-1.5 font-semibold transition hover:bg-white/20">Undo</button>
        </div>
      )}

      {selectedExpenseId !== null && (() => {
        const selectedExpense = expenses.find((item) => item.id === selectedExpenseId)
        if (!selectedExpense) return null
        const category = getCategory(selectedExpense.category)
        const categoryTotal = categoryTotals.find((item) => item.name === selectedExpense.category)?.total ?? 0
        const categoryShare = categoryTotal ? Math.round((selectedExpense.amount / categoryTotal) * 100) : 0

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2d2926]/25 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => setSelectedExpenseId(null)}>
            <section role="dialog" aria-modal="true" aria-labelledby="expense-detail-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#e2d9ce] bg-[#fffdfa] shadow-[0_24px_70px_rgba(47,43,39,0.2)]">
              <div className={`${category.soft} px-6 py-7`}>
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-white/70 text-xl ${category.tone}`}>{category.icon}</div>
                  <button type="button" onClick={() => setSelectedExpenseId(null)} className="rounded-full bg-white/60 px-3 py-2 text-sm text-[#756c62] hover:bg-white" aria-label="Close expense details">✕</button>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8e8378]">Expense detail</p>
                <h3 id="expense-detail-title" className="mt-1 text-2xl font-semibold tracking-tight text-[#302b26]">{selectedExpense.description}</h3>
                <p className="mt-1 text-sm text-[#81776c]">{selectedExpense.category} · {formatDate(selectedExpense.date)}</p>
              </div>
              <div className="space-y-5 p-6">
                <div className="rounded-2xl bg-[#f7f3ed] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9a9187]">Amount</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-[#302b26]">₹{selectedExpense.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a0968b]">A little context</p>
                  <p className="mt-2 text-sm leading-6 text-[#756c62]">This transaction represents about {categoryShare}% of your {selectedExpense.category.toLowerCase()} spending currently recorded this month.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setSelectedExpenseId(null); setShowForm(false); setEditingExpenseId(selectedExpense.id) }} className="flex-1 rounded-xl bg-[#2f2b27] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Edit expense</button>
                  <button type="button" onClick={() => { setSelectedExpenseId(null); void handleDeleteExpense(selectedExpense.id) }} className="rounded-xl border border-[#e1d7cc] px-4 py-3 text-sm font-semibold text-[#9a5d4f] hover:bg-[#fdf1ed]">Delete</button>
                </div>
              </div>
            </section>
          </div>
        )
      })()}
    </div>
  )
}

export default Expenses
