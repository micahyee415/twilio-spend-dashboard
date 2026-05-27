/**
 * auth.ts — NextAuth configuration.
 *
 * Restricts login to @example.com Google accounts only.
 * Anyone with a non-example.com email will be rejected at sign-in.
 */
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

function auditLog(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }))
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Block anyone whose email isn't @example.com
    signIn({ profile }) {
      const allowed = profile?.email?.endsWith('@example.com') ?? false
      if (!allowed) {
        auditLog('auth.signIn.blocked', { email: profile?.email, reason: 'domain_not_allowed' })
      }
      return allowed
    },
  },
  events: {
    signIn({ user, account }) {
      auditLog('auth.signIn', { userId: user.email, provider: account?.provider })
    },
    signOut({ token }) {
      auditLog('auth.signOut', { userId: token?.email })
    },
  },
  pages: {
    signIn: '/login',  // use our custom login page instead of NextAuth's default
  },
}
