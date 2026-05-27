/** A single large-number stat card — used at the top of each dashboard view */
interface Props {
  label: string
  value: string
  subtitle?: string
  change?: number   // MoM % change — positive = green, negative = red
  alert?: boolean   // amber highlight for compliance warnings
}

export default function MetricCard({ label, value, subtitle, change, alert }: Props) {
  const changeColor = change === undefined ? '' : change >= 0 ? 'text-red-500' : 'text-green-600'
  const changeLabel = change === undefined ? null :
    `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% MoM`

  return (
    <div className={`rounded-xl border p-6 bg-white ${alert ? 'border-amber-300' : 'border-gray-200'}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-2">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        {changeLabel && <p className={`text-xs font-medium ${changeColor}`}>{changeLabel}</p>}
      </div>
    </div>
  )
}
