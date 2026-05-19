import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';

const isSQLite = !process.env.DATABASE_URL;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: isSQLite ? 'sqlite' : 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    disableSignUp: true, // D-01: block public coach signup; existing accounts unaffected (D-04)
    sendResetPassword: async ({ user, url }) => {
      await sendEmailViaSMTP2Go({
        to: user.email,
        subject: 'Reset your Peak360 password',
        html: `<p>Click the link below to set a new password:</p><a href="${url}">Reset password</a><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      });
    },
  },
  // Phase 4 schema declared email_verified + banned as INTEGER (with a TS-only
  // boolean type hint), and previously we coerced boolean→integer here via
  // databaseHooks. The admin plugin's createUser path bypassed that hook,
  // which broke every invite. Phase 7.1 migrates the columns to BOOLEAN in
  // runMigrations() so Better Auth's native boolean writes work directly;
  // the coercion hook is no longer needed.
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
