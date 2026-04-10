# Phase 5: Migrate PDF Generation to @react-pdf/renderer - Research

**Researched:** 2026-04-10
**Domain:** PDF generation migration from html2canvas+jsPDF to @react-pdf/renderer
**Confidence:** HIGH

## Summary

The current PDF export in Section 11 uses html2canvas-pro + jsPDF, a rasterize-and-slice approach that produces bitmap PDFs with unreliable page breaks, non-selectable text, and 2-5MB file sizes. The user has chosen @react-pdf/renderer as the replacement framework -- a React-based PDF renderer with its own layout engine (built on PDFKit) that produces native vector PDFs with built-in pagination awareness.

This is a full rewrite of the report rendering layer. The existing Section 11 component (~848 lines) renders the report as HTML with Tailwind CSS classes. The new approach requires rebuilding all visual output using @react-pdf/renderer primitives (`<Document>`, `<Page>`, `<View>`, `<Text>`, `<Svg>`). The data loading logic, normative rating calculations, and insight generation remain completely unchanged -- only the rendering layer changes.

The migration involves rebuilding 6 report sub-components (RangeBar, ReferralFlag, Disclaimer, TierPill, SectionHeading, ContextCell) plus the main report layout (~500 lines of JSX) into @react-pdf primitives. The RangeBar component is the most complex piece: it must be reimplemented using SVG primitives (`<Rect>`, `<Circle>`, `<G>`) since the current implementation uses Tailwind flexbox with percentage widths and absolute positioning.

**Primary recommendation:** Create a parallel `src/lib/pdf/` directory containing @react-pdf/renderer document components. Build a server-side API route `/api/assessments/[id]/pdf` that assembles the PDF using the data loading logic already in Section 11. Keep the existing html2canvas export functional until the new renderer is validated, then remove it.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.4.0 | PDF document generation from React components | User-chosen; native pagination, vector text, small files |
| @ag-media/react-pdf-table | 2.0.3 | Declarative table layout for @react-pdf | Avoids hand-rolling flexbox tables; provides TR/TD/TH semantics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/renderer (Font module) | included | Custom font registration | Register project fonts for consistent typography |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ag-media/react-pdf-table | Manual flexbox Views | Tables lib saves ~100 lines of boilerplate but adds a dependency; use it for the marker results tables |
| SVG primitives for RangeBar | Canvas component | SVG is more declarative and easier to maintain; Canvas uses imperative pdfkit API |

**Installation:**
```bash
npm install @react-pdf/renderer @ag-media/react-pdf-table
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    pdf/
      Peak360Report.tsx         # Root <Document> component
      components/
        ReportHeader.tsx        # Cover/header section
        ReadinessSection.tsx    # Daily readiness grid
        MedicalSection.tsx      # Medical screening summary
        ConsentStatus.tsx       # Consent status bar
        TierSummary.tsx         # 5-tier overview cards
        MarkerTable.tsx         # Category-grouped marker results
        MarkerRow.tsx           # Single marker row with RangeBar
        RangeBarPdf.tsx         # SVG-based range bar for PDF
        TierPillPdf.tsx         # Colored tier badge
        ReferralFlagPdf.tsx     # GP referral / monitor flag
        DisclaimerPdf.tsx       # Medical disclaimer block
        InsightsSection.tsx     # Insights & recommendations
        ReportFooter.tsx        # Footer with logo + date
      styles.ts                 # StyleSheet.create() with shared styles
      fonts.ts                  # Font.register() calls
      colors.ts                 # Color constants (navy, gold, tier colors)
  app/
    api/
      assessments/
        [id]/
          pdf/
            route.ts            # GET handler: load data, render PDF, stream response
```

### Pattern 1: Server-Side PDF Generation via API Route
**What:** The API route loads assessment data from the database (same queries as Section 11), passes it as props to the `<Peak360Report>` document component, renders to a buffer using `renderToBuffer()`, and streams it as a response.
**When to use:** Always -- PDF generation should be server-side to avoid shipping @react-pdf/renderer to the client bundle.
**Example:**
```typescript
// src/app/api/assessments/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { Peak360Report } from '@/lib/pdf/Peak360Report';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Load all section data (reuse existing data-loading logic)
  const reportData = await loadReportData(id);
  
  const buffer = await renderToBuffer(
    <Peak360Report data={reportData} />
  );
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Peak360_Report_${reportData.clientName || id}.pdf"`,
    },
  });
}
```

### Pattern 2: Shared Data Loading Function
**What:** Extract the data loading logic from Section 11's useEffect into a shared function usable by both the client component (for on-screen display) and the API route (for PDF generation).
**When to use:** To avoid duplicating the 9 section fetches + normative snapshot + marker evaluation + insight generation.
**Example:**
```typescript
// src/lib/report/load-report-data.ts
// Server-side version that queries the database directly (no fetch calls)
export async function loadReportData(assessmentId: string): Promise<ReportData> {
  // Query assessment_sections table directly via Drizzle
  // Evaluate markers against normative data
  // Generate insights
  // Return typed ReportData object
}
```

### Pattern 3: StyleSheet with Theme Constants
**What:** Centralize all PDF styles in a single StyleSheet.create() call with named constants for the project color scheme.
**When to use:** All PDF components import from this shared stylesheet.
**Example:**
```typescript
// src/lib/pdf/styles.ts
import { StyleSheet } from '@react-pdf/renderer';

export const COLORS = {
  navy: '#1a365d',
  gold: '#F5A623',
  tierElite: '#10b981',
  tierGreat: '#3b82f6',
  tierNormal: '#6b7280',
  tierCautious: '#f59e0b',
  tierPoor: '#ef4444',
  textPrimary: '#1a202c',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 25,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  // ... etc
});
```

### Pattern 4: RangeBar as SVG
**What:** Reimplement the 5-segment range bar using react-pdf's SVG primitives.
**When to use:** For every marker row that has normative ranges.
**Example:**
```typescript
// src/lib/pdf/components/RangeBarPdf.tsx
import { Svg, Rect, Circle, G } from '@react-pdf/renderer';

const TIER_COLORS = {
  poor: '#ef4444',
  cautious: '#f59e0b',
  normal: '#9ca3af',
  great: '#3b82f6',
  elite: '#10b981',
};

export function RangeBarPdf({ value, standards }: RangeBarPdfProps) {
  const barWidth = 200;
  const barHeight = 8;
  // ... compute segment widths and needle position (reuse existing logic)
  
  return (
    <Svg width={barWidth} height={barHeight + 4} viewBox={`0 0 ${barWidth} ${barHeight + 4}`}>
      <G>
        {segments.map((seg, i) => (
          <Rect
            key={i}
            x={seg.x}
            y={2}
            width={seg.width}
            height={barHeight}
            fill={TIER_COLORS[seg.tier]}
            rx={i === 0 ? 4 : i === 4 ? 4 : 0}
          />
        ))}
      </G>
      {/* Needle indicator */}
      <Circle cx={needleX} cy={barHeight / 2 + 2} r={4} fill="#1a365d" />
    </Svg>
  );
}
```

### Anti-Patterns to Avoid
- **Trying to use Tailwind classes in react-pdf:** react-pdf has its own styling system. No className prop exists. All styles must use StyleSheet.create() or inline style objects.
- **Rendering react-pdf components in the browser DOM:** react-pdf Document/Page/View are NOT HTML elements. They cannot be rendered in a React DOM tree. The PDF generation must happen via `renderToBuffer()` or `renderToStream()` on the server, or `pdf().toBlob()` on the client.
- **Putting @react-pdf/renderer in the client bundle:** Import it only in server-side code (API routes, server components). It adds ~800KB to the bundle.
- **Using CSS Grid:** react-pdf only supports flexbox layout. All grid layouts must be converted to nested flexDirection: 'row' / 'column' Views.
- **Assuming gradient support:** react-pdf does not support CSS linear-gradient in backgroundColor. For the header gradient, use an SVG LinearGradient overlay or a solid dark color.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table layout | Nested flexbox Views for every cell | @ag-media/react-pdf-table (TR/TD/TH) | Handles column alignment, borders, and cell padding consistently |
| Page break management | Manual page-fit calculations | react-pdf's built-in wrapping engine (`wrap={false}`, `break`, `minPresenceAhead`) | The layout engine knows page dimensions and handles overflow automatically |
| Font management | Inline fontFamily strings everywhere | Font.register() + shared constants | Centralized font config, single registration point |
| Color theme | Hex strings scattered across components | Shared COLORS constant object | Same pattern as existing TIER_DOT / TIER_ROW_BG in Section 11 |

**Key insight:** The entire spacer algorithm (lines 160-226 in Section11.tsx) is replaced by react-pdf's built-in wrapping engine. Zero lines of page-break code needed.

## Common Pitfalls

### Pitfall 1: Header Gradient Cannot Be CSS
**What goes wrong:** Attempting `background: 'linear-gradient(...)'` in a View style produces no output.
**Why it happens:** react-pdf does not support CSS gradient syntax in style properties.
**How to avoid:** Use a solid dark background color (#1a365d) for the header, or overlay an SVG LinearGradient element for a gradient effect.
**Warning signs:** White/transparent header area in PDF output.

### Pitfall 2: Text Must Be Inside Text Components
**What goes wrong:** Placing raw strings inside View components causes runtime errors.
**Why it happens:** react-pdf requires all text content to be wrapped in `<Text>` elements, unlike HTML where divs can contain text nodes.
**How to avoid:** Every string literal must be inside a `<Text>` component. Use `<Text>` for spans, labels, values -- everything.
**Warning signs:** "Text string must be rendered within a <Text> component" error.

### Pitfall 3: Image Path Resolution on Server
**What goes wrong:** `<Image src="/logo.png" />` fails in the API route because it's a relative web path, not a filesystem path.
**Why it happens:** react-pdf on the server needs either an absolute URL or a filesystem path. The `/logo.png` path is relative to the web server, not the filesystem.
**How to avoid:** Use `path.join(process.cwd(), 'public', 'logo.png')` for the image source in the server-side PDF component. Or use a base64-encoded version.
**Warning signs:** Missing logo in PDF, or "ENOENT: no such file or directory" error.

### Pitfall 4: wrap={false} on Tall Content
**What goes wrong:** Setting `wrap={false}` on a View taller than one page causes it to be clipped or overflow.
**Why it happens:** `wrap={false}` means "don't split this across pages." If the content exceeds page height, react-pdf cannot render it.
**How to avoid:** Only use `wrap={false}` on elements guaranteed to fit on a single page (marker rows, insight cards, tier summary cards). For category groups with many markers, allow wrapping but use `wrap={false}` on individual rows.
**Warning signs:** Content disappearing from the PDF.

### Pitfall 5: Round-Trip Font Issues
**What goes wrong:** Text appears in Courier or with wrong weights.
**Why it happens:** react-pdf only has Helvetica, Times-Roman, and Courier built in. Bold/italic variants must be explicitly registered if using custom fonts.
**How to avoid:** For this project, use the built-in Helvetica family (regular, bold, oblique). It closely matches the sans-serif fonts used in the web report. If a closer match to Inter/system-ui is desired, register a TTF font file.
**Warning signs:** All text appears in the same weight, or falls back to Courier.

### Pitfall 6: renderToBuffer in Next.js API Route
**What goes wrong:** `renderToBuffer` may fail if react-pdf tries to use browser APIs.
**Why it happens:** Some versions of @react-pdf/renderer have browser-specific code paths that fail in Node.js server environments.
**How to avoid:** Ensure the import is from `@react-pdf/renderer` (not `@react-pdf/renderer/dom`). Test the API route early -- don't wait until the full report is built. Current v4.4.0 works well server-side.
**Warning signs:** "document is not defined" or "window is not defined" errors.

## Code Examples

### Complete Marker Row with RangeBar (PDF version)
```typescript
// Source: Based on react-pdf.org/components + react-pdf.org/svg
import { View, Text, Svg, Rect, Circle } from '@react-pdf/renderer';

function MarkerRowPdf({ marker }: { marker: ReportMarker }) {
  const tierBg = marker.tier ? TIER_ROW_BG_PDF[marker.tier] : '#f9fafb';
  const tierBorder = marker.tier ? TIER_BORDER_PDF[marker.tier] : '#e5e7eb';
  
  return (
    <View
      wrap={false}
      style={{
        flexDirection: 'column',
        padding: '6 8 6 12',
        backgroundColor: tierBg,
        borderLeftWidth: 3,
        borderLeftColor: tierBorder,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica', color: '#1a202c' }}>
          {marker.label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {marker.value !== null ? (
            <>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a202c' }}>
                {marker.value}
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica', color: '#64748b' }}>
                  {' '}{marker.unit}
                </Text>
              </Text>
              {marker.tier && <TierPillPdf tier={marker.tier} />}
            </>
          ) : (
            <Text style={{ fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }}>Not recorded</Text>
          )}
        </View>
      </View>
      {marker.hasNorms && marker.value !== null && marker.resolvedStandards && (
        <RangeBarPdf value={marker.value} standards={marker.resolvedStandards} />
      )}
    </View>
  );
}
```

### Client-Side Export Button (fetches from API route)
```typescript
const exportPdf = useCallback(async () => {
  setExporting(true);
  try {
    const response = await fetch(`/api/assessments/${assessmentId}/pdf`);
    if (!response.ok) throw new Error('PDF generation failed');
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

### Page Layout with Headers/Footers
```typescript
// Source: react-pdf.org/advanced (fixed prop)
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';

function Peak360Report({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed footer on every page */}
        <View fixed style={{
          position: 'absolute',
          bottom: 10,
          left: 25,
          right: 25,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopWidth: 0.5,
          borderTopColor: '#e2e8f0',
          paddingTop: 4,
        }}>
          <Text style={{ fontSize: 7, color: '#94a3b8' }}>
            Generated by Peak360 Longevity Program
          </Text>
          <Text
            style={{ fontSize: 7, color: '#94a3b8' }}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
        
        {/* Report content */}
        <ReportHeader data={data} />
        <DisclaimerPdf />
        <ReadinessSection data={data.readiness} />
        {/* ... etc ... */}
        
        {/* Force insights onto new page */}
        <View break>
          <InsightsSection insights={data.insights} />
        </View>
      </Page>
    </Document>
  );
}
```

## Component Migration Mapping

| Current Component | Location | PDF Equivalent | Complexity | Notes |
|-------------------|----------|---------------|------------|-------|
| Section11 (report body) | Section11.tsx:453-847 | Peak360Report.tsx | HIGH | ~500 lines of JSX to rebuild; split into sub-components |
| Section11 (data loading) | Section11.tsx:270-375 | load-report-data.ts | LOW | Extract to shared function; convert client fetches to direct DB queries |
| Section11 (exportPdf) | Section11.tsx:144-266 | API route + simple fetch | LOW | Delete entire spacer algorithm; replace with fetch-and-download |
| RangeBar | report/RangeBar.tsx | RangeBarPdf.tsx | MEDIUM | Rebuild with SVG Rect/Circle; reuse computeSegmentWidths() math |
| TierPill | Section11.tsx:78-91 | TierPillPdf.tsx | LOW | View + Text with backgroundColor |
| SectionHeading | Section11.tsx:93-100 | Inline in PDF components | LOW | View with gold accent bar + bold text |
| ContextCell | Section11.tsx:102-110 | Inline in ReadinessSection | LOW | View + two Text elements |
| ReferralFlag | report/ReferralFlag.tsx | ReferralFlagPdf.tsx | LOW | View with colored border + text |
| Disclaimer | report/Disclaimer.tsx | DisclaimerPdf.tsx | LOW | View with border + text block |
| Report header (gradient) | Section11.tsx:496-535 | ReportHeader.tsx | MEDIUM | Cannot use CSS gradient; use solid navy or SVG gradient |
| Tier summary cards | Section11.tsx:654-687 | TierSummary.tsx | MEDIUM | 5-card grid becomes flexDirection: 'row' with fixed widths |

## Reusable Code (No Changes Needed)

These modules are consumed by the PDF pipeline but require zero modifications:

| Module | Path | Why Reusable |
|--------|------|--------------|
| REPORT_MARKERS | src/lib/report-markers.ts | Data definition only, no UI |
| getPeak360Rating | src/lib/normative/ratings.ts | Pure function, no React dependency |
| getStandards / getStandardsFromSnapshot | src/lib/normative/ratings.ts | Pure function |
| generatePeak360Insights | src/lib/normative/insights.ts | Pure function |
| computeSegmentWidths (from RangeBar) | src/components/report/RangeBar.tsx | Pure math function; extract and share |
| Normative types | src/types/normative.ts | TypeScript interfaces only |
| TIER_LABELS, TIER_COLORS | src/types/normative.ts | Constants only |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas + jsPDF (rasterize-and-slice) | @react-pdf/renderer (native PDF layout) | 2022+ (react-pdf v3+) | Vector text, native pagination, 10x smaller files |
| Client-side PDF generation | Server-side via API route | 2023+ | Keeps bundle small, consistent output, no browser dependency |
| Manual page break spacers | Built-in wrapping engine | N/A (react-pdf has always had this) | Zero page-break code; the framework handles it |

**Deprecated/outdated:**
- html2canvas-pro + jsPDF: The current approach. Will be removed after migration is validated.
- Canvas-based range bars: Replaced by SVG primitives in the PDF renderer.

## Open Questions

1. **Font choice: Helvetica vs custom font**
   - What we know: react-pdf ships with Helvetica (regular, bold, oblique). The web report uses system sans-serif fonts.
   - What's unclear: Whether the visual difference between Helvetica and the web version matters to the user.
   - Recommendation: Start with built-in Helvetica. It looks professional and avoids font registration complexity. Add a custom font later if desired.

2. **Header gradient**
   - What we know: react-pdf does not support CSS linear-gradient. The current report header uses `bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986]`.
   - What's unclear: Whether a solid navy background is acceptable or if the gradient is important.
   - Recommendation: Use solid `#1a365d` navy background. If gradient is needed, add an SVG LinearGradient overlay.

3. **Keep html2canvas export during migration?**
   - What we know: The existing export works (with known page-break issues).
   - What's unclear: Whether to maintain both export paths or replace outright.
   - Recommendation: Keep the existing export button working throughout development. Add the new export as a second button initially ("Export PDF (New)"), then swap and remove the old one once validated.

4. **Logo in PDF**
   - What we know: `/public/logo.png` is 128KB. react-pdf Image accepts filesystem paths or buffers.
   - Recommendation: Use `path.join(process.cwd(), 'public', 'logo.png')` in the server-side component.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @react-pdf/renderer | PDF generation | Will install | 4.4.0 | -- |
| @ag-media/react-pdf-table | Table layout | Will install | 2.0.3 | Manual flexbox |
| Node.js | API route runtime | YES | 20+ | -- |
| React 19 | Peer dependency | YES | 19.2.3 | -- |

**Missing dependencies with no fallback:**
- None after npm install.

**Missing dependencies with fallback:**
- @ag-media/react-pdf-table: Could build tables manually with flexbox Views, but the library saves significant effort.

## Sources

### Primary (HIGH confidence)
- [react-pdf.org/components](https://react-pdf.org/components) - Component API (Document, Page, View, Text, Image, Canvas)
- [react-pdf.org/advanced](https://react-pdf.org/advanced) - Page breaks: wrap, break, fixed, minPresenceAhead, orphans/widows
- [react-pdf.org/svg](https://react-pdf.org/svg) - SVG primitives: Rect, Circle, Line, Path, G, Defs, LinearGradient
- [react-pdf.org/styling](https://react-pdf.org/styling) - Supported CSS: flexbox, borders, colors, positioning, transforms
- [react-pdf.org/fonts](https://react-pdf.org/fonts) - Font registration, built-in fonts (Helvetica, Times, Courier)
- npm registry - @react-pdf/renderer 4.4.0, @ag-media/react-pdf-table 2.0.3
- Codebase analysis - Section11.tsx (848 lines), RangeBar.tsx (117 lines), report-markers.ts (133 lines)

### Secondary (MEDIUM confidence)
- [@ag-media/react-pdf-table GitHub](https://github.com/ag-media/react-pdf-table) - Table component API (TR, TD, TH)
- [npm @react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer) - Version 4.4.0 peerDependencies confirm React 19 support

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @react-pdf/renderer v4.4.0 confirmed React 19 compatible, well-documented API, user-chosen
- Architecture: HIGH - Server-side renderToBuffer pattern is documented by react-pdf; API route pattern is standard Next.js
- Component migration mapping: HIGH - Based on direct line-by-line analysis of existing Section11.tsx
- Pitfalls: HIGH - Known issues documented in react-pdf official docs and confirmed via codebase analysis
- RangeBar SVG rewrite: MEDIUM - SVG primitives are documented but the specific segment+needle implementation needs testing

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days -- stable domain, react-pdf releases are incremental)
