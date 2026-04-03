---
phase: quick
plan: 260403-pze
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/sections/Section11.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Insights & Recommendations heading always starts at the top of a new page in exported PDF"
    - "Existing page-break prevention for other elements still works correctly"
  artifacts:
    - path: "src/components/sections/Section11.tsx"
      provides: "Forced page break before insights section in PDF export"
      contains: "data-pdf-page-break"
  key_links:
    - from: "JSX data-pdf-page-break attribute"
      to: "exportPdf spacer insertion"
      via: "querySelectorAll('[data-pdf-page-break=\"before\"]')"
      pattern: "data-pdf-page-break"
---

<objective>
Force the "Insights & Recommendations" section onto a new page in the exported PDF.

Purpose: The insights section currently lands mid-page, often splitting awkwardly across page boundaries. It should always start cleanly at the top of a new page for better readability.
Output: Modified Section11.tsx with forced page break before insights heading.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/sections/Section11.tsx

Key code locations:
- Line 144: `exportPdf` function start
- Lines 169-207: Spacer insertion loop (breakable elements scanned, spacers inserted before page-cut elements)
- Line 741: Insights section wrapper div (`<div className="report-section report-insights mt-8 print:mt-6">`)
- Line 742: `<SectionHeading>Insights & Recommendations</SectionHeading>`

The spacer algorithm:
1. Selects all elements matching `breakableSelectors` (`.report-marker-row`, `.report-insight-card`, `.report-category`, `.report-section`, `[data-pdf-break]`)
2. Sorts by vertical position
3. For each element: if it crosses a page boundary, inserts a spacer div before it to push it to the next page
4. `pageStepPx = 297 * pxPerMm` is the exact A4 page height in DOM pixels
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add forced page break before Insights section in PDF export</name>
  <files>src/components/sections/Section11.tsx</files>
  <action>
Two changes to Section11.tsx:

**Change 1 — Mark the insights section wrapper (around line 741):**

On the `<div className="report-section report-insights mt-8 print:mt-6">` element, add the attribute `data-pdf-page-break="before"`:

```tsx
<div data-pdf-page-break="before" className="report-section report-insights mt-8 print:mt-6">
```

**Change 2 — Add forced page-break logic in `exportPdf` (insert BEFORE the existing `for (const item of sorted)` loop, after the `sorted` array is built around line 186):**

Insert a new block that handles forced page breaks:

```typescript
// ── Forced page breaks ────────────────────────────────────────────────
const forceBreaks = container.querySelectorAll<HTMLElement>('[data-pdf-page-break="before"]');
for (const el of forceBreaks) {
  const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
  // Find which page this element currently starts on
  const pageIndex = Math.floor(elTop / pageStepPx);
  // Target: top of the NEXT page (with breathing room)
  const nextPageTop = (pageIndex + 1) * pageStepPx + PAGE_MARGIN_PX;
  const gap = nextPageTop - elTop;
  // Only insert if the element isn't already at a page boundary (within margin tolerance)
  const distFromPageStart = elTop - pageIndex * pageStepPx;
  if (distFromPageStart > PAGE_MARGIN_PX && gap > 0 && gap < pageStepPx) {
    const spacer = document.createElement('div');
    spacer.style.height = `${gap}px`;
    spacer.dataset.pdfSpacer = 'true';
    el.parentNode?.insertBefore(spacer, el);
    spacers.push(spacer);
    void container.offsetHeight; // synchronous reflow
  }
}
```

The key logic: regardless of whether the element crosses a page boundary, if it is not already near the top of a page, push it to the next page. This differs from the existing loop which only acts on elements that straddle a page cut. The `distFromPageStart > PAGE_MARGIN_PX` guard prevents double-spacing if the element is already at a page top.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit src/components/sections/Section11.tsx 2>&1 | head -20</automated>
  </verify>
  <done>
    - The insights section div has `data-pdf-page-break="before"` attribute
    - The `exportPdf` function contains a forced page-break block that runs before the standard spacer loop
    - Elements with `data-pdf-page-break="before"` are pushed to the start of the next page
    - TypeScript compiles without errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Forced page break pushing "Insights & Recommendations" to start on a new PDF page</what-built>
  <how-to-verify>
    1. Run `npm run dev` and navigate to an assessment with Section 11 data
    2. Click "Export PDF" on the Section 11 report
    3. Open the generated PDF and scroll to the "Insights & Recommendations" section
    4. Verify: The heading starts at the top of a new page (not mid-page)
    5. Verify: All other sections before insights still render correctly without extra blank space
    6. Verify: The insight cards themselves still avoid page-cut splits (existing spacer logic still works)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles: `npx tsc --noEmit`
- `data-pdf-page-break="before"` attribute present on insights wrapper div
- Forced page-break logic runs before the standard breakable-element spacer loop
- Spacer cleanup (`spacers.forEach(s => s.remove())`) still removes all spacers including forced ones
</verification>

<success_criteria>
The "Insights & Recommendations" section heading always appears at the top of a new page in the exported PDF, with no content from previous sections sharing that page.
</success_criteria>

<output>
After completion, create `.planning/quick/260403-pze-put-insights-recommendations-section-in-/260403-pze-SUMMARY.md`
</output>
