import { useEffect, useMemo, useState } from 'react'
import BalanceCard from '../../components/dashboard/BalanceCard'
import RecentTransactions from '../../components/dashboard/RecentTransactions'
import SpendingOverview from '../../components/dashboard/SpendingOverview'
import { getAnalyticsSummary } from '../../services/analyticsApi'
import { listExpenses } from '../../services/expenseApi'
import { listIncome } from '../../services/incomeApi'
import { listGoals } from '../../services/goalApi'
import type { AnalyticsSummary, Expense, Income, SavingsGoal } from '../../types/api'

function monthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const toIso = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
  }
  return { startDate: toIso(start), endDate: toIso(end) }
}

function Dashboard() {
  const [{ startDate, endDate }] = useState(monthRange)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getAnalyticsSummary(startDate, endDate),
      listExpenses({ startDate, endDate, pageSize: 100 }),
      listIncome({ startDate, endDate, pageSize: 100 }),
      listGoals(),
    ])
      .then(([summary, expensePage, incomePage, goalList]) => {
        if (cancelled) return
        setAnalytics(summary)
        setExpenses(expensePage.items)
        setIncome(incomePage.items)
        setGoals(goalList)
      })
      .catch((requestError: unknown) => {
        if (cancelled) return
        setError(requestError instanceof Error ? requestError.message : 'Could not load your dashboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  const balance = analytics ? Number(analytics.net_cash_flow) : 0
  const incomeTotal = analytics ? Number(analytics.total_income) : 0
  const expenseTotal = analytics ? Number(analytics.total_expenses) : 0
  const savingsRate = analytics ? Number(analytics.savings_rate) : 0
  const topCategory = analytics?.category_breakdown[0]
  const activeGoal = useMemo(
    () => goals.slice().sort((a, b) => Number(b.current_amount) / Math.max(Number(b.target_amount), 1) - Number(a.current_amount) / Math.max(Number(a.target_amount), 1))[0],
    [goals],
  )

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const monthLabel = new Date(startDate).toLocaleDateString('en-IN', { month: 'long' })

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-[#9a9187]">{monthLabel} snapshot</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting} 👋</h2>
        <p className="mt-2 text-[#756c62]">A live view of your money, powered by your real transactions.</p>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceCard value={`₹${balance.toLocaleString('en-IN')}`} label="Net cash flow" note={savingsRate ? `${savingsRate.toFixed(1)}% savings rate` : 'No savings yet'} tone={balance >= 0 ? 'positive' : 'negative'} />
        <BalanceCard value={`₹${incomeTotal.toLocaleString('en-IN')}`} label="Income this month" note={loading ? 'Loading…' : `${income.length} income entries`} tone="positive" />
        <BalanceCard value={`₹${expenseTotal.toLocaleString('en-IN')}`} label="Expenses this month" note={loading ? 'Loading…' : `${expenses.length} expense entries`} tone="default" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <SpendingOverview expenses={expenses} startDate={startDate} endDate={endDate} />

        <article className="rounded-2xl border border-[#ded5c9] bg-[#eee8df] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">✦</span>
            Spending insight
          </div>
          <h3 className="mt-5 text-xl font-semibold leading-7">
            {topCategory ? `${topCategory.category_name} is your biggest spending category.` : 'Your spending story will appear here.'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#756c62]">
            {topCategory
              ? `₹${Number(topCategory.amount).toLocaleString('en-IN')} spent this period, making up ${Number(topCategory.percentage).toFixed(1)}% of your expenses.`
              : 'Add a few transactions and your dashboard will start finding useful patterns.'}
          </p>
          <a href="/ai" className="mt-6 inline-flex rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md">
            Ask your money
          </a>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Budget pulse</h3>
            <span className="text-sm text-[#8a8178]">{analytics?.budget_utilization.length ?? 0} budgets</span>
          </div>
          <div className="mt-5 space-y-4">
            {(analytics?.budget_utilization ?? []).slice(0, 3).map((budget) => (
              <div key={budget.budget_id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{budget.budget_name}</span>
                  <span className="text-[#756c62]">{Number(budget.utilization_percentage).toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eee9e2]">
                  <div className="h-full rounded-full bg-[#2d2926]" style={{ width: `${Math.min(Number(budget.utilization_percentage), 100)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#8a8178]">
                  <span>₹{Number(budget.spent).toLocaleString('en-IN')} spent</span>
                  <span>₹{Number(budget.remaining).toLocaleString('en-IN')} left</span>
                </div>
              </div>
            ))}
            {!analytics?.budget_utilization.length && <p className="rounded-xl bg-[#faf8f4] px-4 py-6 text-sm text-[#9a9187]">Create a budget to see its pulse here.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Savings goal</h3>
            <span className="text-xs text-[#8a8178]">{activeGoal ? `${Math.round((Number(activeGoal.current_amount) / Math.max(Number(activeGoal.target_amount), 1)) * 100)}%` : 'Start one'}</span>
          </div>
          {activeGoal ? (
            <>
              <p className="mt-5 text-xl font-semibold">{activeGoal.name}</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eee9e2]">
                <div className="h-full rounded-full bg-[#2d2926]" style={{ width: `${Math.min((Number(activeGoal.current_amount) / Math.max(Number(activeGoal.target_amount), 1)) * 100, 100)}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-[#756c62]">₹{Number(activeGoal.current_amount).toLocaleString('en-IN')} saved</span>
                <span className="font-medium">₹{Number(activeGoal.target_amount).toLocaleString('en-IN')} target</span>
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-xl bg-[#faf8f4] px-4 py-8 text-sm text-[#9a9187]">Create a savings goal and it will show up here.</p>
          )}
        </article>
      </section>

      <RecentTransactions expenses={expenses} income={income} />
    </div>
  )
}

export default Dashboard
