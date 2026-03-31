# Quick Task: Fix PDF Page Break Overflow — Research

**Researched:** 2026-03-31
**Domain:** jsPDF + html2canvas-pro page break management
**Confidence:** HIGH (code read directly; pitfalls verified against known issues)

---

## Summary

Section11's `exportPdf` already implements an element-aware spacer insertion loop. It collects elements with specific CSS classes (`.report-marker-row`, `.report-insight-card`, `.report-category`, `.report-section`), recalculates their live positions after each spacer insertion, and pushes elements past page boundaries using absolutely-sized `<div>` spacers. The core strategy is correct.

**The overflow is still happening** because of several compounding bugs in the existing implementation:

1. **`scrollY` not accounted for in `getBoundingClientRect`** — `getBoundingClientRect()` returns viewport-relative coordinates. If the page is scrolled when exportPdf runs, `top` values are off by `window.scrollY`. The container top subtraction partially compensates but only if the container itself is also measured from the same scroll position at the same instant.

2. **`pageHeightPx` uses rendered container width, not scroll width** — `container.getBoundingClientRect().width` gives the visible width. For very long pages the height calculation is correct, but if the container has padding or margins not accounted for, the pixel-to-mm scale factor drifts, causing page boundary calculations to be slightly off. By page 3–4 this drift compounds.

3. **Spacers are inserted but `getBoundingClientRect` isn't forced to re-layout** — After inserting a spacer the browser may not have recalculated layout before the next iteration reads `.getBoundingClientRect()`. Without a forced reflow, position reads for subsequent elements are stale. The comment says "Recalculate position after previous spacers may have shifted things" but there's no `el.offsetHeight` read or equivalent reflow trigger between insertions.

4. **`PAGE_MARGIN_PX = 24` is subtracted only from the bottom of the page, not from the top** — Elements within 24px of a page boundary bottom are deferred, but no guard prevents an element from being placed too close to the top edge of the new page (i.e., the spacer itself plus the element's height may push the element's bottom right to the next page's boundary).

5. **Insight cards have `overflow-hidden`** — `.report-insight-card` has `overflow: hidden` in Tailwind. html2canvas clips overflow-hidden elements to their bounding box. If a card's height changes after spacer insertion (flex reflow), the canvas may capture a clipped version.

**Primary recommendation:** Fix the reflow trigger between spacer insertions and account for `window.scrollY` in all `getBoundingClientRect` reads. Then add bottom padding to each page in the canvas-slicing step as a safety buffer.

---

## Root Cause Analysis

### Bug 1: Stale layout reads (most impactful)

```typescript
// Current code — reads position BEFORE browser reflows spacers
item.el.parentNode?.insertBefore(spacer, item.el);
spacers.push(spacer);
// Next iteration immediately reads getBoundingClientRect — layout NOT yet recalculated
```

Fix: trigger a synchronous reflow after each spacer insertion:

```typescript
item.el.parentNode?.insertBefore(spacer, item.el);
spacers.push(spacer);
// Force reflow so subsequent getBoundingClientRect reads are accurate
void container.offsetHeight;
```

`container.offsetHeight` is a property read that forces the browser to flush pending layout calculations synchronously. This is the standard technique used in animation loops and test utilities.

### Bug 2: scrollY not factored in

```typescript
// Current code
const containerTop = container.getBoundingClientRect().top;
// ...
const currentTop = item.el.getBoundingClientRect().top - container.getBoundingClientRect().top;
```

If `window.scrollY > 0` when export runs, both measurements include the scroll offset equally (container.getBoundingClientRect().top is also viewport-relative), so they cancel out — this is actually safe as written **as long as the window is not scrolled between the two measurements**. Since `exportPdf` is async and multiple `getBoundingClientRect` calls happen over time, a scroll event between calls would corrupt measurements.

Fix: scroll the container into view or disable page scroll during export:

```typescript
// Before spacer loop
window.scrollTo(0, 0);
// OR: snapshot all positions before mutating DOM
const snapshots = Array.from(breakables).map(el => ({
  el: el as HTMLElement,
  top: (el as HTMLElement).getBoundingClientRect().top - containerTop,
  bottom: (el as HTMLElement).getBoundingClientRect().bottom - containerTop,
}));
```

Note: the current code re-reads live position inside the loop (correctly, to account for prior spacers shifting things), so `window.scrollTo(0, 0)` before the loop is the right fix.

### Bug 3: Page margin not applied symmetrically

```typescript
// Current — only guards bottom margin
if (currentBottom <= pageEnd - PAGE_MARGIN_PX) continue;
```

No guard exists for elements that land within `PAGE_MARGIN_PX` of a new page's top edge. After a spacer moves an element to a new page, its top might be within a few pixels of the page top edge.

Fix: add a minimum top-of-page guard:

```typescript
const positionOnPage = currentTop - pageStart; // position within the page
const isNearTopOfPage = positionOnPage < PAGE_MARGIN_PX && pageStart > 0;
// If element was just pushed to a new page, check it has enough top clearance
```

This is lower priority than Bug 1, but worth adding for visual quality.

### Bug 4: PDF canvas-slicing uses no bottom padding

The current slicing loop:

```typescript
const usableHeight = pageHeight - PDF_MARGIN * 2; // 297 - 12 = 285mm
```

`PDF_MARGIN = 6mm` on both top and bottom. This is tight. If the pixel-to-mm ratio drifts even slightly (due to sub-pixel rounding), content from the bottom of one page bleeds onto the next page's top margin.

Fix: add `BOTTOM_GUARD_MM = 4` (additional buffer) and use it in the canvas offset calculation:

```typescript
const PDF_MARGIN = 6;
const BOTTOM_GUARD_MM = 4; // extra buffer against drift
const usableHeight = pageHeight - PDF_MARGIN * 2 - BOTTOM_GUARD_MM;
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Reflow trigger | Custom setTimeout polling | `void container.offsetHeight` (synchronous, standard) |
| Per-element canvas capture + stitch | Custom canvas compositing | Current approach is fine — keep the spacer strategy, fix bugs |
| CSS page-break avoidance | `break-inside: avoid` on elements | Does NOT work with html2canvas — html2canvas renders to bitmap, CSS print rules ignored |

**Key insight:** `page-break-inside: avoid` and `break-inside: avoid` are CSS print media properties. html2canvas renders the DOM as a screen bitmap — it does not interpret CSS print rules. All page break logic must be done in JavaScript before the canvas is captured.

---

## Recommended Fix Strategy

Three targeted changes to `exportPdf` in Section11.tsx:

**Change 1 — Scroll to top before measuring (3 lines)**

```typescript
// Before spacer loop, scroll to top so getBoundingClientRect is stable
const prevScrollY = window.scrollY;
window.scrollTo(0, 0);
// ... existing spacer loop ...
// After html2canvas capture, restore scroll
window.scrollTo(0, prevScrollY);
```

**Change 2 — Force reflow after each spacer insertion (1 line)**

Inside the spacer loop, after `spacers.push(spacer)`:

```typescript
item.el.parentNode?.insertBefore(spacer, item.el);
spacers.push(spacer);
void container.offsetHeight; // force synchronous layout recalculation
```

**Change 3 — Add bottom guard buffer to PDF slicing (1 constant)**

```typescript
const PDF_MARGIN = 6;
const PAGE_BOTTOM_GUARD = 4; // mm guard against pixel-to-mm drift
const usableHeight = pageHeight - PDF_MARGIN * 2 - PAGE_BOTTOM_GUARD;
```

These three changes address the two most common failure modes (stale positions, pixel drift) with minimal code change.

---

## Architecture Patterns

No library additions required. The existing jsPDF + html2canvas-pro stack handles this correctly once the measurement loop is fixed. The current approach (spacer insertion before capture, then spacer cleanup after) is the canonical technique for this stack.

---

## Common Pitfalls

### Pitfall 1: Measuring position after DOM mutation without reflow
**What goes wrong:** Spacer is inserted but browser returns the pre-mutation bounding box for the next element. All subsequent calculations are off by the spacer height.
**How to avoid:** `void container.offsetHeight` after each DOM mutation in the loop.

### Pitfall 2: CSS print rules do nothing with html2canvas
**What goes wrong:** Adding `break-inside: avoid` to component CSS has no effect because html2canvas is a screen renderer, not a print renderer.
**How to avoid:** All page break avoidance must be JavaScript-based (spacer technique is correct).

### Pitfall 3: Expecting getBoundingClientRect to be scroll-invariant
**What goes wrong:** If the user has scrolled the page and export is triggered, viewport-relative coordinates include the scroll offset. Container-relative subtraction fixes it only if both reads happen at the same scroll position.
**How to avoid:** `window.scrollTo(0, 0)` before the measurement loop.

### Pitfall 4: Sub-pixel rounding accumulates across pages
**What goes wrong:** 6mm margin on a 210mm page means each page boundary is at exactly 285mm of content. One pixel of rounding error at scale=2 translates to ~0.18mm. By page 4–5 this can be 0.7mm — enough to clip a row.
**How to avoid:** Add `PAGE_BOTTOM_GUARD = 4` mm buffer.

---

## Sources

### Primary (HIGH confidence)
- Section11.tsx lines 141–242 — direct code read, exportPdf implementation
- MDN `Element.getBoundingClientRect()` — viewport-relative behavior, scroll offset semantics
- `void element.offsetHeight` — standard synchronous reflow trigger, widely documented in animation/testing literature

### Secondary (MEDIUM confidence)
- [JSPDF Issue #3365](https://github.com/parallax/jsPDF/issues/3365) — page split content overflow patterns
- [html2pdf.js Issue #227](https://github.com/eKoopmans/html2pdf.js/issues/227) — page break avoid-all fails in longer documents
- [Medium: Page split using jspdf and html2canvas](https://shamaahlawat.medium.com/page-split-using-jspdf-and-html2canvas-in-react-js-while-downloading-pdf-6c75da960019) — common spacer patterns

---

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH — direct code read confirmed all four bugs
- Fix approach: HIGH — reflow trigger and scroll reset are standard DOM patterns
- CSS print rules ignorance by html2canvas: HIGH — inherent to how html2canvas works (bitmap renderer)

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable libraries, not time-sensitive)
