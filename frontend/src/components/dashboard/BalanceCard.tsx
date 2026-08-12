type BalanceCardProps = {
  value: string
  label: string
  note: string
}

function BalanceCard({ value, label, note }: BalanceCardProps) {
  return (
    <article className="rounded-2xl border border-[#e3ddd4] bg-white/80 p-5 shadow-sm">
      <p className="text-sm text-[#8a8178]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs font-medium text-[#8a8178]">{note}</p>
    </article>
  )
}

export default BalanceCard
