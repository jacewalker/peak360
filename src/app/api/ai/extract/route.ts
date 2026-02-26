import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { EXTRACTION_SYSTEM_PROMPT, EVOLT_EXTRACTION_PROMPT } from '@/lib/ai/prompts';
import { fieldMappings } from '@/lib/ai/field-mappings';
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

    const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|gif|webp|heic|heif|tiff|tif|bmp|avif|svg)$/i);
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    const isBodyComp = sectionNumber === 6;
    const systemPrompt = isBodyComp ? EVOLT_EXTRACTION_PROMPT : EXTRACTION_SYSTEM_PROMPT;
    const userMessage = isBodyComp
      ? 'Extract all body composition values from this Evolt 360 body scan report.'
      : 'Extract all biomarker/lab values from this document.';

    let content: OpenAI.ChatCompletionContentPart[];

    if (isImage || isPdf) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      if (isPdf) {
        // PDFs must be sent as file content parts, not image_url
        content = [
          { type: 'text', text: userMessage },
          {
            type: 'file',
            file: {
              filename: file.name,
              file_data: `data:application/pdf;base64,${base64}`,
            },
          } as unknown as OpenAI.ChatCompletionContentPart,
        ];
      } else {
        // Images use image_url
        const mimeType = file.type || 'image/png';
        content = [
          { type: 'text', text: userMessage },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ];
      }
    } else {
      // Text-based files (CSV, TXT, etc.)
      const text = await file.text();
      content = [
        { type: 'text', text: `${userMessage}\n\n${text}` },
      ];
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
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

    // Normalize field keys using field mappings
    if (extracted.fields) {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(extracted.fields)) {
        const lowerKey = key.toLowerCase().trim();
        // Use the key as-is if it's already a known camelCase field ID,
        // otherwise check field mappings for a match
        const mappedKey = fieldMappings[lowerKey] || fieldMappings[key] || key;
        normalized[mappedKey] = value;
      }
      extracted.fields = normalized;
    }

    // Post-extraction validation
    const SECTION_5_FIELDS = new Set([
      'cholesterolTotal', 'ldl', 'hdl', 'triglycerides', 'glucose', 'hba1c', 'insulin',
      'hsCRP', 'homocysteine', 'ck', 'uricAcid', 'tsh', 'ft3', 'ft4', 'tgab', 'tpo',
      'totalTestosterone', 'freeTestosterone', 'oestradiol', 'shbg', 'cortisol', 'dheas',
      'igf1', 'fsh', 'lh', 'prolactin', 'progesterone', 'vitaminD', 'vitaminB12', 'folate',
      'magnesium', 'zinc', 'serumIron', 'tibc', 'transferrinSat', 'ferritin', 'hemoglobin',
      'rbc', 'hematocrit', 'wbc', 'platelet', 'mcv', 'mch', 'creatinine', 'egfr', 'bun',
      'sodium', 'potassium', 'chloride', 'bicarbonate', 'alt', 'ast', 'alp', 'ggt',
      'bilirubin', 'albumin', 'totalProtein', 'apoB', 'lpa', 'lead', 'mercury', 'arsenic', 'cadmium',
    ]);
    const SECTION_6_FIELDS = new Set([
      'bodyFatPercentage', 'leanMass', 'skeletalMuscleMass', 'fatMass',
      'visceralFatRating', 'waistToHipRatio', 'bwi', 'bmr',
    ]);

    const warnings: { type: string; message: string }[] = [];
    const extractedKeys = Object.keys(extracted.fields || {});
    const expectedFields = sectionNumber === 6 ? SECTION_6_FIELDS : SECTION_5_FIELDS;
    const matchingFields = extractedKeys.filter(k => expectedFields.has(k));
    const matchRate = extractedKeys.length > 0 ? matchingFields.length / extractedKeys.length : 0;

    // Quality checks
    if (extracted.quality === 'unreadable') {
      warnings.push({
        type: 'unreadable',
        message: extracted.qualityNotes || 'The document is unreadable. Please provide a clearer image.',
      });
    } else if (extracted.quality === 'poor') {
      warnings.push({
        type: 'low_quality',
        message: extracted.qualityNotes || 'The image appears blurry or low quality. Some values may be inaccurate.',
      });
    }

    // Document type mismatch checks
    const docType = extracted.documentType as string | undefined;
    if (sectionNumber === 5 && docType === 'body_composition') {
      warnings.push({
        type: 'wrong_document',
        message: 'This looks like a body composition report. Did you mean to upload this to the Body Composition section instead?',
      });
    } else if (sectionNumber === 6 && docType === 'blood_test') {
      warnings.push({
        type: 'wrong_document',
        message: 'This looks like a blood test report. Did you mean to upload this to the Blood Tests section instead?',
      });
    } else if (docType === 'other' || docType === 'unknown') {
      if (extractedKeys.length === 0) {
        warnings.push({
          type: 'no_data',
          message: 'No values could be extracted. This may not be a supported medical document.',
        });
      }
    }

    // Field relevance check
    if (matchRate < 0.2 && extractedKeys.length > 0 && !warnings.some(w => w.type === 'wrong_document')) {
      warnings.push({
        type: 'wrong_document',
        message: sectionNumber === 6
          ? 'Very few body composition fields were found. This may not be a body composition report.'
          : 'Very few blood test fields were found. This may not be a lab results document.',
      });
    }

    // No data extracted — build a descriptive message based on what we know
    if (extractedKeys.length === 0 && !warnings.some(w => w.type === 'no_data' || w.type === 'unreadable')) {
      const hasQualityIssue = extracted.quality === 'poor';
      const qualityDetail = hasQualityIssue && extracted.qualityNotes
        ? ` ${extracted.qualityNotes}`
        : hasQualityIssue
          ? ' The image appears blurry or low quality.'
          : '';
      const docDetail = (docType === 'other' || docType === 'unknown')
        ? ' This may not be a supported medical document.'
        : '';
      warnings.push({
        type: 'no_data',
        message: `No values could be extracted from this document.${qualityDetail}${docDetail}`,
      });
    }

    // Update file record
    await db.update(uploadedFiles)
      .set({ extractedData: extracted, status: 'completed' })
      .where(eq(uploadedFiles.id, fileRecord.id));

    return NextResponse.json({
      success: true,
      data: { fields: extracted.fields, unmapped: extracted.unmapped },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error('AI extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Extraction failed' },
      { status: 500 }
    );
  }
}
