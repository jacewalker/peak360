---
phase: quick
plan: 260410-pzr
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/layout/NavigationButtons.tsx
  - src/app/assessment/[id]/section/[num]/page.tsx
autonomous: true
must_haves:
  truths:
    - "Clicking Complete on Section 11 saves data, marks assessment completed, and redirects to home"
    - "Next button on non-final sections still navigates normally"
  artifacts:
    - path: "src/components/layout/NavigationButtons.tsx"
      provides: "onComplete prop called when on last section"
    - path: "src/app/assessment/[id]/section/[num]/page.tsx"
      provides: "handleComplete function that saves + updates status + redirects"
  key_links:
    - from: "NavigationButtons.tsx"
      to: "page.tsx"
      via: "onComplete callback prop"
      pattern: "onComplete\\?"
---

<objective>
Fix the Complete button on Section 11 so it saves data, marks the assessment as completed, and redirects to home.

Purpose: Currently clicking Complete does nothing because the navigate('next') handler tries to go to a non-existent next section index. The button needs a dedicated completion handler.
Output: Working Complete button on the final assessment section.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/layout/NavigationButtons.tsx
@src/app/assessment/[id]/section/[num]/page.tsx
@src/types/assessment.ts (for VISIBLE_SECTIONS)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add onComplete prop to NavigationButtons and wire completion handler in page.tsx</name>
  <files>src/components/layout/NavigationButtons.tsx, src/app/assessment/[id]/section/[num]/page.tsx</files>
  <action>
**NavigationButtons.tsx:**
1. Add `onComplete?: () => void` to `NavigationButtonsProps` interface
2. Accept `onComplete` in the destructured props
3. On the "Next/Complete" button (line 87-96), change the `onClick` handler: when `currentSection === VISIBLE_SECTIONS[VISIBLE_SECTIONS.length - 1]` AND `onComplete` is defined, call `onComplete` instead of `onNext`

The button already displays "Complete" text on the last section (line 95). Just change what it calls.

**page.tsx:**
1. Add a `handleComplete` callback (similar to `handleSaveExit` but also marks status):
   ```
   const handleComplete = useCallback(async () => {
     await saveSection(true);
     await fetch(`/api/assessments/${id}`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ status: 'completed' }),
     });
     router.push('/');
   }, [id, router, saveSection]);
   ```
2. Pass `onComplete={handleComplete}` to both NavigationButtons instances (the Section 11 block at line 183 and the general block at line 208). This ensures the Complete button works regardless of which render path is active.

Note: `saveSection(true)` checks completion of the current section. The status PUT marks the overall assessment as completed. The existing PUT /api/assessments/[id] endpoint already accepts `{ status: 'completed' }` and spreads it into the update.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Clicking "Complete" on Section 11 saves section data with completion check, PUTs status: completed to the assessment API, and redirects to /. The Next button on all other sections continues to navigate normally.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. Manual test: Navigate to Section 11 of any assessment, click Complete - should redirect to home and assessment status should show as completed
</verification>

<success_criteria>
- Complete button on Section 11 triggers save + status update + redirect (not a no-op)
- Next button on sections 1-9 still navigates to the next section
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260410-pzr-the-complete-button-on-the-final-page-of/260410-pzr-SUMMARY.md`
</output>
