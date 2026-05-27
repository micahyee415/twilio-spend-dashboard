'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Range } from '@/lib/twilio'

const OPTIONS: { value: Range; label: string }[] = [
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m',  label: 'Last 3 months' },
  { value: '6m',  label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
]

interface Props {
  current: Range
}

export default function DateRangePicker({ current }: Props) {
  const router = useSearchParams()
  const nav    = useRouter()

  function select(range: Range) {
    const params = new URLSearchParams(window.location.search)
    params.set('range', range)
    nav.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            current === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
