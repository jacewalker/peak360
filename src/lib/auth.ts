import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: process.env.DATABASE_URL ? 'pg' : 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (AUTH-04)
    updateAge: 60 * 60 * 24, // refresh after 1 day (sliding window)
  },
  plugins: [
    admin({
      defaultRole: 'coach', // per D-05: new signups default to coach
      adminRoles: ['admin'],
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmailViaSMTP2Go({
          to: email,
          subject: 'Your Peak360 Login Link',
          html: `<p>Click the link below to sign in to Peak360:</p><a href="${url}">Sign in to Peak360</a><p>This link expires in 5 minutes.</p>`,
        });
      },
      expiresIn: 300, // 5 minutes
    }),
    nextCookies(), // must be last plugin
  ],
});
