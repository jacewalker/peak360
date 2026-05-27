// Seed a fully-completed 'Bob Smith' client + ONE completed assessment for the
// Section 11 report demo. Produces realistic, normatively-GOOD male data (age 41)
// so the Section 11 report and all five Peak Living pillars render end-to-end.
//
// Usage:
//   DATABASE_URL=postgres://... ENCRYPTION_KEY=... npx tsx scripts/seed-bob-smith.ts
//
// WARNING: Run against the DEV Postgres DB ONLY. NEVER point this at production.
// This script cannot be executed from the Claude sandbox (the dev DB host is
// unreachable from there).
//
// Note: ENCRYPTION_KEY must match the dev app's key, or sections 3/4/5 are
// stored as plaintext (encrypt() degrades gracefully when the key is unset) and
// will then FAIL decrypt-on-read once a real key is set. DATABASE_URL must be
// present so the db proxy selects Postgres (auth.api.createUser fails on SQLite
// due to a boolean-binding bug — this seed is Postgres-only).

(async () => {
  // 1. Guard + masking.
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required — this seed targets Postgres only.');
    process.exit(1);
  }
  const masked = process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@');
  console.log('Target DATABASE_URL:', masked);
  if (process.env.ENCRYPTION_KEY) {
    console.log('ENCRYPTION_KEY: set (sections 3/4/5 will be encrypted).');
  } else {
    console.warn(
      'ENCRYPTION_KEY: NOT set — sections 3/4/5 will be stored as PLAINTEXT (encrypt() degrades gracefully). They will fail decrypt-on-read once a real key is configured.'
    );
  }

  // 2. Dynamic imports AFTER the guard so DATABASE_URL is set before the db
  //    proxy initializes.
  const { runMigrations, db } = await import('../src/lib/db/index');
  const schema = await import('../src/lib/db/schema');
  const { encrypt } = await import('../src/lib/crypto');
  const { createOrReuseVersion } = await import('../src/lib/normative/versioning');
  const { auth } = await import('../src/lib/auth');
  const { eq, and } = await import('drizzle-orm');
  const { v4: uuidv4 } = await import('uuid');

  await runMigrations();

  // 3. Create/reuse Bob.
  const BOB_EMAIL = 'bob.smith@example.com';
  const BOB_NAME = 'Bob Smith';

  let bobRows = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, BOB_EMAIL))
    .limit(1);

  if (bobRows.length === 0) {
    await auth.api.createUser({
      body: {
        email: BOB_EMAIL,
        password: globalThis.crypto.randomUUID(),
        name: BOB_NAME,
        // Better Auth admin plugin role typing narrows to its own union; the
        // runtime accepts any configured role string, so we widen via cast.
        role: 'client' as 'user' | 'admin',
      },
    });
    bobRows = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, BOB_EMAIL))
      .limit(1);
  }

  if (bobRows.length === 0) {
    throw new Error('Bob Smith user not found after createUser.');
  }
  const bobId = bobRows[0].id;

  // Pick a coachId: prefer a coach, then an admin, then any non-Bob user.
  let coachId: string | null = null;
  const coachRows = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.role, 'coach'))
    .limit(1);
  if (coachRows.length > 0) {
    coachId = coachRows[0].id;
  } else {
    const adminRows = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.role, 'admin'))
      .limit(1);
    if (adminRows.length > 0) {
      coachId = adminRows[0].id;
    } else {
      const anyRows = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .limit(5);
      const other = anyRows.find((r: { id: string }) => r.id !== bobId);
      coachId = other ? other.id : null;
    }
  }

  // 4. Idempotency: delete any prior seeded Bob assessment (sections +
  //    pillar_prescriptions cascade-delete via FK).
  const priorAssessments = await db
    .select({ id: schema.assessments.id })
    .from(schema.assessments)
    .where(
      and(
        eq(schema.assessments.clientId, bobId),
        eq(schema.assessments.clientEmail, BOB_EMAIL)
      )
    );
  for (const a of priorAssessments) {
    await db.delete(schema.assessments).where(eq(schema.assessments.id, a.id));
  }

  // 5. Build the assessment.
  const assessmentId = uuidv4();
  const today = new Date().toISOString().split('T')[0];
  const normativeVersionId = await createOrReuseVersion();

  await db.insert(schema.assessments).values({
    id: assessmentId,
    clientName: BOB_NAME,
    clientEmail: BOB_EMAIL,
    clientDob: '1985-04-12',
    clientGender: 'male',
    assessmentDate: today,
    currentSection: 11,
    status: 'completed',
    normativeVersionId,
    coachId,
    clientId: bobId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 6. Author realistic, normatively-GOOD MALE values for age 41. Keys MUST be
  //    the report-markers dataKeys (NOT the assessment.ts interface keys), since
  //    the report reads sectionData[m.dataKey].
  const sectionData: Record<number, Record<string, unknown>> = {
    1: {
      clientName: BOB_NAME,
      clientEmail: BOB_EMAIL,
      clientPhone: '0400 000 000',
      clientDob: '1985-04-12',
      clientAge: 41, // REQUIRED for age-bucketed ratings.
      clientGender: 'male',
      coachName: 'Demo Coach',
      assessmentDate: today,
      location: 'Peak360 Studio',
    },
    2: {
      sleepQuality: 8,
      stressLevel: 3,
      energyLevel: 8,
      hydration: 'good',
      lastMeal: '2 hours ago',
    },
    3: {
      heartCondition: 'no',
      chestPain: 'no',
      dizziness: 'no',
      boneJoint: 'no',
      medication: 'no',
      medicalConditions: '',
      injuries: '',
      surgeries: '',
      allergies: '',
      additionalNotes: '',
    },
    4: {
      consentAgreed: true,
      clientSignature: '',
      clientSignatureName: BOB_NAME,
      clientSignatureDate: today,
      coachSignature: '',
      coachSignatureName: 'Demo Coach',
      coachSignatureDate: today,
    },
    5: {
      cholesterolTotal: 4.6,
      ldl: 2.3,
      hdl: 1.6,
      triglycerides: 0.9,
      glucose: 4.9,
      hba1c: 5.1,
      hsCRP: 0.4,
      vitaminD: 110,
      uricAcid: 5.2,
      serumIron: 110,
      ferritin: 180,
      totalTestosterone: 650,
      freeTestosterone: 14,
      oestradiol: 25,
      shbg: 40,
      dheas: 420,
      fsh: 6,
      lh: 5,
      hemoglobin: 15.2,
      rbc: 5.2,
      hematocrit: 46,
      creatinine: 1.0,
      egfr: 95,
      alt: 22,
      ast: 20,
      ggt: 18,
    },
    6: {
      bwi: 8.6,
      bodyFatPercentage: 14,
      waistToHipRatio: 0.86,
      leanMass: 68,
      skeletalMuscleMass: 38,
      fatMass: 12,
      visceralFatRating: 6,
      bmr: 1750,
    },
    7: {
      vo2max: 50,
      restingHR: 54,
      bpSystolic: 118,
      bpDiastolic: 76,
    },
    8: {
      gripStrengthLeft: 48,
      gripStrengthRight: 50,
      cmjLeft: 40,
      cmjRight: 41,
      imtpMaxForce: 200,
      singleLegHopLeft: 35,
      singleLegHopRight: 36,
      singleLegBalanceLeft: 120,
      singleLegBalanceRight: 130,
      shoulderIsoYLeft: 9,
      shoulderIsoYRight: 9,
      pushupsMax: 30,
      deadManHang: 70,
      farmersCarryDistance: 90,
    },
    9: {
      hipMobilityLeft: 13,
      hipMobilityRight: 13,
      overheadReachLeft: 5,
      overheadReachRight: 5,
      shoulderMobilityLeft: 4,
      shoulderMobilityRight: 4,
      ankleDorsiflexionLeft: 12,
      ankleDorsiflexionRight: 12,
    },
    10: {
      singleLegBalanceLeft: 120,
      singleLegBalanceRight: 130,
      verticalJump: 50,
      broadJump: 230,
    },
  };

  // 7. Insert sections 1–10. Sections 3/4/5 MUST be encrypted (the report's
  //    decrypt-on-read contract); the rest are stored as plain JSON.
  const ENCRYPTED = new Set([3, 4, 5]);
  for (let n = 1; n <= 10; n++) {
    const json = JSON.stringify(sectionData[n]);
    const stored = ENCRYPTED.has(n) ? encrypt(json) : json;
    await db.insert(schema.assessmentSections).values({
      assessmentId,
      sectionNumber: n,
      data: stored,
      completedAt: new Date().toISOString(),
    });
  }

  // 8. Final logging.
  console.log('Seeded Bob Smith:');
  console.log('  user id:       ', bobId);
  console.log('  assessment id: ', assessmentId);
  console.log('  coach id:      ', coachId ?? '(none — Bob is the only user)');
  console.log(
    `View: log in as ${BOB_EMAIL}, or impersonate Bob from the People page; open /portal/assessment/${assessmentId}/section/11 for the report.`
  );
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
