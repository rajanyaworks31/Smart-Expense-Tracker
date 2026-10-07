type BalanceCardProps = {
  value: string
  label: string
  note: string
  tone?: 'default' | 'positive' | 'negative'
}

function BalanceCard({ value, label, note, tone = 'default' }: BalanceCardProps) {
  const noteClass = tone === 'positive'
    ? 'text-emerald-700'
    : tone === 'negative'
      ? 'text-rose-700'
      : 'text-[#8a8178]'

  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
      <p className="text-sm text-[#8a8178]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 text-xs font-medium ${noteClass}`}>{note}</p>
    </article>
  )
}

export default BalanceCard
