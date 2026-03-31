/**
 * Seed script: creates 5 demo assessments for "Jace TestUser"
 * with realistic data showing improvement over time.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('local.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure tables exist using individual statements
const createAssessmentsTable = `
  CREATE TABLE IF NOT EXISTS "assessments" (
    "id" text PRIMARY KEY NOT NULL,
    "client_name" text,
    "client_email" text,
    "client_dob" text,
    "client_gender" text,
    "assessment_date" text,
    "current_section" integer DEFAULT 1,
    "status" text DEFAULT 'in_progress',
    "created_at" text NOT NULL,
    "updated_at" text NOT NULL
  )
`;

const createSectionsTable = `
  CREATE TABLE IF NOT EXISTS "assessment_sections" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
    "section_number" integer NOT NULL,
    "data" text,
    "completed_at" text
  )
`;

db.prepare(createAssessmentsTable).run();
db.prepare(createSectionsTable).run();

// ── Assessment dates (oldest to newest) ──
const assessmentDates = [
  '2025-06-15',
  '2025-09-15',
  '2025-12-15',
  '2026-01-15',
  '2026-03-15',
];

// ── Helper: linear interpolation across 5 points ──
function lerp(start: number, end: number, index: number, decimals = 1): number {
  const v = start + ((end - start) * index) / 4;
  return Math.round(v * 10 ** decimals) / 10 ** decimals;
}

// ── Section data generators (index 0-4, improvement over time) ──

function section1(i: number) {
  return {
    clientName: 'Jace TestUser',
    clientEmail: 'jace@test.com',
    clientDob: '1990-05-15',
    clientAge: 35,
    clientGender: 'male',
    assessmentDate: assessmentDates[i],
  };
}

function section5(i: number) {
  return {
    cholesterolTotal: lerp(220, 185, i),
    ldl: lerp(140, 105, i),
    hdl: lerp(42, 58, i),
    triglycerides: lerp(165, 110, i),
    glucose: lerp(105, 88, i),
    hba1c: lerp(5.9, 5.2, i),
    hsCRP: lerp(3.2, 0.9, i),
    vitaminD: lerp(22, 52, i),
  };
}

function section6(i: number) {
  return {
    bodyFatPercentage: lerp(24, 17, i),
    waistToHipRatio: lerp(0.94, 0.86, i, 2),
    leanMass: lerp(155, 168, i),
    bwi: lerp(26.5, 24.2, i),
  };
}

function section7(i: number) {
  return {
    vo2max: lerp(36, 46, i),
    restingHR: lerp(74, 58, i, 0),
    bpSystolic: lerp(138, 118, i, 0),
    bpDiastolic: lerp(88, 76, i, 0),
  };
}

function section8(i: number) {
  return {
    gripStrengthLeft: lerp(85, 110, i),
    gripStrengthRight: lerp(90, 115, i),
    pushupsMax: lerp(22, 42, i, 0),
    deadManHang: lerp(35, 75, i, 0),
    farmersCarryDistance: lerp(120, 200, i, 0),
  };
}

function section9(i: number) {
  return {
    hipMobilityLeft: lerp(28, 42, i, 0),
    hipMobilityRight: lerp(30, 44, i, 0),
  };
}

// ── Insert helpers ──

const insertAssessment = db.prepare(`
  INSERT INTO assessments (id, client_name, client_email, client_dob, client_gender, assessment_date, current_section, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSection = db.prepare(`
  INSERT INTO assessment_sections (assessment_id, section_number, data, completed_at)
  VALUES (?, ?, ?, ?)
`);

// ── Seed (wrapped in a transaction) ──

const insertAll = db.transaction(() => {
  for (let i = 0; i < 5; i++) {
    const id = uuidv4();
    const date = assessmentDates[i];

    insertAssessment.run(
      id,
      'Jace TestUser',
      'jace@test.com',
      '1990-05-15',
      'male',
      date,
      11,
      'completed',
      date + 'T10:00:00.000Z',
      date + 'T11:00:00.000Z',
    );

    const sections: Array<[number, object]> = [
      [1, section1(i)],
      [5, section5(i)],
      [6, section6(i)],
      [7, section7(i)],
      [8, section8(i)],
      [9, section9(i)],
    ];

    for (const [num, data] of sections) {
      insertSection.run(
        id,
        num,
        JSON.stringify(data),
        date + 'T11:00:00.000Z',
      );
    }

    console.log(`[${i + 1}/5] Assessment ${id} -- ${date}`);
  }
});

insertAll();

console.log('\nDone! 5 demo assessments seeded for Jace TestUser.');
db.close();
