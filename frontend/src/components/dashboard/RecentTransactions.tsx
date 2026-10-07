import type { Expense, Income } from '../../types/api'

type RecentTransactionsProps = {
  expenses: Expense[]
  income: Income[]
}

function RecentTransactions({ expenses, income }: RecentTransactionsProps) {
  const transactions = [
    ...expenses.map((item) => ({
      id: `expense-${item.id}`,
      date: item.expense_date,
      name: item.description,
      category: 'Expense',
      amount: -Number(item.amount),
    })),
    ...income.map((item) => ({
      id: `income-${item.id}`,
      date: item.income_date,
      name: item.source,
      category: 'Income',
      amount: Number(item.amount),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent transactions</h3>
        <span className="text-xs font-medium text-[#8a8178]">Latest 5</span>
      </div>

      {transactions.length === 0 ? (
        <div className="mt-4 rounded-xl bg-[#faf8f4] px-4 py-6 text-center text-sm text-[#9a9187]">
          Your recent transactions will appear here.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-xl bg-[#faf8f4] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{transaction.name}</p>
                <p className="text-xs text-[#9a9187]">{transaction.category} · {transaction.date}</p>
              </div>
              <span className={`ml-4 shrink-0 text-sm font-semibold ${transaction.amount >= 0 ? 'text-emerald-700' : 'text-[#2d2926]'}`}>
                {transaction.amount >= 0 ? '+' : '−'} ₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default RecentTransactions
