import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VERIFICATION_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { db } from '@/lib/db';
import { uploadedFiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fields, assessmentId, sectionNumber } = body;

    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to verify' }, { status: 400 });
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Verify these extracted lab values:\n\n${JSON.stringify(fields, null, 2)}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const rawResponse = response.choices[0].message.content || '{}';
    let verification;
    try {
      verification = JSON.parse(rawResponse);
    } catch {
      verification = { fields: {}, overallConfidence: 'low' };
    }

    // Update file record with verification
    if (assessmentId && sectionNumber) {
      const [fileRecord] = await db
        .select()
        .from(uploadedFiles)
        .where(
          and(
            eq(uploadedFiles.assessmentId, assessmentId),
            eq(uploadedFiles.sectionNumber, Number(sectionNumber))
          )
        )
        .orderBy(uploadedFiles.id)
        .limit(1);

      if (fileRecord) {
        await db
          .update(uploadedFiles)
          .set({ verificationResult: verification })
          .where(eq(uploadedFiles.id, fileRecord.id));
      }
    }

    return NextResponse.json({ success: true, data: verification });
  } catch (error) {
    console.error('AI verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
