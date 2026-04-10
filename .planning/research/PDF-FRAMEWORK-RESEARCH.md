# PDF Framework Research - Peak360 Report Generation

**Researched:** 2026-04-10
**Domain:** PDF generation for multi-page health assessment reports
**Confidence:** HIGH

## Summary

The current html2canvas-pro + jsPDF approach is fundamentally flawed for multi-page documents because it rasterizes the entire DOM into a single canvas image, then slices it into A4-height strips. This approach has no awareness of content boundaries -- it treats the report as a continuous bitmap. The spacer-insertion algorithm attempts to compensate by pre-measuring DOM elements and injecting invisible divs to push content past page boundaries, but this creates a cascading problem: each spacer shifts all subsequent content, requiring recalculation.

Three viable alternatives exist. After evaluating all major options against the project's specific requirements (colored tables, range bars, dynamic content length, Tailwind styling, A4 pages), the **recommended approach is Playwright/Chromium server-side PDF generation via a Next.js API route**. This approach reuses the existing React report component almost unchanged, leverages CSS `@media print` rules for reliable page breaks, and takes advantage of Playwright already being a project dependency.

**Primary recommendation:** Move PDF generation server-side using Playwright's `page.pdf()` in a Next.js API route. The existing Section11 report markup stays as-is with the addition of CSS print rules. Page breaks become a CSS concern (`break-inside: avoid`, `break-before: page`) instead of a pixel-math concern.

## Current Approach: html2canvas-pro + jsPDF

### How It Works
1. Renders the entire report as a React component in the browser DOM
2. Inserts invisible spacer `<div>`s before elements that would straddle page boundaries
3. Captures the entire DOM container to a single canvas via `html2canvas`
4. Removes spacers
5. Creates a jsPDF instance and slices the canvas image into 297mm-tall strips
6. Each strip becomes one PDF page

### Why It Fails
| Problem | Root Cause |
|---------|-----------|
| Elements cut mid-line at page boundaries | Canvas slicing is purely geometric -- no content awareness |
| Spacer cascade effect | Inserting spacer N shifts all elements after it, invalidating measurements for spacer N+1 |
| Forced page breaks require manual DOM manipulation | No native page break support in canvas approach |
| Margins unreliable | Image positioning uses fixed mm offsets with no CSS box model |
| Text is rasterized (not selectable in PDF) | html2canvas produces bitmap images, not vector text |
| Large file sizes | JPEG-compressed screenshots at 2x scale produce 2-5MB PDFs |

## Alternatives Evaluated

### Option A: @react-pdf/renderer (v4.4.0)

**What it is:** A React-based PDF renderer that uses its own layout engine (built on PDFKit). You write JSX with special components (`<Document>`, `<Page>`, `<View>`, `<Text>`) and it produces PDF output directly -- no browser rendering involved.

**React 19 compatibility:** Confirmed since v4.1.0. Current version 4.4.0 works with React 19.

**Page break handling:**
- Built-in wrapping engine enabled by default
- `wrap={false}` on View makes it unbreakable (moves to next page if it won't fit)
- `break` prop forces a page break before any element
- `fixed` prop renders an element on every page (headers/footers)
- `minPresenceAhead` prevents orphaned content
- `orphans` and `widows` props for text

**Styling:** Supports flexbox, colors, backgrounds, borders, fonts, padding/margin, position. Units: pt, in, mm, cm, %, vw, vh. Uses `StyleSheet.create()` or inline objects -- NOT CSS classes.

**Pros:**
- Native pagination -- the engine KNOWS about page boundaries
- Text remains selectable in output PDF
- Small file sizes (vector output)
- No browser/Chromium dependency
- Works client-side or server-side

**Cons:**
- **REQUIRES COMPLETE REWRITE of the report component.** Cannot use HTML elements, Tailwind classes, or standard CSS. Must rewrite ~800 lines of JSX using @react-pdf primitives.
- No `<table>` element -- must build tables with flexbox Views (or use @ag-media/react-pdf-table)
- The RangeBar component (Tailwind-styled segmented bar with needle indicator) must be completely reimplemented using `<Canvas>` or nested `<View>` elements
- Cannot use existing React component patterns (no `className`, no Tailwind)
- Limited CSS subset -- no CSS Grid, no `display: table`, no `box-shadow`
- Learning curve: different mental model from web development
- Gradient support is limited

**Migration effort:** HIGH (3-5 days). Must rewrite Section11 render output plus RangeBar, TierPill, Disclaimer, ReferralFlag, SectionHeading components entirely in @react-pdf primitives. Data loading logic can remain unchanged.

### Option B: Playwright page.pdf() via API Route (RECOMMENDED)

**What it is:** Use Playwright's Chromium browser (already a project dependency for e2e tests) to load the report page server-side, apply print CSS, and call `page.pdf()` to produce a PDF using Chromium's native print-to-PDF engine.

**Page break handling:**
- Uses CSS `@media print` with standard properties:
  - `break-inside: avoid` -- prevents an element from being split across pages
  - `break-before: page` -- forces element to start on a new page
  - `page-break-inside: avoid` -- legacy equivalent (wider compat)
  - `page-break-before: always` -- legacy equivalent
- Chromium's print engine understands the CSS box model, so margins, padding, and borders all work correctly at page boundaries
- Page size and margins set via `page.pdf({ format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' } })`

**Pros:**
- **MINIMAL MIGRATION.** The existing Section11 component renders the report as HTML/CSS. Playwright visits that page and prints it. The report markup stays almost identical.
- CSS print rules replace the entire spacer algorithm (~80 lines of complex code deleted)
- Text remains selectable in output PDF
- Full CSS support (Tailwind, gradients, box-shadows, etc.)
- Chromium handles page breaks intelligently at the layout engine level
- Playwright is already in package.json (`@playwright/test: ^1.58.2`)
- Produces smaller PDFs than canvas approach
- Headers/footers can be added via `page.pdf({ headerTemplate, footerTemplate })`

**Cons:**
- Requires a running Chromium instance on the server (already available via Playwright)
- PDF generation takes 2-5 seconds (Chromium startup + page render + PDF output)
- Memory usage: ~100-200MB per Chromium process (but only during PDF generation)
- Serverless deployment (Vercel) would require @sparticuz/chromium-min; self-hosted (current) is fine
- Adds `playwright` (not just `@playwright/test`) as a production dependency

**Migration effort:** LOW-MEDIUM (1-2 days).
1. Add print CSS rules to globals.css (~30 lines)
2. Create API route `/api/assessments/[id]/pdf` that launches Playwright, navigates to report page, calls page.pdf()
3. Replace client-side `exportPdf` function with a fetch to the API route
4. Delete the entire spacer algorithm (~80 lines)
5. Add `data-pdf-hide` class to action buttons (already partially done with ref hiding)

### Option C: Puppeteer page.pdf() via API Route

**What it is:** Same approach as Playwright but using Puppeteer instead. Functionally identical for PDF generation since both use Chromium's print-to-PDF engine.

**Key difference from Playwright:** Puppeteer is NOT currently a project dependency. Adding it means a second Chromium-based tool alongside Playwright.

**Page break handling:** Identical to Playwright (same Chromium engine).

**Pros:** Same as Playwright. Slightly smaller package than full Playwright (single-browser only).

**Cons:**
- NOT already a project dependency (Playwright is)
- Would require downloading a separate Chromium binary
- Duplicates browser automation tooling
- Same serverless deployment challenges as Playwright

**Migration effort:** LOW-MEDIUM (1-2 days). Same as Playwright but with additional dependency setup.

**Verdict:** No advantage over Playwright given Playwright is already installed. Skip.

### Option D: pdfmake (v0.3.7)

**What it is:** A declarative PDF generation library using JSON document definitions. You describe the PDF structure as a JavaScript object (not JSX) and pdfmake renders it.

**Page break handling:**
- `pageBreakBefore` callback function for dynamic page break decisions
- `dontBreakRows: true` on tables prevents row splitting
- Manual `pageBreak: 'before'` on any content node

**Pros:**
- Good table support with colored rows, borders, custom layouts
- Works client-side or server-side
- No browser dependency
- Fine-grained control over page breaks

**Cons:**
- **REQUIRES COMPLETE REWRITE** in a non-React JSON definition format
- No JSX/React integration -- everything is JavaScript objects
- The RangeBar would need to be drawn using pdfmake's vector drawing primitives (lines, rectangles)
- Much less ergonomic than React components for complex layouts
- Smaller community than @react-pdf/renderer
- Version 0.3.x suggests less mature API stability

**Migration effort:** HIGH (4-6 days). More work than @react-pdf/renderer because the document definition format is further from React/HTML.

## Comparison Matrix

| Criterion | html2canvas+jsPDF (current) | @react-pdf/renderer | Playwright page.pdf() | pdfmake |
|-----------|---------------------------|---------------------|----------------------|---------|
| Page break reliability | POOR (pixel math) | EXCELLENT (native) | EXCELLENT (CSS print) | GOOD (callbacks) |
| Margin control | POOR (manual offsets) | EXCELLENT (native) | EXCELLENT (CSS + options) | GOOD |
| Text selectable in PDF | NO (rasterized) | YES | YES | YES |
| File size | LARGE (2-5MB) | SMALL (<500KB) | SMALL (<500KB) | SMALL (<500KB) |
| Migration effort | N/A | HIGH (3-5 days) | LOW-MEDIUM (1-2 days) | HIGH (4-6 days) |
| Reuse existing markup | N/A | NO (complete rewrite) | YES (add print CSS) | NO (complete rewrite) |
| Tailwind/CSS support | YES | NO (own style system) | YES (full CSS) | NO (own style system) |
| RangeBar component | Rasterized from DOM | Must reimplement | Works as-is | Must reimplement |
| Dynamic content handling | Manual spacers | Automatic wrapping | CSS break rules | Callback-based |
| Server dependency | None (client-side) | None | Chromium | None |
| Already in project | YES | NO | YES (@playwright/test) | NO |

## Architecture Patterns

### Recommended: Playwright Server-Side PDF Route

```
User clicks "Export PDF"
  -> Client fetches GET /api/assessments/[id]/pdf
  -> API route launches Playwright Chromium
  -> Chromium navigates to /assessment/[id]/section/11?print=true
  -> Page renders with print CSS applied
  -> page.pdf() generates PDF with CSS page breaks
  -> API route streams PDF bytes back to client
  -> Client triggers download via blob URL
```

### Print CSS Rules (added to globals.css)
```css
@media print {
  /* Hide non-print UI */
  [data-pdf-hide] {
    display: none !important;
  }

  /* Prevent rows from splitting across pages */
  .report-marker-row {
    break-inside: avoid;
  }

  /* Prevent category sections from splitting */
  .report-category {
    break-inside: avoid;
  }

  /* Force insights section onto new page */
  .report-insights {
    break-before: page;
  }

  /* Keep insight cards together */
  .report-insight-card {
    break-inside: avoid;
  }

  /* Keep tier summary together */
  .report-tier-card {
    break-inside: avoid;
  }
}
```

### API Route: /api/assessments/[id]/pdf/route.ts
```typescript
import { chromium } from 'playwright';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the report page with print flag
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  await page.goto(`${baseUrl}/assessment/${id}/section/11?print=true`, {
    waitUntil: 'networkidle',
  });

  // Wait for report data to load
  await page.waitForSelector('.report-container');

  // Generate PDF with print media
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true, // Required for background colors
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await browser.close();

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Peak360_Report_${id}.pdf"`,
    },
  });
}
```

### Client-Side Export Button (simplified)
```typescript
const exportPdf = useCallback(async () => {
  setExporting(true);
  try {
    const response = await fetch(`/api/assessments/${assessmentId}/pdf`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peak360_Report_${clientName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF export failed:', err);
  } finally {
    setExporting(false);
  }
}, [assessmentId, clientName]);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page break calculation | Spacer insertion algorithm | CSS `break-inside: avoid` + Chromium print engine | Chromium's layout engine already solves this problem correctly |
| Margin management | Manual mm offsets on canvas slicing | `page.pdf({ margin: {...} })` | PDF margin is a solved parameter |
| Content-aware pagination | DOM measurement + reflow forcing | `@media print` rules | CSS print media is purpose-built for this |
| Text rendering | Canvas rasterization | Chromium vector text rendering | Produces selectable, searchable, smaller PDFs |

## Common Pitfalls

### Pitfall 1: Background Colors Not Appearing
**What goes wrong:** Chromium's print engine strips background colors by default.
**Why it happens:** Print mode defaults to "no backgrounds" to save ink.
**How to avoid:** Always pass `printBackground: true` to `page.pdf()`.
**Warning signs:** Tier row colors, header gradient, and range bar segments appear white.

### Pitfall 2: Playwright Chromium Not Installed in Production
**What goes wrong:** `chromium.launch()` fails because browser binary is not available.
**Why it happens:** `@playwright/test` may not install browser binaries in production; `npx playwright install chromium` must be run as a build step.
**How to avoid:** Add `npx playwright install chromium --with-deps` to build/deploy script. Alternatively, use `playwright` (not just `@playwright/test`) as a dependency.
**Warning signs:** "Browser is not installed" error at runtime.

### Pitfall 3: CSS Print Rules Conflicting with Screen Layout
**What goes wrong:** Adding `break-inside: avoid` or `break-before: page` to normal CSS affects the screen rendering.
**Why it happens:** CSS properties apply to both screen and print unless scoped with `@media print`.
**How to avoid:** All print-specific CSS must be inside `@media print { }` blocks.
**Warning signs:** Report layout shifts on screen.

### Pitfall 4: Network-Idle Wait Insufficient for Data Loading
**What goes wrong:** PDF renders before the report data has loaded from the API.
**Why it happens:** Playwright's `networkidle` waits for 500ms of no network activity, but the Section11 component does multiple sequential API calls.
**How to avoid:** Use `page.waitForSelector('.report-container [data-loaded="true"]')` or a similar explicit signal. Add a `data-loaded` attribute to the report container after all data is fetched.
**Warning signs:** PDF shows loading spinners or empty tables.

### Pitfall 5: Self-Referential URL Resolution
**What goes wrong:** The API route navigates Playwright to the same server that's handling the request, potentially causing deadlocks on single-threaded servers.
**Why it happens:** The PDF API route calls back to the same Next.js server to render the report page.
**How to avoid:** Ensure Next.js is running with enough worker threads. In standalone mode, Next.js uses Node.js clustering by default. Alternatively, render the HTML template directly in the API route instead of navigating to a URL.
**Warning signs:** PDF generation hangs indefinitely.

### Pitfall 6: Memory Pressure from Chromium
**What goes wrong:** Multiple concurrent PDF requests exhaust server memory.
**Why it happens:** Each Chromium instance uses 100-200MB.
**How to avoid:** Use a browser pool pattern -- launch one persistent browser, create new pages (not browsers) per request. Add request queuing/throttling for concurrent PDF exports.
**Warning signs:** Server OOM, slow PDF generation.

## Code Examples

### Browser Pool Pattern (recommended for production)
```typescript
// src/lib/pdf/browser-pool.ts
import { chromium, type Browser } from 'playwright';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

// Call on server shutdown
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
```

### Print-Aware Report Container
```tsx
// In Section11.tsx, detect print mode via URL param
const searchParams = useSearchParams();
const isPrintMode = searchParams.get('print') === 'true';

return (
  <div
    ref={reportRef}
    className="report-container bg-white"
    data-loaded={dataLoaded ? 'true' : 'false'}
  >
    {/* Action buttons hidden in print mode */}
    {!isPrintMode && (
      <div ref={actionsTopRef} className="...">
        <button onClick={exportPdf}>Export PDF</button>
      </div>
    )}
    {/* ... rest of report ... */}
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas + jsPDF | Playwright/Puppeteer page.pdf() | 2022-2023 (industry shift) | CSS print rules replace pixel math; vector text output |
| Client-side PDF generation | Server-side PDF generation | 2023-present | Better reliability, consistent output across browsers |
| Manual page break spacers | CSS break-inside/break-before | CSS3 (well-supported since 2020+) | Native browser support, no JavaScript needed |

**Deprecated/outdated:**
- html2canvas: Still maintained, but not designed for multi-page documents. Best for single-page screenshots.
- PhantomJS-based solutions (html-pdf): PhantomJS is abandoned.
- wkhtmltopdf: Unmaintained, uses outdated WebKit.

## Open Questions

1. **Browser pool vs. per-request launch**
   - What we know: Per-request launch is simpler but slower (~2s overhead). Browser pool is faster but needs lifecycle management.
   - What's unclear: Concurrent PDF generation load in production (how many reports per minute?)
   - Recommendation: Start with per-request launch; add browser pool if latency becomes an issue.

2. **Self-referential URL pattern**
   - What we know: The API route will navigate Playwright to the same server to render the report.
   - What's unclear: Whether Next.js standalone mode handles this without deadlocking.
   - Recommendation: Test with a single request first. If deadlock occurs, render the report HTML as a string in the API route instead of navigating to a URL.

3. **Print CSS fine-tuning**
   - What we know: `break-inside: avoid` works well for most content blocks.
   - What's unclear: Edge cases where a single table category is taller than one page.
   - Recommendation: Test with a full-data assessment (all 63 blood markers rated). Categories taller than one page should allow internal row breaks but avoid splitting individual rows.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Playwright | PDF generation | YES (devDep) | 1.58.2 | Move to regular dep |
| Chromium browser | Playwright | YES (via Playwright install) | bundled | Chrome at /Applications/ |
| Node.js | API route | YES | 20+ | -- |

**Missing dependencies with no fallback:**
- None. All required tools are present.

**Missing dependencies with fallback:**
- Playwright is currently a devDependency. For production PDF generation, it needs to be a regular dependency, OR the Chromium binary needs to be available in the production environment via `npx playwright install chromium`.

## Sources

### Primary (HIGH confidence)
- [react-pdf.org/advanced](https://react-pdf.org/advanced) - Page wrapping, break props, fixed elements documentation
- [react-pdf.org/components](https://react-pdf.org/components) - Component API and props
- [react-pdf.org/styling](https://react-pdf.org/styling) - Supported CSS properties
- [react-pdf.org/compatibility](https://react-pdf.org/compatibility) - React 19 compatibility confirmed since v4.1.0
- [playwright.dev/docs/api/class-page](https://playwright.dev/docs/api/class-page) - page.pdf() API documentation
- npm registry - Version verification: @react-pdf/renderer 4.4.0, puppeteer 24.40.0, pdfmake 0.3.7, @playwright/test 1.59.1

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright PDF guide](https://www.browserstack.com/guide/playwright-pdf-html-generation) - CSS page break support in Playwright
- [DEV Community - PDF generation 2025](https://dev.to/michal_szymanowski/how-to-generate-pdfs-in-2025-26gi) - Ecosystem comparison
- [DEV Community - Next.js + Puppeteer](https://dev.to/harshvats2000/creating-a-nextjs-api-to-convert-html-to-pdf-with-puppeteer-vercel-compatible-16fc) - Serverless patterns

### Tertiary (LOW confidence)
- [npm-compare.com](https://npm-compare.com/html-pdf,pdfkit,pdfmake,puppeteer,react-pdf,wkhtmltopdf) - Download stats comparison

## Metadata

**Confidence breakdown:**
- Standard stack (Playwright recommendation): HIGH - already a project dependency, well-documented API, proven pattern
- Architecture (API route pattern): HIGH - standard Next.js pattern, multiple production references
- Pitfalls: HIGH - well-known issues with documented solutions
- Migration effort estimates: MEDIUM - based on codebase analysis, but actual effort depends on edge cases in print CSS tuning

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days -- stable domain, libraries are mature)
