'use client'

import { useState, useMemo, useEffect } from 'react'
import type { SpendPoint, CustomerSpend, Range } from '@/lib/twilio'
import { aggregateTrend } from '@/lib/twilio'
import MetricCard from './MetricCard'
import SpendTrendChart from './SpendTrendChart'
import ProductBreakdownChart from './ProductBreakdownChart'
import SubaccountTable from './SubaccountTable'

export type StatusFilter = 'all' | 'active' | 'suspended' | 'closed'

interface Props {
  orgTrend: SpendPoint[]
  customers: CustomerSpend[]
  range: Range
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function mergeTrends(orgTrend: SpendPoint[], subTrend: SpendPoint[]): SpendPoint[] {
  const byPeriod: Record<string, SpendPoint> = {}
  for (const p of [...orgTrend, ...subTrend]) {
    if (!byPeriod[p.month]) {
      byPeriod[p.month] = { ...p, total: 0, sms: 0, voice: 0, verify: 0, phoneNumbers: 0 }
    }
    byPeriod[p.month].total        += p.total
    byPeriod[p.month].sms          += p.sms
    byPeriod[p.month].voice        += p.voice
    byPeriod[p.month].verify       += p.verify
    byPeriod[p.month].phoneNumbers += p.phoneNumbers
  }
  return Object.values(byPeriod).sort((a, b) => a.month.localeCompare(b.month))
}

export default function DashboardClient({ orgTrend, customers, range }: Props) {
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>('all')
  const [selectedSid, setSelectedSid]         = useState<string | null>(null)
  const [selectedTrend, setSelectedTrend]     = useState<SpendPoint[] | null>(null)
  const [trendLoading, setTrendLoading]       = useState(false)

  const combinedTrend = useMemo(
    () => mergeTrends(orgTrend, aggregateTrend(customers)),
    [orgTrend, customers]
  )

  // Fetch full trend on-demand when a row is selected
  useEffect(() => {
    if (!selectedSid) {
      setSelectedTrend(null)
      return
    }
    setTrendLoading(true)
    fetch(`/api/trend?sid=${selectedSid}&range=${range}`)
      .then(r => r.json())
      .then((data: SpendPoint[]) => {
        setSelectedTrend(data)
        setTrendLoading(false)
      })
      .catch(() => setTrendLoading(false))
  }, [selectedSid, range])

  const displayTrend = selectedSid
    ? (selectedTrend ?? combinedTrend)  // show combined while loading
    : combinedTrend

  const selected        = selectedSid ? customers.find(c => c.sid === selectedSid) ?? null : null
  const currentPeriod   = displayTrend.at(-1)
  const previousPeriod  = displayTrend.at(-2)

  const totalSpend    = currentPeriod?.total  ?? 0
  const prevSpend     = previousPeriod?.total ?? 0
  const momChange     = prevSpend > 0 ? ((totalSpend - prevSpend) / prevSpend) * 100 : 0
  const annualRunRate = totalSpend * (range === '7d' ? 52 : 12)

  // MTD Forecast — only meaningful for monthly ranges where current period is partial
  const isMonthly = range !== '7d' && range !== '30d'
  const today = new Date()
  const dayOfMonth   = today.getDate()
  const daysInMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const mtdForecast  = isMonthly && totalSpend > 0 && dayOfMonth < daysInMonth
    ? (totalSpend / dayOfMonth) * daysInMonth
    : null

  // Avg cost per active subaccount
  const activeCount     = customers.filter(c => c.status === 'active').length
  const avgCostPerAcct  = activeCount > 0 ? totalSpend / activeCount : 0
  const prevAvgCost     = activeCount > 0 ? prevSpend / activeCount : 0
  const avgCostChange   = prevAvgCost > 0 ? ((avgCostPerAcct - prevAvgCost) / prevAvgCost) * 100 : 0

  // Idle active accounts — active status but $0 spend this period
  const idleAccounts    = customers.filter(c => c.status === 'active' && c.currentPeriod === 0)
  const idleCount       = idleAccounts.length

  const productData = currentPeriod
    ? [
        { name: 'SMS',           value: currentPeriod.sms },
        { name: 'Voice',         value: currentPeriod.voice },
        { name: 'Verify',        value: currentPeriod.verify },
        { name: 'Phone Numbers', value: currentPeriod.phoneNumbers },
      ].filter(p => p.value > 0)
    : []

  const periodLabel = currentPeriod?.label ?? 'Current period'
  const chartTitle  = selected
    ? `${selected.friendlyName}${trendLoading ? ' (loading...)' : ''}`
    : 'All subaccounts'

  function handleSelect(sid: string) {
    setSelectedSid(prev => prev === sid ? null : sid)
  }

  return (
    <>
      {/* Metric cards — row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <MetricCard
          label="Most Recent Period"
          value={fmt(totalSpend)}
          change={momChange}
          subtitle={`vs. ${previousPeriod?.label ?? 'prior period'}`}
        />
        <MetricCard
          label="Annual Run-Rate"
          value={fmt(annualRunRate)}
          subtitle="Based on most recent period"
        />
        <MetricCard
          label="Active Subaccounts"
          value={activeCount.toString()}
          subtitle={`of ${customers.length} total subaccounts`}
        />
      </div>

      {/* Metric cards — row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="MTD Forecast"
          value={mtdForecast !== null ? fmt(mtdForecast) : '—'}
          subtitle={mtdForecast !== null
            ? `Day ${dayOfMonth} of ${daysInMonth} · based on ${periodLabel} pace`
            : range === '7d' || range === '30d' ? 'N/A for daily ranges' : 'Full month data'
          }
        />
        <MetricCard
          label="Avg Cost / Active Account"
          value={fmt(avgCostPerAcct)}
          change={avgCostChange}
          subtitle={`${periodLabel} · across ${activeCount} active accounts`}
        />
        <MetricCard
          label="Idle Active Accounts"
          value={idleCount.toString()}
          subtitle={idleCount > 0
            ? `${idleCount} active account${idleCount === 1 ? '' : 's'} with $0 spend`
            : 'All active accounts have spend'
          }
          alert={idleCount > 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Spend Trend</h2>
          <p className="text-xs text-gray-400 mb-4">{chartTitle}</p>
          <SpendTrendChart data={displayTrend} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Spend by Product</h2>
          <p className="text-xs text-gray-400 mb-4">{periodLabel} · {chartTitle}</p>
          <ProductBreakdownChart data={productData} />
        </div>
      </div>

      {/* Subaccount spend table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Spend by Subaccount — {periodLabel}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Click a row to filter charts to that subaccount. Click again to deselect.
        </p>
        <SubaccountTable
          customers={customers}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          selectedSid={selectedSid}
          onSelect={handleSelect}
        />
      </div>
    </>
  )
}
