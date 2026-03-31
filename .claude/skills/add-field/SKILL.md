---
name: add-field
description: Add a new form field to an assessment section (component + TypeScript interface)
argument-hint: <sectionNumber> <fieldName> <fieldType>
---

# Add Field

Add a new form field to a Peak360 assessment section. This ensures the field is added to both the section component and the TypeScript interface.

## Arguments

`$ARGUMENTS` should include the section number and field name. If not provided, ask for:

1. **sectionNumber** — Which section (1-10) to add the field to
2. **fieldName** — camelCase field ID (e.g., `clientPhone`, `restingHr`)
3. **fieldType** — `text`, `number`, `select`, `radio`, `slider`, or `signature`
4. **label** — Display label for the field
5. **options** — For select/radio: the available options
6. **validation** — Any constraints (min, max, required)

## Steps

### Step 1: Add to TypeScript interface in `src/types/assessment.ts`

Find the appropriate section interface and add the field:

```typescript
fieldName?: number | null;    // for number fields
fieldName?: string | null;    // for text/select fields
```

All fields should be optional (`?`) and nullable (`| null`).

### Step 2: Add to section component in `src/components/sections/SectionN.tsx`

Add the appropriate form component. All fields use `onChange(fieldName, value)` pattern.

**Number field:**
```tsx
<FormField
  label="Label"
  id="fieldName"
  type="number"
  value={data.fieldName ?? ''}
  onChange={(e) => onChange('fieldName', e.target.value === '' ? null : Number(e.target.value))}
/>
```

**Text field:**
```tsx
<FormField
  label="Label"
  id="fieldName"
  type="text"
  value={data.fieldName ?? ''}
  onChange={(e) => onChange('fieldName', e.target.value || null)}
/>
```

**Select field:**
```tsx
<SelectField
  label="Label"
  id="fieldName"
  value={data.fieldName ?? ''}
  onChange={(e) => onChange('fieldName', e.target.value || null)}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>
```

**Radio group:**
```tsx
<RadioGroup
  label="Label"
  name="fieldName"
  value={data.fieldName ?? ''}
  onChange={(value) => onChange('fieldName', value || null)}
  options={[
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]}
/>
```

**Slider (1-10 scale):**
```tsx
<SliderField
  label="Label"
  id="fieldName"
  value={data.fieldName ?? 5}
  onChange={(value) => onChange('fieldName', value)}
  min={1}
  max={10}
/>
```

### Step 3: Place the field

Place the new field in a logical position within the section. Use `<FormRow>` to group related fields (2-3 per row).

### Step 4: Verify

- [ ] Field name is camelCase
- [ ] TypeScript interface updated
- [ ] Field uses `onChange('fieldName', value)` pattern
- [ ] Number fields convert empty string to `null` and string to `Number()`
- [ ] No auto-save changes needed (it persists via JSON blob automatically)

The field will auto-persist through the existing JSON blob storage — no database changes needed.
