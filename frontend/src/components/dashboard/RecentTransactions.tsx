const transactions = [
  ['Starbucks', 'Food', '− ₹450'],
  ['Uber', 'Transport', '− ₹320'],
  ['Salary', 'Income', '+ ₹65,000'],
]

function RecentTransactions() {
  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent transactions</h3>
        <button type="button" className="text-xs font-medium text-[#8a8178] hover:text-[#2d2926]">
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {transactions.map(([name, category, amount]) => (
          <div key={name} className="flex items-center justify-between rounded-xl bg-[#faf8f4] px-4 py-3">
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-[#9a9187]">{category}</p>
            </div>
            <span className="text-sm font-semibold">{amount}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export default RecentTransactions
