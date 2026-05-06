---
phase: quick-260506-snj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/page.tsx
  - src/app/layout.tsx
  - src/app/landing.css
  - src/app/v2/page.tsx
  - src/app/v2/layout.tsx
  - src/app/v2/v2.css
  - public/landing/peak360-logo.png
  - public/landing/peak360-logo-light.png
  - public/v2/peak360-logo.png
  - public/v2/peak360-logo-light.png
  - src/lib/landing-gate.ts
  - src/app/gate/page.tsx
  - src/app/api/landing-gate/route.ts
  - src/middleware.ts
  - .env.example
autonomous: true
requirements:
  - QUICK-260506-snj
must_haves:
  truths:
    - "Visiting / with no gate cookie redirects to /gate?next=/"
    - "Submitting correct password on /gate sets landing_gate cookie and redirects to /"
    - "Submitting wrong password on /gate redirects to /gate?error=1 (carrying next)"
    - "/v2 no longer exists (404 or redirect)"
    - "/portal/* and /api/auth/* are NOT gated and continue to work"
    - "When LANDING_GATE_SECRET is unset and NODE_ENV !== 'production', / loads (fail-open dev)"
  artifacts:
    - path: "src/app/page.tsx"
      provides: "Promoted v2 landing page (was coming-soon)"
    - path: "src/app/landing.css"
      provides: "Relocated v2.css scoped to .v2-root"
    - path: "src/lib/landing-gate.ts"
      provides: "Web-Crypto HMAC sign/verify helpers + GATE_COOKIE_NAME"
    - path: "src/app/gate/page.tsx"
      provides: "Server-rendered password form, themed with landing tokens"
    - path: "src/app/api/landing-gate/route.ts"
      provides: "POST handler validates password, sets cookie, redirects"
    - path: "src/middleware.ts"
      provides: "Extended with landing-gate check"
    - path: "public/landing/peak360-logo.png"
      provides: "Relocated logo asset"
  key_links:
    - from: "src/app/page.tsx"
      to: "src/app/landing.css"
      via: "imported once from src/app/layout.tsx (NOT page.tsx)"
      pattern: "import './landing.css'"
    - from: "src/middleware.ts"
      to: "src/lib/landing-gate.ts"
      via: "verifyGateToken called on edge runtime"
      pattern: "verifyGateToken"
    - from: "src/app/api/landing-gate/route.ts"
      to: "src/lib/landing-gate.ts"
      via: "signGateToken issues cookie value"
      pattern: "signGateToken"
---

<objective>
Promote the existing /v2 landing page to be the site's primary landing at /, and place a single-password gate in front of all unauthenticated public routes (currently just /). The gate must run on Edge (middleware), use Web Crypto only, fail-open in development, and fail-closed in production.

Purpose: Ship the new landing page as the public face of peak360.com.au while restricting access to invited prospects only, until the marketing launch.
Output: Promoted landing page, deleted /v2 directory, working password gate, .env.example documentation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

<!-- Files to read once during execution. Do not re-read. -->
@src/middleware.ts
@src/app/v2/page.tsx
@src/app/v2/layout.tsx
@src/app/v2/v2.css
@src/app/page.tsx
@src/app/layout.tsx
@.env.example

<interfaces>
<!-- Extracted contracts the executor needs upfront -->

Existing middleware (src/middleware.ts) flow order — PRESERVE THIS:
1. Static asset bypass (`_next`, favicon, .png, .svg, .ico)
2. Portal subdomain → apex /portal redirect (PORTAL_SUBDOMAIN_HOSTNAMES)
3. Better Auth pass-through (`/api/auth/*`)
4. PUBLIC_PATHS check (`/login`, `/api/health`)
5. Landing public branch (any non-portal, non-api path → next())
6. Protected: session cookie required (portal/admin)

New gate must slot in BETWEEN steps 2 and 3 (after portal redirect, before everything else) so /api/auth, /gate, /api/landing-gate are exempted INSIDE the gate function.

Existing v2 layout fonts to hoist (src/app/v2/layout.tsx):
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
/>
```

v2 page exports default `V2LandingPage` and uses `LOGO_SRC = '/v2/peak360-logo.png'` in two places (Nav brand img, Footer brand img). Update both to `/landing/peak360-logo.png` after move.

Better Auth import already present and must remain:
```ts
import { getSessionCookie } from 'better-auth/cookies';
```

Landing gate helper signatures (NEW - src/lib/landing-gate.ts):
```ts
export const GATE_COOKIE_NAME = 'landing_gate';
export const GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export async function signGateToken(secret: string): Promise<string>;
export async function verifyGateToken(token: string, secret: string): Promise<boolean>;
```
Token format: `${expiryEpochMs}.${hmacBase64Url}` where HMAC-SHA256(expiry, secret) via `crypto.subtle.importKey` + `crypto.subtle.sign`. Base64url encode (no padding, '+' → '-', '/' → '_'). Verify: split on '.', recompute HMAC over expiry string, constant-time compare both bytes (loop XOR-OR), then check `Number(expiry) > Date.now()`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Promote v2 landing to / and delete /v2</name>
  <files>
    src/app/page.tsx,
    src/app/layout.tsx,
    src/app/landing.css,
    public/landing/peak360-logo.png,
    public/landing/peak360-logo-light.png,
    (delete) src/app/v2/page.tsx,
    (delete) src/app/v2/layout.tsx,
    (delete) src/app/v2/v2.css,
    (delete) public/v2/peak360-logo.png,
    (delete) public/v2/peak360-logo-light.png
  </files>
  <action>
    Part A — Promote v2 to root.

    1. Create `public/landing/` directory and `git mv public/v2/peak360-logo.png public/landing/peak360-logo.png` and same for `peak360-logo-light.png`. Use `git mv` so history is preserved.

    2. Move v2 stylesheet: `git mv src/app/v2/v2.css src/app/landing.css`. The file's CSS classes are scoped to `.v2-root` — DO NOT rename the wrapper class for this task (callout in known_constraints).

    3. Replace `src/app/page.tsx` entirely with the contents of `src/app/v2/page.tsx`. Then update both occurrences of `LOGO_SRC = '/v2/peak360-logo.png'` to `LOGO_SRC = '/landing/peak360-logo.png'`. The page stays a `'use client'` component. Rename the default export from `V2LandingPage` to `LandingPage` for clarity.

    4. Update `src/app/layout.tsx`:
       - Add `import './landing.css';` directly after `import './globals.css';` (global stylesheet must be loaded from a server component, not the client page).
       - Add `metadata` for the landing (title/description from old v2/layout.tsx) — REPLACE the existing `metadata` export (the old "Peak360 Longevity Assessment" text) with the v2 strings: title `'Peak360 — Discover Your True Health Age'`, description `'World-class longevity testing in Geelong. 60+ biomarkers, on-site VO₂ Max, and a 5-tier rating system to reveal your true biological age.'`.
       - Inside `<head>` (after the existing viewport meta), add the three Google Fonts links exactly as listed in the interfaces block above (preconnect ×2 + Inter Tight / JetBrains Mono stylesheet).
       - Keep the existing `<body className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}>` — do NOT remove the inter font variable; the landing.css `.v2-root` overrides font-family inside the wrapper anyway.

    5. Delete the entire `src/app/v2/` directory: `git rm -r src/app/v2/`. Delete the now-empty `public/v2/` directory.

    6. Remove the obsolete coming-soon imports from page.tsx — confirm no remaining references to `montserrat`, `openSans`, `next/link`, `next/image` exist in the new page.tsx (it shouldn't — we replaced the file wholesale, but double-check after edit).

    Verification snippets:
      - `grep -r "/v2/" src/ public/` returns nothing (or only this PLAN file).
      - `grep -r "from '@/lib/fonts'" src/app/page.tsx` returns nothing.
      - `grep "LOGO_SRC = '/landing/peak360-logo.png'" src/app/page.tsx` matches.
  </action>
  <verify>
    <automated>test ! -d src/app/v2 && test -f src/app/landing.css && test -f public/landing/peak360-logo.png && test -f public/landing/peak360-logo-light.png && grep -q "import './landing.css'" src/app/layout.tsx && grep -q "/landing/peak360-logo.png" src/app/page.tsx && ! grep -rn "/v2/peak360-logo" src/ public/ 2>/dev/null && npx --yes tsc --noEmit -p tsconfig.json && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    /v2 directory deleted; landing page renders at / with v2 styling and Google fonts loaded from root layout; logos served from /landing/; tsc passes; production build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Build landing-gate helper, /gate page, and /api/landing-gate route</name>
  <files>
    src/lib/landing-gate.ts,
    src/app/gate/page.tsx,
    src/app/api/landing-gate/route.ts
  </files>
  <action>
    Part B (1-3) — Implement gate primitives. Edge-runtime safe = Web Crypto only, no Node `crypto` imports in the helper.

    1. **`src/lib/landing-gate.ts`** — Pure module, no Next imports:

       ```ts
       export const GATE_COOKIE_NAME = 'landing_gate';
       export const GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

       function base64urlEncode(bytes: ArrayBuffer): string {
         const b = btoa(String.fromCharCode(...new Uint8Array(bytes)));
         return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
       }
       function base64urlDecode(s: string): Uint8Array {
         const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
         const b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
         const bin = atob(b);
         const out = new Uint8Array(bin.length);
         for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
         return out;
       }
       async function hmac(secret: string, message: string): Promise<ArrayBuffer> {
         const key = await crypto.subtle.importKey(
           'raw',
           new TextEncoder().encode(secret),
           { name: 'HMAC', hash: 'SHA-256' },
           false,
           ['sign'],
         );
         return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
       }

       export async function signGateToken(secret: string): Promise<string> {
         const expiry = String(Date.now() + GATE_MAX_AGE_SECONDS * 1000);
         const sig = base64urlEncode(await hmac(secret, expiry));
         return `${expiry}.${sig}`;
       }

       export async function verifyGateToken(token: string, secret: string): Promise<boolean> {
         if (!token || typeof token !== 'string') return false;
         const dot = token.indexOf('.');
         if (dot <= 0) return false;
         const expiry = token.slice(0, dot);
         const sig = token.slice(dot + 1);
         if (!/^\d+$/.test(expiry)) return false;
         const expected = new Uint8Array(await hmac(secret, expiry));
         const got = base64urlDecode(sig);
         if (expected.length !== got.length) return false;
         let diff = 0;
         for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ got[i];
         if (diff !== 0) return false;
         return Number(expiry) > Date.now();
       }
       ```

    2. **`src/app/gate/page.tsx`** — Server component (no `'use client'`). Wrap the form in `<div className="v2-root">` so landing.css tokens apply. Reuse `.btn .btn-gold`, `.eyebrow`, `.container` classes from landing.css. Read searchParams via the App Router pattern:

       ```tsx
       export default async function GatePage({
         searchParams,
       }: {
         searchParams: Promise<{ error?: string; next?: string }>;
       }) {
         const sp = await searchParams;
         const showError = sp.error === '1';
         const next = sp.next ?? '';
         // Render: centered card, eyebrow "ACCESS", h1 "Peak360 — Restricted",
         // <form action="/api/landing-gate" method="POST">
         //   <input type="hidden" name="next" value={next} />
         //   <input type="password" name="password" required autoFocus
         //          placeholder="Access code" />
         //   <button type="submit" className="btn btn-gold">Continue</button>
         //   {showError && <p style={{color:'#e87b6b'}}>Incorrect password.</p>}
         // </form>
       }
       ```
       Style inline or via classes already present in landing.css. Keep markup minimal; ~60 lines max. Add a small inline `<style>` block for the centered card (`min-height: 100vh; display: grid; place-items: center;`) — do NOT add new CSS files.

       Also export metadata: `{ title: 'Peak360 — Restricted', robots: { index: false, follow: false } }` so search engines don't index the gate.

    3. **`src/app/api/landing-gate/route.ts`** — POST handler. Use Edge runtime (`export const runtime = 'edge'`) so the helper's Web Crypto path is consistent and middleware/route share the same runtime characteristics.

       ```ts
       import { NextRequest, NextResponse } from 'next/server';
       import { GATE_COOKIE_NAME, GATE_MAX_AGE_SECONDS, signGateToken } from '@/lib/landing-gate';

       export const runtime = 'edge';

       function safeNext(raw: string | null): string {
         if (!raw) return '/';
         if (!raw.startsWith('/')) return '/';
         if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
         return raw;
       }

       function constantTimeEqualStrings(a: string, b: string): boolean {
         const enc = new TextEncoder();
         const aBytes = enc.encode(a);
         const bBytes = enc.encode(b);
         // Always loop the longer length so timing depends on neither input
         const len = Math.max(aBytes.length, bBytes.length);
         let diff = aBytes.length ^ bBytes.length;
         for (let i = 0; i < len; i++) {
           diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
         }
         return diff === 0;
       }

       export async function POST(req: NextRequest) {
         const password = process.env.LANDING_PASSWORD;
         const secret = process.env.LANDING_GATE_SECRET;
         if (!password || !secret) {
           return NextResponse.json(
             { error: 'Landing gate not configured: LANDING_PASSWORD and LANDING_GATE_SECRET must be set.' },
             { status: 500 },
           );
         }

         const form = await req.formData();
         const submitted = String(form.get('password') ?? '');
         const next = safeNext(typeof form.get('next') === 'string' ? String(form.get('next')) : null);
         const ok = constantTimeEqualStrings(submitted, password);

         if (!ok) {
           const url = new URL('/gate', req.url);
           url.searchParams.set('error', '1');
           if (next !== '/') url.searchParams.set('next', next);
           return NextResponse.redirect(url, 303);
         }

         const token = await signGateToken(secret);
         const res = NextResponse.redirect(new URL(next, req.url), 303);
         res.cookies.set(GATE_COOKIE_NAME, token, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'lax',
           path: '/',
           maxAge: GATE_MAX_AGE_SECONDS,
         });
         return res;
       }
       ```

    Notes:
      - Do NOT use Node's `crypto.timingSafeEqual` — Edge runtime has no Node `crypto` module.
      - `NextResponse.redirect(url, 303)` ensures POST → GET conversion.
      - Open-redirect guard: only relative paths starting with single `/` (and not `//` or `/\`).
  </action>
  <verify>
    <automated>npx --yes tsc --noEmit -p tsconfig.json && test -f src/lib/landing-gate.ts && test -f src/app/gate/page.tsx && test -f src/app/api/landing-gate/route.ts && grep -q "GATE_COOKIE_NAME = 'landing_gate'" src/lib/landing-gate.ts && grep -q "crypto.subtle" src/lib/landing-gate.ts && ! grep -q "from 'crypto'" src/lib/landing-gate.ts && ! grep -q "from 'node:crypto'" src/lib/landing-gate.ts && grep -q "runtime = 'edge'" src/app/api/landing-gate/route.ts && grep -q 'sameSite' src/app/api/landing-gate/route.ts && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    Helper compiles edge-safe (no node:crypto); /gate renders a themed password form; POST /api/landing-gate accepts correct password (sets cookie + 303 redirect to next), rejects wrong password (303 redirect to /gate?error=1), returns 500 when env vars missing; production build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 3: Extend middleware with gate check + document env vars</name>
  <files>
    src/middleware.ts,
    .env.example
  </files>
  <action>
    Part B (4-5) — Wire the gate into middleware and document env vars.

    1. **Edit `src/middleware.ts`** — preserve every existing branch. Insert the new gate logic AFTER the portal-subdomain redirect (line ~31) and BEFORE the better-auth bypass (line ~34). Reasoning: this puts the gate after host-based routing but before any path-based public bypass, so the gate function gets to inspect every non-asset, non-portal-subdomain request and decide for itself which paths to exempt.

       Add at top:
       ```ts
       import { GATE_COOKIE_NAME, verifyGateToken } from '@/lib/landing-gate';

       const GATE_EXEMPT_PREFIXES = ['/api/', '/portal/', '/admin/', '/login', '/gate'];
       function isGateExempt(pathname: string): boolean {
         if (pathname === '/login' || pathname === '/gate') return true;
         return GATE_EXEMPT_PREFIXES.some((p) => p.endsWith('/') && pathname.startsWith(p));
       }
       ```
       (Note: `/api/landing-gate` is covered by `/api/` prefix; `/api/auth/*` likewise. The earlier explicit `/api/auth/*` branch later in the function is still needed for the protected-path logic, so leave it.)

       Insert the gate block:
       ```ts
       // Landing gate: restrict public marketing routes behind a password.
       if (!isGateExempt(pathname)) {
         const secret = process.env.LANDING_GATE_SECRET;
         if (!secret) {
           if (process.env.NODE_ENV === 'production') {
             // Fail-closed in prod so the deployer notices a misconfiguration.
             const gateUrl = new URL('/gate', req.url);
             gateUrl.searchParams.set('next', `${pathname}${search}`);
             return NextResponse.redirect(gateUrl);
           }
           console.warn('[landing-gate] LANDING_GATE_SECRET unset; allowing request through (dev fail-open).');
         } else {
           const token = req.cookies.get(GATE_COOKIE_NAME)?.value;
           const ok = token ? await verifyGateToken(token, secret) : false;
           if (!ok) {
             const gateUrl = new URL('/gate', req.url);
             gateUrl.searchParams.set('next', `${pathname}${search}`);
             return NextResponse.redirect(gateUrl);
           }
         }
       }
       ```

       This block sits between the portal-subdomain redirect and the `/api/auth/*` bypass. All subsequent existing logic remains unchanged.

    2. **Edit `.env.example`** — append at the end:
       ```
       # Password for the public landing gate. Required in production.
       # Set via the DigitalOcean App Platform UI (NOT `doctl apps update --spec`,
       # which silently empties existing SECRETs).
       # LANDING_PASSWORD=

       # HMAC secret for signing the landing_gate cookie. Required in production.
       # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
       # If unset in development, the gate fails open (allows access). In production,
       # if unset, all non-exempt paths redirect to /gate so the misconfiguration is visible.
       # LANDING_GATE_SECRET=
       ```

    Sanity checks before finishing:
      - `/api/auth/*`, `/api/landing-gate`, `/portal/*`, `/admin/*`, `/login`, `/gate` are all gate-exempt.
      - The new gate runs on every other path including `/`.
      - Existing portal session-cookie logic is untouched (it now runs after the gate, which is fine because portal paths are exempt from the gate).
      - File remains named `middleware.ts` (do NOT rename to proxy.ts; deferred per known_constraints).
  </action>
  <verify>
    <automated>grep -q "verifyGateToken" src/middleware.ts && grep -q "GATE_COOKIE_NAME" src/middleware.ts && grep -q "isGateExempt" src/middleware.ts && grep -q "getSessionCookie" src/middleware.ts && grep -q "PORTAL_SUBDOMAIN_HOSTNAMES" src/middleware.ts && grep -q "LANDING_PASSWORD" .env.example && grep -q "LANDING_GATE_SECRET" .env.example && npx --yes tsc --noEmit -p tsconfig.json && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    Middleware imports gate helper; gate-exempt paths bypass; /api/auth and portal logic preserved; .env.example documents both new vars with deployment caveat; production build succeeds (Edge bundling validates the helper is Edge-safe).
  </done>
</task>

</tasks>

<verification>
End-to-end smoke (manual, post-build):

1. `npm run dev` (no LANDING_GATE_SECRET set) → visit `http://localhost:3000/` → page loads (dev fail-open warning in console).
2. Set `LANDING_PASSWORD=test` and `LANDING_GATE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")` in `.env.local`, restart dev → visit `/` → redirected to `/gate?next=%2F`.
3. Submit wrong password → redirected to `/gate?error=1`, error message visible.
4. Submit `test` → redirected to `/`, landing page visible, `landing_gate` cookie present in DevTools.
5. Visit `/portal/login` (or any /portal path) → NOT redirected to /gate (portal-exempt).
6. Visit `/api/health` → 200 (api-exempt).
7. `curl -I http://localhost:3000/v2` → 404 (directory deleted).

All three task `<verify>` automated checks must pass before merging.
</verification>

<success_criteria>
- /v2 directory removed; v2 page now lives at /
- landing.css imported from root layout; Google Fonts in <head>
- Logos served from /landing/
- Password gate redirects unauthenticated visitors from / to /gate
- Correct password sets HttpOnly Secure SameSite=Lax cookie (30-day) and redirects to original next
- Open-redirect guard rejects `//evil.com` style next values
- Middleware compiles for Edge runtime (no node:crypto)
- All existing middleware behavior (portal subdomain redirect, better-auth, portal session) unchanged
- `.env.example` documents both new vars + DO Platform caveat
- `npm run build` succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260506-snj-promote-v2-landing-to-and-add-password-g/260506-snj-SUMMARY.md` covering:

- Files moved/deleted/created (with `git mv` history note for logos and v2.css)
- Confirmation that middleware.ts was NOT renamed to proxy.ts (deferred)
- Deployment note: `LANDING_PASSWORD` and `LANDING_GATE_SECRET` MUST be added via DigitalOcean App Platform UI (not `doctl apps update --spec`) BEFORE this branch merges to main, otherwise:
  - In production with secrets set: gate works as intended.
  - In production with secrets MISSING: every public path redirects to /gate (intentional fail-closed).
- Suggested follow-ups: rename `middleware.ts` → `proxy.ts` (separate task), wire a real "Logout of gate" link if needed, add rate limiting to /api/landing-gate.
</output>
