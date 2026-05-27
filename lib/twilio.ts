/**
 * twilio.ts — All Twilio API calls live here.
 *
 * This runs SERVER-SIDE ONLY. Credentials never reach the browser.
 * Responses are cached for 1 hour by Next.js.
 */

const ACCOUNT_SID    = process.env.TWILIO_ACCOUNT_SID!
const API_KEY_SID    = process.env.TWILIO_API_KEY_SID!
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET!
const BASE           = 'https://api.twilio.com/2010-04-01'

const authHeader = () => ({
  Authorization: `Basic ${Buffer.from(`${API_KEY_SID}:${API_KEY_SECRET}`).toString('base64')}`,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type Range = '7d' | '30d' | '3m' | '6m' | '12m'

export interface Subaccount {
  sid: string
  friendlyName: string
  status: 'active' | 'suspended' | 'closed'
}

export interface SpendPoint {
  month: string   // sort key: "YYYY-MM" or "YYYY-MM-DD"
  label: string   // chart label: "Mar 2026" or "Apr 01"
  total: number
  sms: number
  voice: number
  verify: number
  phoneNumbers: number
}

export interface CustomerSpend {
  sid: string
  friendlyName: string
  status: 'active' | 'suspended' | 'closed'
  currentPeriod: number   // spend in the most recent period
  previousPeriod: number  // spend in the prior period — for % change
  trend: SpendPoint[]
}

export interface PhoneNumber {
  sid: string
  phoneNumber: string
  friendlyName: string
  accountSid: string
  accountName: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeader(),
    next: { revalidate: 300, tags: ['twilio'] },
  })
  if (!res.ok) {
    console.error(`Twilio ${res.status}: ${path}`)
    return null
  }
  return res.json()
}

/**
 * Fetches ALL pages of Twilio usage records for a given URL, following
 * next_page_uri until exhausted. Twilio returns records newest-first, so
 * without pagination we only ever see the most recent ~200 records and miss
 * older months entirely.
 */
async function getAllUsageRecords(initialPath: string): Promise<any[]> {
  const all: any[] = []
  let url: string | null = `${BASE}${initialPath}`

  while (url) {
    const res: Response = await fetch(url, {
      headers: authHeader(),
      next: { revalidate: 300, tags: ['twilio', 'twilio-usage'] },
    })
    if (!res.ok) {
      console.error(`Twilio ${res.status}: ${url}`)
      break
    }
    const data = await res.json()
    all.push(...(data.usage_records ?? []))
    url = data.next_page_uri ? `https://api.twilio.com${data.next_page_uri}` : null
  }

  return all
}

function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function dayLabel(yyyyMmDd: string): string {
  const [, month, day] = yyyyMmDd.split('-')
  return `${new Date(0, Number(month) - 1).toLocaleString('en-US', { month: 'short' })} ${day}`
}

/** Build start/end dates from a Range value */
function dateRange(range: Range): { start: Date; end: Date } {
  const end   = new Date()
  const start = new Date()
  if (range === '7d')  start.setDate(start.getDate() - 7)
  if (range === '30d') start.setDate(start.getDate() - 30)
  if (range === '3m')  start.setMonth(start.getMonth() - 3)
  if (range === '6m')  start.setMonth(start.getMonth() - 6)
  if (range === '12m') start.setMonth(start.getMonth() - 12)
  return { start, end }
}

/**
 * Fill in $0 entries for every period in the range that Twilio didn't
 * return (Twilio omits periods with zero activity entirely).
 * Without this, the trend chart shows a single dot instead of a line.
 */
function padEmptyPeriods(
  byPeriod: Record<string, SpendPoint>,
  start: Date,
  end: Date,
  isDaily: boolean,
) {
  if (isDaily) {
    const cur = new Date(start)
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      if (!byPeriod[key]) {
        byPeriod[key] = { month: key, label: dayLabel(key), total: 0, sms: 0, voice: 0, verify: 0, phoneNumbers: 0 }
      }
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur <= last) {
      const key = cur.toISOString().slice(0, 7)
      if (!byPeriod[key]) {
        byPeriod[key] = { month: key, label: monthLabel(key), total: 0, sms: 0, voice: 0, verify: 0, phoneNumbers: 0 }
      }
      cur.setMonth(cur.getMonth() + 1)
    }
  }
}

/**
 * Processes all usage records for a single billing period into a SpendPoint.
 *
 * Twilio returns both aggregate categories (e.g. "sms") and their subcategories
 * (e.g. "sms-outbound-longcode"). Summing both would double-count, so we skip
 * any category whose root name (text before the first hyphen) is also present
 * as its own category in the same period.
 *
 * Example: if both "sms" and "sms-outbound-longcode" appear, skip the
 * subcategory and only count "sms".
 *
 * If Twilio provides a "totalprice" record we use that as the authoritative total
 * instead of our sum — it covers every product Twilio bills, including ones we
 * don't track individually. Twilio omits totalprice for the current partial month.
 */
function buildPeriod(
  key: string,
  label: string,
  records: Array<{ category: string; amount: number }>,
): SpendPoint {
  const entry: SpendPoint = { month: key, label, total: 0, sms: 0, voice: 0, verify: 0, phoneNumbers: 0 }
  const categorySet = new Set(records.map(r => r.category))

  // Check for authoritative total first
  const totalprice = records.find(r => r.category === 'totalprice' && r.amount > 0)

  for (const { category, amount } of records) {
    if (amount === 0 || category === 'totalprice') continue

    // Skip subcategories when the aggregate parent is present
    // e.g. skip "sms-outbound-longcode" when "sms" is in the same period
    const root = category.split('-')[0]
    if (root !== category && categorySet.has(root)) continue

    // Product breakdown buckets (for the chart)
    if (category.startsWith('sms') || category === 'mms')               entry.sms          += amount
    else if (category.startsWith('calls') || category.startsWith('voice')) entry.voice      += amount
    else if (category.startsWith('verify'))                              entry.verify       += amount
    else if (category.startsWith('phonenumbers'))                        entry.phoneNumbers += amount

    // Running total from de-duplicated top-level categories
    entry.total += amount
  }

  // totalprice overrides our sum when available (more accurate)
  if (totalprice) entry.total = totalprice.amount

  return entry
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetches org-wide spend from the parent/master account */
export async function getOrgSpend(range: Range = '3m'): Promise<SpendPoint[]> {
  return getSpendForRange(ACCOUNT_SID, range)
}

export async function getSubaccounts(): Promise<Subaccount[]> {
  const data = await get(`/Accounts.json?PageSize=100`)
  if (!data) return []
  // Return all statuses — UI handles filtering
  return (data.accounts as any[])
    .filter(a => a.sid !== ACCOUNT_SID)
    .map(a => ({ sid: a.sid, friendlyName: a.friendly_name, status: a.status }))
}

/** Fetches spend for one account over the given range, paginating through all pages */
export async function getSpendForAccount(sid: string, range: Range): Promise<SpendPoint[]> {
  return getSpendForRange(sid, range)
}

async function getSpendForRange(sid: string, range: Range): Promise<SpendPoint[]> {
  const { start, end } = dateRange(range)
  const isDaily = range === '7d' || range === '30d'
  const endpoint = isDaily ? 'Daily' : 'Monthly'

  const path = `/Accounts/${sid}/Usage/Records/${endpoint}.json` +
    `?StartDate=${start.toISOString().slice(0, 10)}` +
    `&EndDate=${end.toISOString().slice(0, 10)}&PageSize=1000`

  // Paginate through ALL pages — Twilio returns newest-first and cuts off at
  // PageSize records per page, so without pagination we miss older months.
  const records = await getAllUsageRecords(path)

  const byPeriod: Record<string, SpendPoint> = {}
  padEmptyPeriods(byPeriod, start, end, isDaily)

  if (records.length === 0) {
    return Object.values(byPeriod).sort((a, b) => a.month.localeCompare(b.month))
  }

  // Group raw records by period key
  const rawByPeriod: Record<string, Array<{ category: string; amount: number }>> = {}
  for (const r of records) {
    const key = isDaily
      ? (r.start_date as string).slice(0, 10)   // "2026-03-25"
      : (r.start_date as string).slice(0, 7)    // "2026-03"
    if (!rawByPeriod[key]) rawByPeriod[key] = []
    rawByPeriod[key].push({ category: r.category as string, amount: Math.abs(parseFloat(r.price) || 0) })
  }

  // Build a SpendPoint per period, deduplicating subcategories
  for (const [key, recs] of Object.entries(rawByPeriod)) {
    const label = isDaily ? dayLabel(key) : monthLabel(key)
    byPeriod[key] = buildPeriod(key, label, recs)
  }

  return Object.values(byPeriod).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Fast summary fetch for the dashboard table.
 * Only fetches the 2 most recent periods per subaccount (no full history,
 * no pagination) — ~1 API call per subaccount instead of 3+.
 * Full trend history is loaded on-demand when a row is selected.
 */
export async function getAllCustomerSpend(range: Range = '3m'): Promise<CustomerSpend[]> {
  const subaccounts = await getSubaccounts()

  // For the summary we only need the last 2 periods, so use a short window
  // regardless of the selected range. This avoids paginating 12 months of data
  // for 99 subaccounts just to get 2 numbers.
  const summaryRange: Range = (range === '7d' || range === '30d') ? range : '3m'

  const results = await Promise.all(
    subaccounts.map(async (sub): Promise<CustomerSpend> => {
      const trend    = await getSpendForRange(sub.sid, summaryRange)
      const current  = trend.at(-1)?.total  ?? 0
      const previous = trend.at(-2)?.total  ?? 0
      return {
        sid: sub.sid,
        friendlyName: sub.friendlyName,
        status: sub.status,
        currentPeriod: current,
        previousPeriod: previous,
        trend: [], // trend loaded on-demand when row is selected
      }
    })
  )

  return results.sort((a, b) => b.currentPeriod - a.currentPeriod)
}

/** Aggregates all customer spend into org-wide totals per period */
export function aggregateTrend(customers: CustomerSpend[]): SpendPoint[] {
  const byPeriod: Record<string, SpendPoint> = {}

  for (const c of customers) {
    for (const p of c.trend) {
      if (!byPeriod[p.month]) {
        byPeriod[p.month] = { ...p, total: 0, sms: 0, voice: 0, verify: 0, phoneNumbers: 0 }
      }
      byPeriod[p.month].total        += p.total
      byPeriod[p.month].sms          += p.sms
      byPeriod[p.month].voice        += p.voice
      byPeriod[p.month].verify       += p.verify
      byPeriod[p.month].phoneNumbers += p.phoneNumbers
    }
  }

  return Object.values(byPeriod).sort((a, b) => a.month.localeCompare(b.month))
}

export async function getAllPhoneNumbers(subaccounts: Subaccount[]): Promise<PhoneNumber[]> {
  const results = await Promise.all(
    subaccounts.map(async (sub) => {
      const data = await get(`/Accounts/${sub.sid}/IncomingPhoneNumbers.json?PageSize=100`)
      if (!data?.incoming_phone_numbers) return []
      return (data.incoming_phone_numbers as any[]).map(n => ({
        sid: n.sid,
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name || n.phone_number,
        accountSid: sub.sid,
        accountName: sub.friendlyName,
      }))
    })
  )
  return results.flat()
}
