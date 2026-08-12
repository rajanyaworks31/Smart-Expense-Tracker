function Goals() {
  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between">
        <div><p className="text-sm text-[#9a9187]">Future plans</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Savings Goals</h2><p className="mt-2 text-[#756c62]">Turn your plans into something measurable.</p></div>
        <button className="rounded-xl bg-[#2d2926] px-4 py-2.5 text-sm font-semibold text-white">+ New goal</button>
      </header>
      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">✈️ Goa Trip</h3><span className="text-sm text-[#8a8178]">60%</span></div><p className="mt-5 text-2xl font-semibold">₹18,000 <span className="text-sm font-normal text-[#9a9187]">/ ₹30,000</span></p><div className="mt-4 h-2.5 rounded-full bg-[#eee9e2]"><div className="h-full w-[60%] rounded-full bg-[#2d2926]"/></div><p className="mt-3 text-sm text-[#756c62]">₹12,000 remaining · Target Dec 2026</p></article>
        <article className="rounded-2xl border border-dashed border-[#d8d0c4] bg-[#faf8f4] p-6"><p className="text-2xl">＋</p><h3 className="mt-4 font-semibold">Create a new goal</h3><p className="mt-2 text-sm leading-6 text-[#8a8178]">A trip, emergency fund, new laptop — give your next goal a number and a deadline.</p></article>
      </section>
    </div>
  )
}

export default Goals
