/**
 * Compliance Dashboard — Alex's view.
 *
 * Shows:
 * - Total phone number inventory across all subaccounts
 * - Per-subaccount phone number counts
 * - Suspended / closed subaccount flags
 */
import { getAllPhoneNumbers, getSubaccounts } from '@/lib/twilio'
import MetricCard from '@/components/MetricCard'

export default async function ComplianceDashboard() {
  const subaccounts = await getSubaccounts()
  const phoneNumbers = await getAllPhoneNumbers(subaccounts)

  const suspended = subaccounts.filter(s => s.status === 'suspended')
  const closed    = subaccounts.filter(s => s.status === 'closed')

  // Group phone numbers by subaccount for the inventory table
  const numbersByAccount: Record<string, { name: string; count: number }> = {}
  for (const n of phoneNumbers) {
    if (!numbersByAccount[n.accountSid]) {
      numbersByAccount[n.accountSid] = { name: n.accountName, count: 0 }
    }
    numbersByAccount[n.accountSid].count++
  }
  const phoneInventory = Object.entries(numbersByAccount)
    .map(([sid, v]) => ({ sid, ...v }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Compliance</h1>
        <p className="text-gray-500 text-sm mt-1">Phone number inventory · subaccount status · refreshes hourly</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Phone Numbers"
          value={phoneNumbers.length.toString()}
          subtitle="Across all subaccounts"
        />
        <MetricCard
          label="Suspended Accounts"
          value={suspended.length.toString()}
          subtitle="May still hold phone numbers"
          alert={suspended.length > 0}
        />
        <MetricCard
          label="Closed Accounts"
          value={closed.length.toString()}
          subtitle="Review for orphaned numbers"
          alert={closed.length > 0}
        />
      </div>

      {/* Suspended subaccounts */}
      {suspended.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            ⚠️ Suspended Subaccounts ({suspended.length})
          </h2>
          <p className="text-xs text-amber-700 mb-4">
            These accounts are suspended. Confirm with Engineering whether any phone numbers can be released.
          </p>
          <div className="space-y-1">
            {suspended.map(s => (
              <div key={s.sid} className="flex items-center justify-between text-sm py-1.5 border-b border-amber-100 last:border-0">
                <span className="text-amber-900 font-medium">{s.friendlyName}</span>
                <span className="text-amber-600 font-mono text-xs">{s.sid}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phone number inventory */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Phone Number Inventory by Customer</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Numbers</th>
            </tr>
          </thead>
          <tbody>
            {phoneInventory.map(row => (
              <tr key={row.sid} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 text-gray-800">{row.name}</td>
                <td className="py-2.5 text-right font-medium text-gray-900">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
