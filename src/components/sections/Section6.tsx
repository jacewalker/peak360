'use client';

import { useState } from 'react';
import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import FileUploadZone from '@/components/forms/FileUploadZone';
import type { ProcessingStage } from '@/components/forms/FileUploadZone';
import ExtractedValuesPanel from '@/components/forms/ExtractedValuesPanel';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function Section6({ data, onChange, assessmentId }: SectionProps) {
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);
  const [doneMessage, setDoneMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [extractedFields, setExtractedFields] = useState<Record<string, { value: string | number; confidence: string }> | null>(null);

  const handleEvoltImport = async (file: File) => {
    setProcessingStage('uploading');
    setWarningMessage('');
    setExtractedFields(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assessmentId', assessmentId);
      formData.append('sectionNumber', '6');

      // Start API call in background
      const extractPromise = fetch('/api/ai/extract', { method: 'POST', body: formData })
        .then(res => res.json());

      // Advance stages on timer while API works
      await delay(1000);
      setProcessingStage('reading');
      await delay(1500);
      setProcessingStage('interpreting');

      // Wait for extraction result
      const result = await extractPromise;
      const extraction = result.data;
      const warnings: { type: string; message: string }[] = result.warnings || [];

      // Check for blocking warnings
      const unreadable = warnings.find((w: { type: string }) => w.type === 'unreadable');
      const noData = warnings.find((w: { type: string }) => w.type === 'no_data');

      if (unreadable) {
        setErrorMessage(unreadable.message);
        setProcessingStage('error');
        await delay(4000);
        setProcessingStage(null);
        return;
      }

      if (noData) {
        setErrorMessage(noData.message);
        setProcessingStage('error');
        await delay(4000);
        setProcessingStage(null);
        return;
      }

      if (extraction?.fields && Object.keys(extraction.fields).length > 0) {
        // Verification step (still in 'interpreting' stage)
        const verifyRes = await fetch('/api/ai/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: extraction.fields, assessmentId, sectionNumber: 6 }),
        });
        const { data: verification } = await verifyRes.json();

        const merged: Record<string, { value: string | number; confidence: string }> = {};
        for (const [key, val] of Object.entries(extraction.fields)) {
          const v = val as { value: string | number };
          const conf = verification?.fields?.[key]?.confidence || 'medium';
          merged[key] = { value: v.value, confidence: conf };
        }
        setExtractedFields(merged);

        // Check for non-blocking warnings
        const nonBlockingWarning = warnings.find((w: { type: string }) => w.type === 'wrong_document' || w.type === 'low_quality');
        if (nonBlockingWarning) {
          setWarningMessage(nonBlockingWarning.message);
          setProcessingStage('warning');
          // Warning stays until user uploads a new file
          return;
        }

        const count = Object.keys(merged).length;
        setDoneMessage(`${count} value${count !== 1 ? 's' : ''} extracted and verified`);
        setProcessingStage('done');
        await delay(10000);
        setProcessingStage(null);
      } else {
        // Use the most descriptive warning message from the API if available
        const bestMessage = warnings.length > 0
          ? warnings.map((w: { message: string }) => w.message).join(' ')
          : 'No values could be extracted from this document.';
        setErrorMessage(bestMessage);
        setProcessingStage('error');
        await delay(4000);
        setProcessingStage(null);
      }
    } catch {
      setErrorMessage('Import failed. Please enter values manually.');
      setProcessingStage('error');
      await delay(4000);
      setProcessingStage(null);
    }
  };

  const acceptAll = (finalFields: Record<string, { value: string | number; confidence: string }>) => {
    for (const [key, val] of Object.entries(finalFields)) {
      onChange(key, val.value);
    }
    setExtractedFields(null);
  };

  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={6}
        title="Body Composition"
        description="Body composition measurements from Evolt 360 scan or manual entry."
      />

      <FileUploadZone
        label="Import Evolt 360 Scan Data"
        onFileSelect={handleEvoltImport}
        processingStage={processingStage}
        doneMessage={doneMessage}
        errorMessage={errorMessage}
        warningMessage={warningMessage}
        accept=".csv,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg,.heic,.heif,.tiff,.tif,.bmp,.webp,.avif,.svg"
      />

      {extractedFields && (
        <ExtractedValuesPanel
          fields={extractedFields}
          onAcceptAll={acceptAll}
          onDismiss={() => setExtractedFields(null)}
        />
      )}

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <FormRow>
          <FormField id="bodyFatPercentage" label="Body Fat Percentage (%)" type="number" value={data.bodyFatPercentage as number} onChange={n('bodyFatPercentage')} step={0.1} min={3} max={60} />
          <FormField id="leanMass" label="Lean Mass (kg)" type="number" value={data.leanMass as number} onChange={n('leanMass')} step={0.1} min={20} max={200} />
        </FormRow>
        <FormRow>
          <FormField id="skeletalMuscleMass" label="Skeletal Muscle Mass (kg)" type="number" value={data.skeletalMuscleMass as number} onChange={n('skeletalMuscleMass')} step={0.1} min={15} max={120} />
          <FormField id="fatMass" label="Fat Mass (kg)" type="number" value={data.fatMass as number} onChange={n('fatMass')} step={0.1} min={2} max={150} />
        </FormRow>
        <FormRow>
          <FormField id="visceralFatRating" label="Visceral Fat Rating" type="number" value={data.visceralFatRating as number} onChange={n('visceralFatRating')} step={0.5} min={1} max={60} />
          <FormField id="waistToHipRatio" label="Waist-to-Hip Ratio" type="number" value={data.waistToHipRatio as number} onChange={n('waistToHipRatio')} step={0.01} min={0.5} max={1.5} />
        </FormRow>
        <FormRow>
          <FormField id="bwi" label="Evolt360 BWI Score (out of 10)" type="number" value={data.bwi as number} onChange={n('bwi')} step={0.1} min={0} max={10} />
          <FormField id="bmr" label="BMR - Basal Metabolic Rate (kcal/day)" type="number" value={data.bmr as number} onChange={n('bmr')} min={800} max={4000} />
        </FormRow>
      </div>
    </div>
  );
}
