// Root page — just redirect to the dashboard.
// Middleware handles auth: if not logged in, /dashboard redirects to /login.
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
