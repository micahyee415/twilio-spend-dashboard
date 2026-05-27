# twilio-dashboard

> A Next.js dashboard for tracking Twilio usage and spend across subaccounts, with a compliance view for phone number inventory and account status.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Auth.js](https://img.shields.io/badge/Auth.js-NextAuth_4-purple)

---

## Overview

This internal dashboard gives ops and finance teams a clear view of Twilio spending across all subaccounts — with period-over-period comparisons, product-level breakdowns, and on-demand drill-downs into individual customer accounts. A separate compliance view surfaces phone number inventory and flags suspended or closed subaccounts.

Data is fetched server-side via the Twilio REST API and cached at the edge (Vercel ISR + `Cache-Control`), so page loads are instant even across large subaccount fleets.

---

## Features

- **Org-wide cost overview** — total spend for the most recent period, annual run-rate, month-to-date forecast, and average cost per active subaccount
- **Period-over-period change** — MoM delta with directional indicators for each metric
- **Idle account detection** — highlights active subaccounts with $0 spend in the current period
- **Spend trend chart** — line chart of daily (7d/30d) or monthly (3m/6m/12m) spend; switches to per-subaccount view when a row is selected
- **Product breakdown chart** — donut chart of spend by Twilio product (SMS, Voice, Verify, Phone Numbers) for the current period
- **Subaccount spend table** — sortable by spend, filterable by status (active / suspended / closed), with inline search; click a row to drill into that account's trend
- **On-demand trend drill-down** — selecting a subaccount row fetches its full spend history via `/api/trend` without reloading the page
- **Selectable time ranges** — 7 days, 30 days, 3 months, 6 months, 12 months; all views update in sync
- **Compliance view** — total phone number inventory across all subaccounts, per-customer counts, suspended account warnings, and closed account review flags
- **Google SSO authentication** — sign-in restricted to your domain; all `/dashboard` routes protected by NextAuth middleware
- **Edge caching** — ISR revalidation every 5 minutes; API routes cached at Vercel's edge with stale-while-revalidate

---

## Screenshots

> _Add screenshots here before publishing._

---

## Architecture

```
app/
├── api/trend/          → On-demand subaccount spend API (authenticated, edge-cached)
├── dashboard/
│   ├── page.tsx        → Cost overview (ISR, server component, streams via Suspense)
│   ├── compliance/     → Phone number inventory + subaccount status
│   └── layout.tsx      → Sidebar nav + session guard
├── login/              → Google SSO sign-in page
└── page.tsx            → Root redirect → /dashboard

components/
├── DashboardClient     → Client shell: metric cards, charts, table, drill-down state
├── SpendTrendChart     → Recharts line chart (client, browser-only)
├── ProductBreakdownChart → Recharts donut chart (client, browser-only)
├── CustomerSpendTable  → Filterable, searchable subaccount table
├── MetricCard          → Stat card with MoM delta and alert styling
├── DateRangePicker     → Range pill switcher (7d / 30d / 3m / 6m / 12m)
└── DashboardSkeleton   → Loading placeholder shown during Suspense fallback

lib/
├── twilio.ts           → All Twilio REST calls (server-only); pagination, de-duplication,
│                         period padding, spend aggregation
└── auth.ts             → NextAuth config: Google provider, domain allowlist, audit logging

middleware.ts           → Protects /dashboard/* — unauthenticated requests → /login
```

**Key design decisions:**

- All Twilio credentials stay server-side; they never reach the browser.
- The summary table loads only the 2 most recent periods per subaccount (fast). Full trend history is fetched on-demand when a row is clicked.
- Twilio omits subcategory records when an aggregate category is present (e.g. both `sms` and `sms-outbound-longcode`). `lib/twilio.ts` deduplicates these to avoid double-counting.
- Twilio also omits periods with zero activity. The library pads missing periods with `$0` entries so charts render a continuous line rather than a single dot.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Auth | [NextAuth.js v4](https://next-auth.js.org) — Google OAuth provider |
| Charts | [Recharts 2](https://recharts.org) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Data source | [Twilio REST API](https://www.twilio.com/docs/usage/api) |
| Deployment | [Vercel](https://vercel.com) |
| CI | GitHub Actions (type-check, build, npm audit, CodeQL) |

---

## Getting Started

### Prerequisites

- Node.js 22+
- A Twilio account with one or more subaccounts
- A Google Cloud project with OAuth 2.0 credentials (for SSO)

### Install

```bash
git clone https://github.com/micahyee415/twilio-spend-dashboard
cd twilio-spend-dashboard
npm install
```

### Configuration

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info (starts with `AC`) |
| `TWILIO_API_KEY_SID` | Twilio Console → API keys & tokens (starts with `SK`) |
| `TWILIO_API_KEY_SECRET` | Shown once when you create the API key |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same credentials page |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev; Vercel sets this automatically in production |

**Google OAuth setup:**
1. Create an OAuth 2.0 client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI for local dev.
3. Add your production URL (`https://your-app.vercel.app/api/auth/callback/google`) for production.

**Domain restriction:** `lib/auth.ts` restricts sign-in to a single email domain. Update the `endsWith('@example.com')` check to match your organization's domain.

### Run (development)

```bash
npm run dev
# → http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/micahyee415/twilio-spend-dashboard)

1. Import the repo in [Vercel](https://vercel.com/new).
2. Add all environment variables from `.env.local.example` in the Vercel project settings.
3. Deploy. Vercel sets `NEXTAUTH_URL` automatically.

`vercel.json` sets a 60-second function timeout for the dashboard and API routes to accommodate large subaccount fleets.

---

## License

This project does not include a license file. All rights reserved unless otherwise stated.
