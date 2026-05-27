'use client'

import { useState } from 'react'
import type { CustomerSpend } from '@/lib/twilio'

export type StatusFilter = 'all' | 'active' | 'suspended' | 'closed'

interface Props {
  customers: CustomerSpend[]
  statusFilter: StatusFilter
  onStatusChange: (f: StatusFilter) => void
  selectedSid: string | null
  onSelect: (sid: string) => void
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'closed',    label: 'Closed' },
]

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  closed:    'bg-gray-100 text-gray-500',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

export default function SubaccountTable({ customers, statusFilter, onStatusChange, selectedSid, onSelect }: Props) {
  const [search, setSearch] = useState('')

  const counts = {
    all:       customers.length,
    active:    customers.filter(c => c.status === 'active').length,
    suspended: customers.filter(c => c.status === 'suspended').length,
    closed:    customers.filter(c => c.status === 'closed').length,
  }

  const filtered = customers
    .filter(c => {
      const matchesSearch = c.friendlyName.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => b.currentPeriod - a.currentPeriod)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                statusFilter === tab.value ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search subaccount..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">This Period</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prior Period</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const change = c.previousPeriod > 0
                ? ((c.currentPeriod - c.previousPeriod) / c.previousPeriod) * 100
                : null

              const isSelected = selectedSid === c.sid

              return (
                <tr
                  key={c.sid}
                  onClick={() => onSelect(c.sid)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-2.5 font-medium text-gray-800 flex items-center gap-2">
                    {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    {c.friendlyName}
                  </td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-medium text-gray-900">
                    {c.currentPeriod > 0 ? fmt(c.currentPeriod) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2.5 text-right text-gray-500">
                    {c.previousPeriod > 0 ? fmt(c.previousPeriod) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2.5 text-right">
                    {change !== null ? (
                      <span className={`text-xs font-medium ${change > 20 ? 'text-red-500' : change < -5 ? 'text-green-600' : 'text-gray-400'}`}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No {statusFilter !== 'all' ? statusFilter : ''} subaccounts{search ? ` matching "${search}"` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
