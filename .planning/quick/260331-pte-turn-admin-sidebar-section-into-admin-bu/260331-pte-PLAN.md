---
phase: quick
plan: 260331-pte
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/layout/Sidebar.tsx
  - src/components/layout/AdminPanel.tsx
autonomous: true
must_haves:
  truths:
    - "Sidebar shows a single Admin button instead of listing individual admin links"
    - "Clicking Admin button opens an overlay panel with a grid of admin section cards"
    - "Normative Ranges card in the panel navigates to /admin/normative"
    - "Panel closes when clicking outside, pressing Escape, or navigating"
    - "Admin button shows active state when on any /admin/* route"
  artifacts:
    - path: "src/components/layout/AdminPanel.tsx"
      provides: "Admin panel overlay with card grid"
    - path: "src/components/layout/Sidebar.tsx"
      provides: "Updated sidebar with Admin button triggering panel"
  key_links:
    - from: "Sidebar.tsx Admin button"
      to: "AdminPanel.tsx"
      via: "useState toggle, rendered inline"
    - from: "AdminPanel.tsx Normative Ranges card"
      to: "/admin/normative"
      via: "Next.js Link"
---

<objective>
Replace the admin section in the sidebar (currently a list of admin nav links) with a single "Admin" button that opens an overlay panel containing a grid of admin section cards. The first card is "Normative Ranges" linking to /admin/normative. This pattern supports adding more admin sections in the future.

Purpose: Clean up sidebar by collapsing admin items into a single entry point; provide a scalable admin navigation pattern.
Output: Updated Sidebar.tsx + new AdminPanel.tsx component.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/layout/Sidebar.tsx
@src/app/admin/normative/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AdminPanel overlay component</name>
  <files>src/components/layout/AdminPanel.tsx</files>
  <action>
Create a new client component AdminPanel.tsx that renders a popover/overlay panel anchored near the Admin button in the sidebar footer area.

Structure:
- Props: `{ open: boolean; onClose: () => void }`
- Overlay backdrop (semi-transparent) that calls onClose on click
- Panel container: fixed/absolute positioned, dark bg matching sidebar theme (bg-navy-dark or similar), rounded-xl, shadow-2xl, min-width ~280px
- Title: "Admin" in white, small text
- Grid of admin section cards (2 columns, gap-3)
- Each card: Link component wrapping a styled div with icon + label, hover effect (bg-white/10), rounded-lg, padding
- First card: "Normative Ranges" with the adjustments/sliders SVG icon (reuse from current NAV_ITEMS), links to /admin/normative
- Close on Escape key (useEffect with keydown listener)
- Close on navigation (usePathname + useEffect watching pathname changes)
- Use `useRouter` from next/navigation for programmatic close if needed

Card data structure (easy to extend):
```typescript
const ADMIN_SECTIONS = [
  {
    label: 'Normative Ranges',
    href: '/admin/normative',
    description: 'Manage rating thresholds',
    icon: /* sliders SVG */,
  },
];
```

Styling: Match the navy/gold theme. Cards should have subtle border (border-white/10), icon in white/40, label in white/90. On hover: bg-white/8 with smooth transition.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit src/components/layout/AdminPanel.tsx 2>&1 | head -20</automated>
  </verify>
  <done>AdminPanel.tsx exists, exports a typed React component, compiles without errors</done>
</task>

<task type="auto">
  <name>Task 2: Replace sidebar admin section with Admin button + panel integration</name>
  <files>src/components/layout/Sidebar.tsx</files>
  <action>
Modify Sidebar.tsx to replace the current admin links section with a single Admin button that toggles the AdminPanel.

Changes:
1. Import AdminPanel from './AdminPanel'
2. Add `const [adminOpen, setAdminOpen] = useState(false)` state
3. Remove the NAV_ITEMS entry for Normative Ranges (isAdmin: true item) -- admin items now live in AdminPanel's ADMIN_SECTIONS
4. Remove the entire admin section block in the Footer area (the div with "Admin" header that filters isAdmin items, lines ~134-162)
5. Replace with a single button styled consistently with nav items:
   - Icon: a gear/cog SVG or a grid SVG (admin-appropriate)
   - Label: "Admin"
   - Active state: highlight when pathname starts with '/admin' (use existing isActive pattern or direct check)
   - onClick: `setAdminOpen(true)`
   - Same styling pattern as nav links: `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150`
   - Active: `bg-gold/15 text-gold` when on /admin/* routes
   - Inactive: `text-white/50 hover:text-white/90 hover:bg-white/5`
6. Render `<AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />` in the component (inside the sidebar content, after the button)
7. Close admin panel on pathname change (already handled in AdminPanel, but also reset adminOpen state via useEffect on pathname -- reuse existing pathname effect or add to it)

Keep the logout button and its separator unchanged.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>Sidebar renders Admin button in footer area; clicking it opens the AdminPanel overlay; Normative Ranges card navigates to /admin/normative; panel closes on outside click, Escape, or navigation; build succeeds</done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- Sidebar shows: Dashboard, Assessments, Clients in main nav; Admin button in footer; Logout below
- Clicking Admin button opens overlay panel with Normative Ranges card
- Clicking Normative Ranges navigates to /admin/normative
- Panel closes on Escape, backdrop click, or navigation
- Admin button shows gold active state when on /admin/* routes
</verification>

<success_criteria>
Admin section in sidebar replaced with a single button that opens a card-grid panel. Normative Ranges accessible from the panel. Pattern extensible for future admin sections.
</success_criteria>

<output>
After completion, create `.planning/quick/260331-pte-turn-admin-sidebar-section-into-admin-bu/260331-pte-SUMMARY.md`
</output>
