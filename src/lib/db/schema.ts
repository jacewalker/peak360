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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const assessmentSections = pgTable('assessment_sections', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  sectionNumber: integer('section_number').notNull(),
  data: jsonb('data'),
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
  extractedData: jsonb('extracted_data'),
  verificationResult: jsonb('verification_result'),
  status: text('status').default('pending'), // pending | extracting | verifying | completed | failed
  createdAt: text('created_at').notNull(),
});
