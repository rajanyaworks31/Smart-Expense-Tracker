import BalanceCard from '../../components/dashboard/BalanceCard'
import RecentTransactions from '../../components/dashboard/RecentTransactions'
import SpendingOverview from '../../components/dashboard/SpendingOverview'

function Dashboard() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-[#9a9187]">Sunday, August 10</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Good afternoon 👋</h2>
        <p className="mt-2 text-[#756c62]">Here’s your financial snapshot for this month.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceCard value="₹42,580" label="Current balance" note="+8.2%" />
        <BalanceCard value="₹65,000" label="Income this month" note="On track" />
        <BalanceCard value="₹22,420" label="Expenses this month" note="34.5% of income" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <SpendingOverview />

        <article className="rounded-2xl border border-[#ded5c9] bg-[#eee8df] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">✦</span>
            AI insight
          </div>
          <h3 className="mt-5 text-xl font-semibold leading-7">
            Your food spending is the biggest opportunity this month.
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#756c62]">
            You’ve spent ₹7,200 on food so far — about 18% more than last month.
          </p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Ask your money
          </button>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Budget pulse</h3>
            <span className="text-sm text-[#8a8178]">78%</span>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#eee9e2]">
            <div className="h-full w-[78%] rounded-full bg-[#2d2926]" />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-[#756c62]">₹15,600 spent</span>
            <span className="font-medium">₹4,400 left</span>
          </div>
        </article>

        <RecentTransactions />
      </section>
    </div>
  )
}

export default Dashboard
