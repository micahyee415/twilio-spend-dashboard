import { Suspense } from 'react'

// ISR: regenerate every 5 minutes in the background — users always get cached
// HTML instantly; Vercel refreshes the data silently behind the scenes.
export const revalidate = 300
import { getOrgSpend, getAllCustomerSpend, type Range, type SpendPoint, type CustomerSpend } from '@/lib/twilio'
import DateRangePicker from '@/components/DateRangePicker'
import DashboardClient from '@/components/DashboardClient'
import DashboardSkeleton from '@/components/DashboardSkeleton'

const VALID_RANGES: Range[] = ['7d', '30d', '3m', '6m', '12m']

// Separate async component so it can stream in independently via Suspense
async function DashboardData({
  range,
}: {
  range: Range
}) {
  const [orgTrend, customers]: [SpendPoint[], CustomerSpend[]] = await Promise.all([
    getOrgSpend(range),
    getAllCustomerSpend(range),
  ])

  return <DashboardClient orgTrend={orgTrend} customers={customers} range={range} />
}

export default async function CostDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const range: Range = VALID_RANGES.includes(rangeParam as Range)
    ? (rangeParam as Range)
    : '3m'

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cost Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Refreshes every 5 minutes</p>
        </div>
        <DateRangePicker current={range} />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData range={range} />
      </Suspense>
    </div>
  )
}
