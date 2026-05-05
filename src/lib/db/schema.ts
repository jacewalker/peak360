import { pgTable, text, integer, serial, jsonb } from 'drizzle-orm/pg-core';

export const assessments = pgTable('assessments', {
  id: text('id').primaryKey(),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  clientDob: text('client_dob'),
  clientGender: text('client_gender'),
  assessmentDate: text('assessment_date'),
  currentSection: integer('current_section').default(1),
  status: text('status').default('in_progress'), // in_progress | completed
  normativeVersionId: text('normative_version_id'),
  coachId: text('coach_id'), // nullable for legacy (SAFE-01)
  clientId: text('client_id'), // nullable for legacy (SAFE-01)
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const assessmentSections = pgTable('assessment_sections', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  sectionNumber: integer('section_number').notNull(),
  data: text('data'),
  completedAt: text('completed_at'),
});

export const signatures = pgTable('signatures', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // client | coach
  signerName: text('signer_name'),
  signatureData: text('signature_data'), // base64 data URL
  signedDate: text('signed_date'),
});

export const uploadedFiles = pgTable('uploaded_files', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  sectionNumber: integer('section_number').notNull(),
  fileName: text('file_name'),
  extractedData: text('extracted_data'),
  verificationResult: jsonb('verification_result'),
  status: text('status').default('pending'), // pending | extracting | verifying | completed | failed
  createdAt: text('created_at').notNull(),
});

export const normativeRanges = pgTable('normative_ranges', {
  id: serial('id').primaryKey(),
  testKey: text('test_key').notNull(),
  category: text('category').notNull(),
  gender: text('gender'),
  ageGroup: text('age_group'),
  unit: text('unit'),
  note: text('note'),
  tiers: jsonb('tiers'),
  severityWeight: integer('severity_weight'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

export const normativeVersions = pgTable('normative_versions', {
  id: text('id').primaryKey(),
  rangesJson: jsonb('ranges_json'),
  contentHash: text('content_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

// Better Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified').$type<boolean>(),
  image: text('image'),
  role: text('role').default('coach'), // admin | coach | client
  banned: integer('banned').$type<boolean>(),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const session = pgTable('session', {
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

export const account = pgTable('account', {
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

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});
