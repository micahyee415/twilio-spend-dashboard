import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSpendForAccount, type Range } from '@/lib/twilio'

const VALID_RANGES: Range[] = ['7d', '30d', '3m', '6m', '12m']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const sid   = searchParams.get('sid')
  const range = searchParams.get('range') as Range

  if (!sid || !/^AC[a-f0-9]{32}$/.test(sid) || !VALID_RANGES.includes(range)) {
    return new Response('Invalid parameters', { status: 400 })
  }

  const trend = await getSpendForAccount(sid, range)
  return Response.json(trend, {
    headers: {
      // Cache at Vercel's edge for 5 min; serve stale up to 10 min while revalidating
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
