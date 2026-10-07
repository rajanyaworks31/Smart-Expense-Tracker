import { useMemo } from 'react'
import type { Expense } from '../../types/api'

type SpendingOverviewProps = {
  expenses: Expense[]
  startDate: string
  endDate: string
}

function SpendingOverview({ expenses, startDate, endDate }: SpendingOverviewProps) {
  const { dailySpending, total, peak } = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    const days = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1)
    const totals = Array.from({ length: days }, () => 0)

    expenses.forEach((expense) => {
      const expenseDate = new Date(`${expense.expense_date}T00:00:00`)
      const index = Math.round((expenseDate.getTime() - start.getTime()) / 86400000)
      if (index >= 0 && index < days) totals[index] += Number(expense.amount)
    })

    const peakAmount = Math.max(...totals, 0)
    const peakIndex = totals.indexOf(peakAmount)
    const peakDate = new Date(start.getTime() + peakIndex * 86400000)

    return {
      dailySpending: totals,
      total: totals.reduce((sum, amount) => sum + amount, 0),
      peak: peakAmount > 0 ? { amount: peakAmount, date: peakDate } : null,
    }
  }, [expenses, startDate, endDate])

  const maxValue = Math.max(...dailySpending, 1)
  const points = dailySpending.map((amount, index) => {
    const x = 8 + (index / Math.max(dailySpending.length - 1, 1)) * 84
    const y = 88 - (amount / maxValue) * 68
    return { x, y, amount, index }
  })
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L 92 88 L 8 88 Z`

  const monthLabel = new Date(`${startDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'long' })
  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#8a8178]">Spending overview</p>
          <h3 className="mt-1 text-xl font-semibold">₹{total.toLocaleString('en-IN')} spent</h3>
        </div>
        <span className="rounded-full bg-[#f1ece5] px-3 py-1 text-xs font-medium text-[#756c62]">{monthLabel}</span>
      </div>

      {expenses.length === 0 ? (
        <div className="mt-8 flex h-48 items-center justify-center rounded-xl bg-[#faf8f4] text-sm text-[#9a9187]">
          No spending data for this period yet.
        </div>
      ) : (
        <>
          <div className="mt-7 rounded-xl bg-[#faf8f4] px-2 pt-4 sm:px-4" aria-label="Daily spending trend">
            <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible" role="img" aria-label={`${monthLabel} daily spending trend`}>
              <defs>
                <linearGradient id="spending-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#b87568" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#b87568" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d="M 8 88 L 92 88" stroke="#e5ded5" strokeWidth="0.7" />
              <path d={areaPath} fill="url(#spending-fill)" />
              <path d={linePath} fill="none" stroke="#b87568" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              {points.filter((point) => point.amount > 0).map((point) => {
                const date = new Date(new Date(`${startDate}T00:00:00`).getTime() + point.index * 86400000)
                return (
                  <circle key={point.index} cx={point.x} cy={point.y} r="1.7" fill="#b87568">
                    <title>{formatDate(date)} · ₹{point.amount.toLocaleString('en-IN')}</title>
                  </circle>
                )
              })}
            </svg>
            <div className="flex justify-between px-1 pb-3 text-[10px] text-[#9a9187]">
              <span>{new Date(`${startDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(`${endDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[#8a8178]">
            <span>{peak ? `Peak: ₹${peak.amount.toLocaleString('en-IN')} on ${formatDate(peak.date)}` : 'No spending recorded'}</span>
            <span className="font-medium text-[#9a6258]">Daily spending</span>
          </div>
        </>
      )}
    </article>
  )
}

export default SpendingOverview
