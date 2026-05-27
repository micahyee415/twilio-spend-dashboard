/**
 * middleware.ts — Protects all /dashboard routes.
 *
 * Any request to /dashboard/* that doesn't have a valid session
 * is automatically redirected to /login. No code needed in each page.
 */
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*'],
}
