import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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

export const signatures = sqliteTable('signatures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  signerName: text('signer_name'),
  signatureData: text('signature_data'),
  signedDate: text('signed_date'),
});

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

export const normativeVersions = sqliteTable('normative_versions', {
  id: text('id').primaryKey(),
  rangesJson: text('ranges_json', { mode: 'json' }),
  contentHash: text('content_hash').notNull(),
  createdAt: text('created_at').notNull(),
});
