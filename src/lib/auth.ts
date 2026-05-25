import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';
import { renderBrandedEmail } from '@/lib/email/template';

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
        html: renderBrandedEmail({
          preheader: 'Reset your Peak360 password — link expires in 1 hour.',
          heading: 'Reset your password',
          intro:
            'We received a request to reset your Peak360 password. Use the button below to choose a new one.',
          ctaLabel: 'Reset password',
          ctaUrl: url,
          footnote:
            'This link expires in 1 hour. If you didn’t request a reset, you can ignore this email — your password stays the same.',
        }),
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
          html: renderBrandedEmail({
            preheader:
              'Your secure sign-in link for Peak360 — expires in 5 minutes.',
            heading: 'Sign in to Peak360',
            intro:
              'Use the button below to securely access your Peak360 portal. For your security, this link works once and expires shortly.',
            ctaLabel: 'Sign in to Peak360',
            ctaUrl: url,
            footnote:
              'This link expires in 5 minutes and can be used once. If you didn’t request it, you can safely ignore this email.',
          }),
        });
      },
      expiresIn: 300, // 5 minutes
      disableSignUp: true, // sign-in only: a public magic-link request can't mint a new account; invite/client-login createUser flows are unaffected
    }),
    nextCookies(), // must be last plugin
  ],
});
