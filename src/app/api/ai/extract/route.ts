import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EXTRACTION_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { uploadedFiles } from '@/lib/db/schema';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assessmentId = formData.get('assessmentId') as string;
    const sectionNumber = parseInt(formData.get('sectionNumber') as string);

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Record file upload
    const now = new Date().toISOString();
    const [fileRecord] = await db.insert(uploadedFiles).values({
      assessmentId,
      sectionNumber,
      fileName: file.name,
      status: 'extracting',
      createdAt: now,
    }).returning();

    const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i);
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    let content: OpenAI.ChatCompletionContentPart[];

    if (isImage || isPdf) {
      // Use vision for images and PDFs
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = isImage
        ? (file.type || 'image/png')
        : 'application/pdf';

      content = [
        { type: 'text', text: 'Extract all biomarker/lab values from this document.' },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ];
    } else {
      // Text-based files (CSV, TXT, etc.)
      const text = await file.text();
      content = [
        { type: 'text', text: `Extract all biomarker/lab values from this document:\n\n${text}` },
      ];
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const rawResponse = response.choices[0].message.content || '{}';
    let extracted;
    try {
      extracted = JSON.parse(rawResponse);
    } catch {
      extracted = { fields: {}, unmapped: [] };
    }

    // Update file record
    await db.update(uploadedFiles)
      .set({ extractedData: extracted, status: 'completed' })
      .where(eq(uploadedFiles.id, fileRecord.id));

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    console.error('AI extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Extraction failed' },
      { status: 500 }
    );
  }
}
