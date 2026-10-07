import { useEffect, useState } from 'react'
import { getAnalyticsSummary, getMoneyLeaks, getSpendingForecast } from '../../services/analyticsApi'
import type { AnalyticsSummary, MoneyLeakReport, SpendingForecast } from '../../types/api'

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toIso = (value: Date) => {
    const offset = value.getTimezoneOffset() * 60000
    return new Date(value.getTime() - offset).toISOString().slice(0, 10)
  }
  return { startDate: toIso(start), endDate: toIso(end) }
}

function Analytics() {
  const [{ startDate, endDate }] = useState(monthRange)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [moneyLeaks, setMoneyLeaks] = useState<MoneyLeakReport | null>(null)
  const [forecast, setForecast] = useState<SpendingForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getAnalyticsSummary(startDate, endDate),
      getMoneyLeaks(startDate, endDate),
      getSpendingForecast(startDate, endDate),
    ])
      .then(([nextSummary, nextLeaks, nextForecast]) => {
        if (cancelled) return
        setSummary(nextSummary)
        setMoneyLeaks(nextLeaks)
        setForecast(nextForecast)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load analytics.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [startDate, endDate])

  const categories = summary?.category_breakdown.slice(0, 3) ?? []

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-[#9a9187]">Understand the pattern</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h2>
        <p className="mt-2 text-[#756c62]">See what changed, where your money goes, and what may happen next.</p>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        {categories.map((category) => (
          <article key={category.category_id} className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-[#8a8178]">{category.category_name}</p>
            <p className="mt-2 text-2xl font-semibold">₹{Number(category.amount).toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-[#9a9187]">{Number(category.percentage).toFixed(0)}% of spending</p>
          </article>
        ))}
        {!loading && categories.length === 0 && <p className="md:col-span-3 rounded-2xl bg-[#faf8f4] px-5 py-8 text-sm text-[#9a9187]">Add expenses to build your spending breakdown.</p>}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <p className="text-sm font-semibold">↗ Spending forecast</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{loading ? '—' : forecast ? `₹${Number(forecast.projected_spend).toLocaleString('en-IN')}` : '—'}</p>
              <p className="mt-1 text-sm text-[#756c62]">Projected full-period spending</p>
            </div>
            {forecast && <span className="rounded-full bg-[#faf8f4] px-3 py-1 text-xs font-medium text-[#756c62]">{forecast.remaining_days} days left</span>}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#8a8178]">{loading ? 'Calculating your current run rate…' : forecast?.explanation ?? 'Add expenses to generate a forecast.'}</p>
        </article>

        <article className="min-h-72 rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a0968b]">Cash flow</p>
              <h3 className="mt-1 font-semibold text-[#302b26]">Income vs expenses</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#756c62]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#7c9a87]" />Income</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#b87568]" />Expenses</span>
            </div>
          </div>

          <div className="mt-7 flex h-52 items-end gap-5 border-b border-[#eee8df] px-2">
            {(summary?.monthly_trends ?? []).map((trend) => {
              const income = Number(trend.income)
              const expenses = Number(trend.expenses)
              const max = Math.max(income, expenses, 1)
              const incomeHeight = Math.max((income / max) * 100, income > 0 ? 6 : 0)
              const expenseHeight = Math.max((expenses / max) * 100, expenses > 0 ? 6 : 0)
              const monthLabel = new Date(`${trend.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })

              return (
                <div key={trend.month} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                  <div className="flex h-full w-full max-w-16 items-end justify-center gap-1.5">
                    <div className="relative w-full rounded-t-lg bg-[#7c9a87]/80 transition-all duration-300 group-hover:bg-[#6f8e7b]" style={{ height: `${incomeHeight}%` }}>
                      {income > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#6d8275]">₹{income.toLocaleString('en-IN')}</span>}
                    </div>
                    <div className="relative w-full rounded-t-lg bg-[#b87568]/75 transition-all duration-300 group-hover:bg-[#a9685c]" style={{ height: `${expenseHeight}%` }}>
                      {expenses > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#9a6258]">₹{expenses.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  <span className="absolute translate-y-7 text-[11px] font-medium text-[#968c82]">{monthLabel}</span>
                </div>
              )
            })}
            {!loading && !(summary?.monthly_trends.length) && <p className="self-center text-sm text-[#9a9187]">No monthly data yet.</p>}
            {loading && <p className="self-center text-sm text-[#9a9187]">Loading your financial patterns…</p>}
          </div>

          {summary?.monthly_trends.length === 1 && !loading && (
            <div className="mt-7 flex items-center justify-between rounded-xl bg-[#faf8f4] px-4 py-3 text-xs text-[#756c62]">
              <span>{summary.monthly_trends[0].month} snapshot</span>
              <span className="font-medium text-[#4f4841]">Net: ₹{Number(summary.monthly_trends[0].net_cash_flow).toLocaleString('en-IN')}</span>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#e3ddd4] bg-[#eee8df] p-6 shadow-sm">
          <p className="text-sm font-semibold">✦ Money leaks</p>
          <h3 className="mt-4 text-xl font-semibold">
            {loading ? 'Reading your spending patterns…' : moneyLeaks?.leaks[0]?.category_name ? `${moneyLeaks.leaks[0].category_name} spending jumped.` : 'No meaningful spending leaks found.'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#756c62]">
            {loading ? 'Comparing this period with the immediately preceding period.' : moneyLeaks?.leaks[0]?.explanation ?? 'We compare this period with the immediately preceding period and only surface meaningful increases.'}
          </p>
          {moneyLeaks && moneyLeaks.leaks.length > 1 && <p className="mt-4 text-xs font-medium text-[#8a8178]">+{moneyLeaks.leaks.length - 1} more category change{moneyLeaks.leaks.length === 2 ? '' : 's'} detected</p>}
        </article>
      </section>
    </div>
  )
}

export default Analytics
