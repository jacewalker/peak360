---
name: preview-report
description: Build the app and open Section 11 report preview in browser
---

# Preview Report

Build and open the Section 11 (Complete Longevity Analysis) report in the browser for visual review.

## Steps

### Step 1: Check for a running dev server

Check if the dev server is already running on port 3000:
```bash
lsof -i :3000 -t
```

### Step 2: Start dev server if needed

If no server is running, start one in the background:
```bash
npm run dev
```

Wait a few seconds for Turbopack to compile.

### Step 3: Find an assessment to preview

Query the SQLite database to find an existing assessment with data:
```bash
npx drizzle-kit studio
```

Or check via the API — look for assessments that have section data filled in. If no assessments exist, tell the user they need to create one first.

### Step 4: Open the report

Open the Section 11 page in the default browser:
```bash
open "http://localhost:3000/assessment/{assessmentId}/section/11"
```

### Step 5: Report what's showing

Tell the user:
- Which assessment is being previewed (client name if available)
- The URL to access it
- Remind them they can export to PDF from the report page
- If the report looks empty, suggest which sections need data filled in (sections 5-9 provide the marker values)
