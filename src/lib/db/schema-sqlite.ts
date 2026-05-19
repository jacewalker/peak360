import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const assessments = sqliteTable('assessments', {
  id: text('id').primaryKey(),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  clientDob: text('client_dob'),
  clientGender: text('client_gender'),
  assessmentDate: text('assessment_date'),
  currentSection: integer('current_section').default(1),
  status: text('status').default('in_progress'),
  normativeVersionId: text('normative_version_id'),
  coachId: text('coach_id'), // nullable for legacy (SAFE-01)
  clientId: text('client_id'), // nullable for legacy (SAFE-01)
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const assessmentSections = sqliteTable('assessment_sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  sectionNumber: integer('section_number').notNull(),
  data: text('data', { mode: 'json' }),
  completedAt: text('completed_at'),
});

// `signatures` table removed — see schema.ts for rationale.

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  sectionNumber: integer('section_number').notNull(),
  fileName: text('file_name'),
  extractedData: text('extracted_data', { mode: 'json' }),
  verificationResult: text('verification_result', { mode: 'json' }),
  status: text('status').default('pending'),
  createdAt: text('created_at').notNull(),
});

export const normativeRanges = sqliteTable('normative_ranges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  testKey: text('test_key').notNull(),
  category: text('category').notNull(),
  gender: text('gender'),
  ageGroup: text('age_group'),
  unit: text('unit'),
  note: text('note'),
  tiers: text('tiers', { mode: 'json' }),
  severityWeight: integer('severity_weight'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

// Phase 8 — Peak Living five-pillar report tables
export const pillarDefinitions = sqliteTable('pillar_definitions', {
  pillarKey: text('pillar_key').primaryKey(),
  label: text('label').notNull(),
  shortSummary: text('short_summary').notNull(),
  plainMeaning: text('plain_meaning').notNull(),
  sortOrder: integer('sort_order').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pillarPageCopy = sqliteTable('pillar_page_copy', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  heading: text('heading').notNull(),
  intro: text('intro').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pillarPrescriptions = sqliteTable(
  'pillar_prescriptions',
  {
    assessmentId: text('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    pillarKey: text('pillar_key').notNull(),
    summary: text('summary').notNull(),
    bullets: text('bullets', { mode: 'json' }).$type<string[] | null>(),
    fullPlanHref: text('full_plan_href'),
    updatedBy: text('updated_by').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.assessmentId, t.pillarKey] }),
  })
);

export const normativeVersions = sqliteTable('normative_versions', {
  id: text('id').primaryKey(),
  rangesJson: text('ranges_json', { mode: 'json' }),
  contentHash: text('content_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

// Better Auth tables
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified'),
  image: text('image'),
  role: text('role').default('coach'), // admin | coach | client
  coachId: text('coach_id'),
  banned: integer('banned'),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: text('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: text('access_token_expires_at'),
  refreshTokenExpiresAt: text('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});
