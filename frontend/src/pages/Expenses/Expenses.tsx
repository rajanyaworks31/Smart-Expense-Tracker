import { useEffect, useMemo, useState } from 'react'
import AddExpenseForm from '../../components/expenses/AddExpenseForm'
import type { ExpenseFormData } from '../../components/expenses/AddExpenseForm'

type Expense = ExpenseFormData & { id: number }

type Category = {
  name: string
  icon: string
  tone: string
  soft: string
}

const categories: Category[] = [
  { name: 'Food', icon: '☕', tone: 'text-[#8b5e3c]', soft: 'bg-[#f5e8dc]' },
  { name: 'Transport', icon: '↗', tone: 'text-[#56706a]', soft: 'bg-[#e2eee9]' },
  { name: 'Shopping', icon: '✦', tone: 'text-[#7a638a]', soft: 'bg-[#eee5f3]' },
  { name: 'Entertainment', icon: '◌', tone: 'text-[#8b6170]', soft: 'bg-[#f4e4e9]' },
  { name: 'Bills', icon: '⌁', tone: 'text-[#6a6f85]', soft: 'bg-[#e8eaf2]' },
  { name: 'Health', icon: '+', tone: 'text-[#587765]', soft: 'bg-[#e3eee6]' },
  { name: 'Education', icon: '✎', tone: 'text-[#746b55]', soft: 'bg-[#f1ecd9]' },
  { name: 'Other', icon: '•', tone: 'text-[#6e6962]', soft: 'bg-[#ebe8e3]' },
]

const initialExpenses: Expense[] = [
  { id: 1, description: 'Starbucks', category: 'Food', date: '2026-08-10', amount: 450 },
  { id: 2, description: 'Uber', category: 'Transport', date: '2026-08-10', amount: 320 },
  { id: 3, description: 'Netflix', category: 'Entertainment', date: '2026-08-09', amount: 649 },
  { id: 4, description: 'Amazon', category: 'Shopping', date: '2026-08-08', amount: 1240 },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function getCategory(category: string) {
  return categories.find((item) => item.name === category) ?? categories[categories.length - 1]
}

function Expenses() {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const matchesSearch = `${expense.description} ${expense.category}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || expense.category === activeCategory
    return matchesSearch && matchesCategory
  }), [expenses, search, activeCategory])

  const monthTotal = expenses.reduce((total, expense) => total + expense.amount, 0)
  const dailyAverage = Math.round(monthTotal / Math.max(new Date().getDate(), 1))
  const average = expenses.length ? Math.round(monthTotal / expenses.length) : 0

  const categoryTotals = categories
    .map((category) => ({ ...category, total: expenses.filter((expense) => expense.category === category.name).reduce((sum, expense) => sum + expense.amount, 0) }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total)

  const handleAddExpense = (expense: ExpenseFormData) => {
    setExpenses((current) => [{ ...expense, id: Date.now() }, ...current])
    setShowForm(false)
  }

  const handleUpdateExpense = (expense: ExpenseFormData) => {
    if (editingExpenseId === null) return
    setExpenses((current) => current.map((item) => (item.id === editingExpenseId ? { ...expense, id: item.id } : item)))
    setEditingExpenseId(null)
  }

  const handleDeleteExpense = (id: number) => {
    const expense = expenses.find((item) => item.id === id)
    if (!expense) return
    if (!window.confirm(`Delete "${expense.description}"?`)) return
    setExpenses((current) => current.filter((item) => item.id !== id))
    setDeletedExpense(expense)
    if (editingExpenseId === id) setEditingExpenseId(null)
    if (selectedExpenseId === id) setSelectedExpenseId(null)
  }

  const handleUndoDelete = () => {
    if (!deletedExpense) return
    setExpenses((current) => [deletedExpense, ...current])
    setDeletedExpense(null)
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

  return (
    <div className="space-y-7 pb-10">
      <header className="relative overflow-hidden rounded-[28px] border border-[#e5ded4] bg-[#fbf7f0] px-6 py-7 shadow-[0_14px_45px_rgba(77,65,52,0.06)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#eadfce]/70 blur-2xl" />
        <div className="absolute bottom-[-70px] left-1/3 h-40 w-40 rounded-full bg-[#e4ebe5]/70 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a08f7b]">Your spending space · August</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#29251f] sm:text-4xl">Where did your money wander? ✦</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#766e64] sm:text-base">A calmer way to see your everyday spending, spot little patterns, and keep your money story in view.</p>
          </div>
          <button type="button" onClick={() => { setEditingExpenseId(null); setShowForm((current) => !current) }} className="group inline-flex w-fit items-center gap-2 rounded-2xl bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,43,39,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(47,43,39,0.2)]">
            <span className="text-lg leading-none transition-transform duration-200 group-hover:rotate-90">+</span>
            {showForm ? 'Close form' : 'Add expense'}
          </button>
        </div>
      </header>

      {showForm && <AddExpenseForm onAdd={handleAddExpense} onCancel={() => setShowForm(false)} />}

      {editingExpenseId !== null && (() => {
        const expenseToEdit = expenses.find((item) => item.id === editingExpenseId)
        if (!expenseToEdit) return null
        return <AddExpenseForm title="Edit expense" submitLabel="Save changes" initialData={expenseToEdit} onAdd={handleUpdateExpense} onCancel={() => setEditingExpenseId(null)} />
      })()}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-[#e8e0d6] bg-white/75 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#a1988e]">Spent this month</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#2e2a25]">₹{monthTotal.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-xs text-[#8d847a]">Across {expenses.length} transactions</p>
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
            {filteredExpenses.length > 0 ? filteredExpenses.map((expense) => {
              const category = getCategory(expense.category)
              return (
                <article
                  key={expense.id}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[19px] border border-transparent bg-[#faf8f4] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e4dcd1] hover:bg-white hover:shadow-[0_8px_24px_rgba(70,59,48,0.07)] sm:gap-4"
                >
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl text-base ${category.soft} ${category.tone}`}>{category.icon}</div>
                  <button type="button" onClick={() => setSelectedExpenseId(expense.id)} className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[#c7b9a7] focus:ring-offset-2 focus:ring-offset-[#faf8f4]">
                    <p className="truncate text-sm font-semibold text-[#37312b]">{expense.description}</p>
                    <p className="mt-1 text-xs text-[#968c82]">{expense.category} · {formatDate(expense.date)}</p>
                  </button>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold text-[#36302a]">− ₹{expense.amount.toLocaleString('en-IN')}</span>
                    <div className="flex max-h-0 gap-1 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-8 group-hover:opacity-100">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setShowForm(false); setEditingExpenseId(expense.id) }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756c62] hover:bg-[#eee9e2]">Edit</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteExpense(expense.id) }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#9a5d4f] hover:bg-[#fdf1ed]">Delete</button>
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
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setActiveCategory(isActive ? 'All' : category.name)}
                    className={`w-full rounded-2xl p-2 text-left transition hover:bg-[#faf8f4] ${isActive ? 'bg-[#faf8f4]' : ''}`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#5f574e]">{category.icon} {category.name}</span>
                      <span className="text-[#91877c]">₹{category.total.toLocaleString('en-IN')} · {percent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee9e2]"><div className={`h-full rounded-full ${category.soft.replace('bg-', 'bg-')} transition-[width] duration-500`} style={{ width: `${Math.max(percent, 3)}%` }} /></div>
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
          <button type="button" onClick={handleUndoDelete} className="rounded-xl bg-white/10 px-3 py-1.5 font-semibold transition hover:bg-white/20">Undo</button>
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
                  <button type="button" onClick={() => { setSelectedExpenseId(null); handleDeleteExpense(selectedExpense.id) }} className="rounded-xl border border-[#e1d7cc] px-4 py-3 text-sm font-semibold text-[#9a5d4f] hover:bg-[#fdf1ed]">Delete</button>
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
