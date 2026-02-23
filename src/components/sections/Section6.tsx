'use client';

import { useState } from 'react';
import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import FileUploadZone from '@/components/forms/FileUploadZone';

export default function Section6({ data, onChange, assessmentId }: SectionProps) {
  const [uploadStatus, setUploadStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEvoltImport = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('Processing Evolt 360 data...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assessmentId', assessmentId);
      formData.append('sectionNumber', '6');

      const res = await fetch('/api/ai/extract', { method: 'POST', body: formData });
      const { data: extraction } = await res.json();

      if (extraction?.fields) {
        for (const [key, val] of Object.entries(extraction.fields)) {
          const v = val as { value: string | number };
          onChange(key, v.value);
        }
        setUploadStatus('Values imported successfully');
      }
    } catch {
      setUploadStatus('Import failed. Please enter values manually.');
    } finally {
      setIsProcessing(false);
    }
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
        isProcessing={isProcessing}
        status={uploadStatus}
        accept=".csv,.xlsx,.xls,.pdf,.txt"
      />

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
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
          <FormField id="bmr" label="BMR - Basal Metabolic Rate (kcal/day)" type="number" value={data.bmr as number} onChange={n('bmr')} min={800} max={4000} />
        </FormRow>
      </div>
    </div>
  );
}
