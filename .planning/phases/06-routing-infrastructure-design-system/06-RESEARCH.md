# Phase 6: Routing Infrastructure & Design System - Research

**Researched:** 2026-04-12
**Domain:** Next.js middleware hostname routing, Tailwind CSS v4 design tokens, Google Fonts, DigitalOcean DNS
**Confidence:** HIGH

## Summary

This phase has two orthogonal concerns: (1) hostname-based routing so `peak360.com.au` serves a landing page while `portal.peak360.com.au` serves the existing dashboard, and (2) establishing brand design tokens (Montserrat/Open Sans fonts, extended navy/gold palette, gradients) as reusable Tailwind v4 theme tokens.

The hostname routing is straightforward -- Next.js middleware can inspect `req.headers.get('host')` and rewrite requests to different route trees. The existing middleware at `src/middleware.ts` already handles auth; hostname logic slots in before the auth checks. The landing page route tree lives under `src/app/(landing)/` using a route group with its own layout (different fonts, no sidebar). The portal routes remain at their current paths, wrapped in a `(portal)` route group.

**Primary recommendation:** Use Next.js middleware hostname detection with `NextResponse.rewrite()` to route apex domain traffic to a `/landing` internal route, and use `next/font/google` with CSS variables + Tailwind `@theme inline` to establish the landing page design system.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOST-01 | Apex domain (peak360.com.au) serves landing page, not dashboard | Middleware hostname detection + rewrite to landing route group |
| HOST-02 | Portal subdomain (portal.peak360.com.au) serves existing dashboard unchanged | Middleware passes through portal hostname to existing routes |
| HOST-03 | DNS for peak360.com.au resolves to DigitalOcean app | DigitalOcean App Platform domain management + CNAME/A record config |
| DSGN-01 | Brand design tokens: Montserrat, Open Sans fonts; navy/gold colors via Tailwind theme | next/font/google with CSS variables + @theme inline extension |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | Middleware for hostname routing, next/font for font optimization | Already installed; middleware is the canonical Next.js pattern for hostname-based routing |
| tailwindcss | 4.x | Design tokens via @theme inline | Already installed; v4 uses @theme inline for custom tokens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/font/google | (built-in) | Self-host Montserrat + Open Sans with zero layout shift | Loading Google Fonts with automatic optimization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Middleware hostname rewrite | next.config.ts rewrites with `has` hostname condition | Config-level rewrites work but are less flexible for combining with auth middleware logic |
| next/font/google | Google Fonts CDN link tag | Current approach uses CDN link for Inter; next/font is better (self-hosted, no external requests, font-display swap built-in) |

**Installation:**
```bash
# No new packages needed -- next/font is built into Next.js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (portal)/              # Route group for dashboard/assessment (existing routes move here)
│   │   ├── layout.tsx         # Existing RootLayout behavior (Inter font, AppShell sidebar)
│   │   ├── page.tsx           # Dashboard (existing page.tsx)
│   │   ├── assessment/        # Existing assessment routes
│   │   ├── assessments/       # Existing assessments list
│   │   ├── clients/           # Existing clients page
│   │   ├── admin/             # Existing admin routes
│   │   └── login/             # Login page
│   ├── (landing)/             # Route group for public landing page
│   │   ├── layout.tsx         # Landing layout (Montserrat/Open Sans, no sidebar, no auth)
│   │   └── page.tsx           # Landing page (Phase 7 builds content)
│   ├── layout.tsx             # Root layout (minimal: html/body, shared globals.css)
│   └── globals.css            # Shared CSS + @theme inline tokens
├── middleware.ts              # Hostname detection + auth (updated)
└── lib/fonts.ts               # Font definitions (Montserrat, Open Sans, Inter)
```

### Pattern 1: Middleware Hostname Routing
**What:** Inspect the `Host` header in middleware and rewrite requests to the appropriate route group
**When to use:** When a single Next.js app serves multiple hostnames with different content
**Example:**
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PORTAL_HOSTS = ['portal.peak360.com.au', 'localhost:3000'];
const LANDING_HOSTS = ['peak360.com.au', 'www.peak360.com.au'];

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const { pathname } = req.nextUrl;

  // Static assets and API routes -- pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.match(/\.(ico|png|svg|jpg)$/)) {
    return NextResponse.next();
  }

  // Landing page hostname -- rewrite to landing route group
  if (LANDING_HOSTS.some(h => host.startsWith(h))) {
    // Only serve the landing page (and its assets) from apex domain
    // All other paths on apex domain redirect to portal
    if (pathname === '/') {
      // Landing page serves from (landing) route group -- no rewrite needed
      // if using route groups, the landing page IS at /
      return NextResponse.next();
    }
    // Non-root paths on apex domain: redirect to portal
    const portalUrl = new URL(pathname, `https://portal.peak360.com.au`);
    return NextResponse.redirect(portalUrl);
  }

  // Portal hostname -- existing auth middleware logic
  // ... existing auth checks ...
  return NextResponse.next();
}
```

### Pattern 2: Route Groups for Layout Separation
**What:** Use Next.js route groups `(portal)` and `(landing)` to give each hostname its own layout tree without affecting URL paths
**When to use:** When different hostnames need different layouts (sidebar vs. no sidebar, different fonts)
**Example:**
```typescript
// src/app/(landing)/layout.tsx
import { montserrat, openSans } from '@/lib/fonts';

export const metadata = {
  title: 'Peak360 Longevity Program',
  description: 'Comprehensive longevity assessments...',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${openSans.variable} font-body`}>
      {children}
    </div>
  );
}
```

### Pattern 3: Font Definitions with CSS Variables
**What:** Define fonts in a shared module, export as CSS variables, register in Tailwind @theme
**When to use:** When fonts need to be available as Tailwind utility classes
**Example:**
```typescript
// src/lib/fonts.ts
import { Montserrat, Open_Sans, Inter } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
```

```css
/* globals.css -- add to existing @theme inline */
@theme inline {
  /* Existing tokens... */
  --font-heading: var(--font-heading);   /* Montserrat */
  --font-body: var(--font-body);         /* Open Sans */
  
  /* Extended brand palette for landing page */
  --color-navy-950: #0a1628;
  --color-gradient-start: #0f2440;
  --color-gradient-end: #1a365d;
}
```

### Anti-Patterns to Avoid
- **Separate Next.js apps for landing vs portal:** Unnecessary complexity; a single app with middleware routing is simpler and shares the deployment pipeline
- **Google Fonts via CDN link tags:** The current Inter font uses a Google Fonts `<link>` tag in layout.tsx -- this should be migrated to `next/font/google` for both the existing portal fonts AND the new landing fonts. Self-hosted fonts avoid external network requests and prevent layout shift.
- **Hardcoded hostname checks without env vars:** Use environment variables for hostname lists so dev/staging/production all work correctly
- **Moving existing routes into subdirectories:** Route groups `(portal)` use parentheses so URLs stay the same -- do NOT create `/portal/assessment/...` paths

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading + optimization | Manual @font-face declarations | `next/font/google` | Handles self-hosting, font-display, preloading, zero CLS automatically |
| Hostname routing | Custom server.js or Express proxy | Next.js middleware | Built-in, edge-compatible, works with standalone output |
| DNS configuration | Manual DNS zone file editing | DigitalOcean App Platform domain management UI | Handles SSL certificate provisioning automatically |
| CSS design tokens | Sass variables or CSS-in-JS theme | Tailwind `@theme inline` | Already in use; consistent with existing codebase pattern |

## Common Pitfalls

### Pitfall 1: Route Group Root Layout Confusion
**What goes wrong:** Moving existing routes into a `(portal)` route group breaks the root layout if not restructured carefully. The root `layout.tsx` must remain minimal (just `<html>` and `<body>`) while each route group gets its own layout.
**Why it happens:** Next.js requires a root layout at `src/app/layout.tsx` with `<html>` and `<body>`. Route group layouts are nested inside it.
**How to avoid:** Keep root layout minimal. Move AppShell, font classes, and metadata into `(portal)/layout.tsx`. Create a separate `(landing)/layout.tsx` with landing-specific layout.
**Warning signs:** Sidebar appearing on landing page; landing fonts loading on portal pages.

### Pitfall 2: Middleware Rewrite vs Redirect Confusion
**What goes wrong:** Using `NextResponse.redirect()` when `NextResponse.rewrite()` is needed, or vice versa. Redirects change the URL in the browser; rewrites serve different content at the same URL.
**Why it happens:** For hostname routing where both hostnames share `/`, rewrites are tempting but route groups make them unnecessary -- each route group can have its own `page.tsx` at `/`.
**How to avoid:** With route groups, the middleware only needs to detect the hostname and decide which route group's layout to activate. Since both `(portal)/page.tsx` and `(landing)/page.tsx` map to `/`, the middleware needs to rewrite the landing host's `/` to an internal path like `/_landing` OR use a different approach (see Architecture Pattern discussion below).
**Warning signs:** Users seeing the wrong page, URL bar showing unexpected paths.

### Pitfall 3: Hostname Detection in Development
**What goes wrong:** `localhost:3000` doesn't match `peak360.com.au` or `portal.peak360.com.au`, so hostname routing doesn't work in development.
**How to avoid:** Add `localhost:3000` to portal hosts list (default dev behavior = dashboard). For testing landing page locally, either: (a) add `127.0.0.1 peak360.local` to `/etc/hosts` and check for that hostname, or (b) use an env var `LANDING_HOSTNAME` that defaults to `peak360.com.au` in production.
**Warning signs:** Landing page only works in production; can't test locally.

### Pitfall 4: Existing Inter Font CDN Link
**What goes wrong:** The current root layout loads Inter via a Google Fonts `<link>` tag. If not migrated to `next/font`, the app makes external requests to Google servers.
**Why it happens:** The original setup used the CDN approach before next/font was standard.
**How to avoid:** Migrate Inter to `next/font/google` at the same time as adding Montserrat and Open Sans. Remove the `<link>` tags from the root layout `<head>`.

### Pitfall 5: DigitalOcean App Platform Apex Domain
**What goes wrong:** Apex domains (peak360.com.au without www) cannot use CNAME records per DNS spec. Some DNS providers work around this with ALIAS/ANAME records, but not all support it.
**Why it happens:** DNS RFC prohibits CNAME at zone apex.
**How to avoid:** DigitalOcean recommends either (a) using DO as your DNS provider (they handle it natively) or (b) using a DNS provider that supports ALIAS/ANAME records (e.g., Cloudflare with "CNAME flattening"). Check what DNS provider manages peak360.com.au.

## Code Examples

### Middleware with Hostname Detection (Recommended Approach)
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Hostnames that should serve the landing page
const LANDING_HOSTNAMES = new Set(
  (process.env.LANDING_HOSTNAMES ?? 'peak360.com.au,www.peak360.com.au').split(',')
);

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';  // strip port
  const { pathname } = req.nextUrl;

  // Static assets -- always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|svg|ico|jpg|jpeg|gif|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Landing page hostname
  if (LANDING_HOSTNAMES.has(hostname)) {
    // Serve the landing page for root path
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/landing';  // rewrite to internal /landing route
      return NextResponse.rewrite(url);
    }
    // API routes on landing domain (e.g., contact form) -- pass through
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    // All other paths on landing domain -- redirect to portal
    const portalUrl = new URL(pathname, `https://portal.peak360.com.au`);
    return NextResponse.redirect(portalUrl);
  }

  // Portal hostname -- existing auth middleware logic below
  // ... (keep existing auth logic unchanged) ...
}
```

### Font Setup with next/font/google
```typescript
// src/lib/fonts.ts
import { Montserrat, Open_Sans, Inter } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
```

### Root Layout (Minimal)
```typescript
// src/app/layout.tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

### Tailwind Design Tokens
```css
/* Add to globals.css @theme inline */
@theme inline {
  /* Existing tokens remain... */

  /* Landing page fonts */
  --font-heading: var(--font-heading);  /* Montserrat -- set by next/font CSS var */
  --font-body: var(--font-body);        /* Open Sans -- set by next/font CSS var */

  /* Extended gradient colors for landing page */
  --color-navy-950: #0a1628;
  --color-gold-50: #fef7e8;
}
```

## Routing Architecture Decision

There are two viable approaches for hostname routing with route groups. The recommended approach:

### Approach: Internal Rewrite Path (Recommended)
Create a `/landing` route that is NOT in a route group (so it has a real path), and rewrite apex domain `/` to `/landing` in middleware. This avoids the problem of two route groups both claiming `/`.

```
src/app/
├── landing/           # Real route at /landing, served via rewrite from apex domain
│   ├── layout.tsx     # Landing-specific layout (Montserrat/Open Sans, no sidebar)
│   └── page.tsx       # Landing page content
├── (portal)/          # Not needed if existing routes stay where they are
├── layout.tsx         # Root layout (minimal)
├── page.tsx           # Dashboard (existing, served on portal hostname)
```

The middleware rewrites `peak360.com.au/` to `/landing`. Portal users never see `/landing` because the middleware only rewrites for the landing hostname. Direct access to `/landing` on the portal hostname can be blocked by the middleware.

**Why this approach:** Simpler than route groups for a two-hostname scenario. Existing routes don't need to move at all. The only new code is the `/landing` directory and the middleware hostname check.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Fonts CDN `<link>` | `next/font/google` self-hosted | Next.js 13+ (2023) | No external requests, zero CLS, better privacy |
| Tailwind v3 `tailwind.config.js` theme | Tailwind v4 `@theme inline` in CSS | 2024-2025 | Tokens defined in CSS, no JS config file |
| Custom server.js for multi-domain | Next.js middleware | Next.js 12+ (2022) | Edge-compatible, works with standalone output |

**Deprecated/outdated:**
- Google Fonts `<link>` tag approach: Still works but `next/font` is strictly better
- `tailwind.config.js` theme extension: Replaced by `@theme inline` in Tailwind v4

## Open Questions

1. **DNS Provider for peak360.com.au**
   - What we know: DigitalOcean App Platform needs either DO-managed DNS or CNAME/ALIAS records
   - What's unclear: Which DNS provider currently manages peak360.com.au
   - Recommendation: Check current DNS setup; if using a provider that doesn't support ALIAS records for apex, consider migrating DNS to DigitalOcean or Cloudflare

2. **DigitalOcean App Platform Multi-Domain Config**
   - What we know: App Platform supports adding multiple custom domains
   - What's unclear: Whether both `peak360.com.au` and `portal.peak360.com.au` are already configured in App Platform
   - Recommendation: Both domains need to be added in App Platform settings; SSL certificates will auto-provision

3. **Local Development Hostname Testing**
   - What we know: localhost:3000 should default to portal behavior
   - What's unclear: Best developer experience for testing landing page locally
   - Recommendation: Use env var `LANDING_HOSTNAMES` with option to add `localhost:3000` temporarily, or use `/etc/hosts` with a local alias

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js 16 + React 19 + Tailwind CSS v4 -- all new code must use these
- **Import paths:** Always use `@/` alias, never relative paths
- **Type imports:** Use `import type { ... }` for TypeScript types
- **Component style:** PascalCase files, `'use client'` directive for interactive components
- **Existing color scheme:** `--color-navy: #1a365d`, `--color-gold: #F5A623` in globals.css
- **Output mode:** `standalone` in next.config.ts (important for deployment, middleware works with this)
- **Deployment:** DigitalOcean App Platform with auto-deploy from main
- **Font current state:** Inter loaded via Google Fonts CDN `<link>` tag (should migrate to next/font)

## Sources

### Primary (HIGH confidence)
- Next.js middleware documentation -- hostname detection and rewrite patterns
- Tailwind CSS v4 @theme inline -- custom token definitions
- Existing codebase analysis -- middleware.ts, globals.css, layout.tsx, AppShell.tsx

### Secondary (MEDIUM confidence)
- [Next.js Font Optimization docs](https://nextjs.org/docs/app/getting-started/fonts) - next/font/google setup
- [DigitalOcean App Platform domain management](https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/) - custom domain setup
- [Google Fonts in Next.js 15 + Tailwind v4 guide](https://www.buildwithmatija.com/blog/how-to-use-custom-google-fonts-in-next-js-15-and-tailwind-v4) - CSS variable + @theme integration
- [Vercel hostname rewrites template](https://vercel.com/templates/next.js/hostname-rewrites) - middleware hostname routing pattern

### Tertiary (LOW confidence)
- [Multi-domain Next.js demo](https://github.com/valdemartti/nextjs-multi-domain) - community pattern (verify before adopting)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing Next.js + Tailwind, no new dependencies
- Architecture: HIGH - middleware hostname routing is well-documented Next.js pattern
- Pitfalls: HIGH - based on direct codebase analysis (existing middleware, CDN font links, route structure)
- DNS/DigitalOcean: MEDIUM - general approach is clear but specific domain config unknown

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, unlikely to change)
