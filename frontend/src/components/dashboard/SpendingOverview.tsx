function SpendingOverview() {
  const bars = [42, 58, 48, 72, 56, 82, 66, 92, 61, 76, 68, 84]

  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#8a8178]">Spending overview</p>
          <h3 className="mt-1 text-xl font-semibold">₹22,420 spent</h3>
        </div>
        <span className="rounded-full bg-[#f1ece5] px-3 py-1 text-xs font-medium text-[#756c62]">August</span>
      </div>

      <div className="mt-8 flex h-48 items-end gap-3 sm:gap-5" aria-label="Spending trend placeholder">
        {bars.map((height, index) => (
          <div key={index} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-[#d9d1c5]"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between text-xs text-[#9a9187]">
        <span>Aug 1</span>
        <span>Aug 10</span>
      </div>
    </article>
  )
}

export default SpendingOverview
