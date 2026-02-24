'use client';

import { useState } from 'react';
import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import TestCategory from '@/components/ui/TestCategory';
import FileUploadZone from '@/components/forms/FileUploadZone';
import type { ProcessingStage } from '@/components/forms/FileUploadZone';
import ExtractedValuesPanel from '@/components/forms/ExtractedValuesPanel';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function Section5({ data, onChange, assessmentId }: SectionProps) {
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);
  const [doneMessage, setDoneMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [extractedFields, setExtractedFields] = useState<Record<string, { value: string | number; confidence: string }> | null>(null);

  const handleFileUpload = async (file: File) => {
    setProcessingStage('uploading');
    setExtractedFields(null);
    setWarningMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assessmentId', assessmentId);
      formData.append('sectionNumber', '5');

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

      // Check for blocking warnings (unreadable / no data with no fields)
      const unreadable = warnings.find(w => w.type === 'unreadable');
      const noData = warnings.find(w => w.type === 'no_data');

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
          body: JSON.stringify({ fields: extraction.fields, assessmentId, sectionNumber: 5 }),
        });
        const { data: verification } = await verifyRes.json();

        const merged: Record<string, { value: string | number; confidence: string }> = {};
        for (const [key, val] of Object.entries(extraction.fields)) {
          const v = val as { value: string | number };
          const conf = verification?.fields?.[key]?.confidence || 'medium';
          merged[key] = { value: v.value, confidence: conf };
        }
        setExtractedFields(merged);

        // Check for non-blocking warnings (wrong document, low quality)
        const nonBlockingWarning = warnings.find(w => w.type === 'wrong_document' || w.type === 'low_quality');
        if (nonBlockingWarning) {
          setWarningMessage(nonBlockingWarning.message);
          setProcessingStage('warning');
          // Warning stays until user uploads a new file — no auto-dismiss
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
      setErrorMessage('Extraction failed. Please enter values manually.');
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
        number={5}
        title="Blood Tests & Biomarkers"
        description="Enter lab results or upload a file for AI-powered extraction."
      />

      <FileUploadZone
        label="Import Lab Results"
        onFileSelect={handleFileUpload}
        processingStage={processingStage}
        doneMessage={doneMessage}
        errorMessage={errorMessage}
        warningMessage={warningMessage}
      />

      {extractedFields && (
        <ExtractedValuesPanel
          fields={extractedFields}
          onAcceptAll={acceptAll}
          onDismiss={() => setExtractedFields(null)}
        />
      )}

      <div className="bg-white rounded-xl border border-border p-6 space-y-8">
        <TestCategory title="Lipid Panel">
          <FormRow>
            <FormField id="cholesterolTotal" label="Total Cholesterol (mmol/L)" type="number" value={data.cholesterolTotal as number} onChange={n('cholesterolTotal')} step={0.1} />
            <FormField id="ldl" label="LDL Cholesterol (mmol/L)" type="number" value={data.ldl as number} onChange={n('ldl')} step={0.1} />
          </FormRow>
          <FormRow>
            <FormField id="hdl" label="HDL Cholesterol (mmol/L)" type="number" value={data.hdl as number} onChange={n('hdl')} step={0.1} />
            <FormField id="triglycerides" label="Triglycerides (mmol/L)" type="number" value={data.triglycerides as number} onChange={n('triglycerides')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Glucose / Metabolic">
          <FormRow columns={3}>
            <FormField id="glucose" label="Fasting Glucose (mmol/L)" type="number" value={data.glucose as number} onChange={n('glucose')} step={0.1} />
            <FormField id="hba1c" label="HbA1c (%)" type="number" value={data.hba1c as number} onChange={n('hba1c')} step={0.1} />
            <FormField id="insulin" label="Insulin (uU/mL)" type="number" value={data.insulin as number} onChange={n('insulin')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Inflammation">
          <FormRow columns={3}>
            <FormField id="hsCRP" label="hs-CRP (mg/L)" type="number" value={data.hsCRP as number} onChange={n('hsCRP')} step={0.1} />
            <FormField id="homocysteine" label="Homocysteine (umol/L)" type="number" value={data.homocysteine as number} onChange={n('homocysteine')} step={0.1} />
            <FormField id="ck" label="Creatine Kinase (U/L)" type="number" value={data.ck as number} onChange={n('ck')} step={1} />
          </FormRow>
          <FormRow>
            <FormField id="uricAcid" label="Uric Acid (mg/dL)" type="number" value={data.uricAcid as number} onChange={n('uricAcid')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Thyroid">
          <FormRow columns={3}>
            <FormField id="tsh" label="TSH (mIU/L)" type="number" value={data.tsh as number} onChange={n('tsh')} step={0.01} />
            <FormField id="ft3" label="FT3 (pg/mL)" type="number" value={data.ft3 as number} onChange={n('ft3')} step={0.1} />
            <FormField id="ft4" label="FT4 (ng/dL)" type="number" value={data.ft4 as number} onChange={n('ft4')} step={0.1} />
          </FormRow>
          <FormRow>
            <FormField id="tgab" label="Thyroglobulin Ab (IU/mL)" type="number" value={data.tgab as number} onChange={n('tgab')} step={0.1} />
            <FormField id="tpo" label="Thyroperoxidase Ab (IU/mL)" type="number" value={data.tpo as number} onChange={n('tpo')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Hormones">
          <FormRow>
            <FormField id="totalTestosterone" label="Total Testosterone (ng/dL)" type="number" value={data.totalTestosterone as number} onChange={n('totalTestosterone')} step={0.1} />
            <FormField id="freeTestosterone" label="Free Testosterone (pg/mL)" type="number" value={data.freeTestosterone as number} onChange={n('freeTestosterone')} step={0.1} />
          </FormRow>
          <FormRow columns={3}>
            <FormField id="oestradiol" label="E2 - Oestradiol (pg/mL)" type="number" value={data.oestradiol as number} onChange={n('oestradiol')} step={0.1} />
            <FormField id="shbg" label="SHBG (nmol/L)" type="number" value={data.shbg as number} onChange={n('shbg')} step={0.1} />
            <FormField id="cortisol" label="Cortisol (ug/dL)" type="number" value={data.cortisol as number} onChange={n('cortisol')} step={0.1} />
          </FormRow>
          <FormRow columns={3}>
            <FormField id="dheas" label="DHEAS (ug/dL)" type="number" value={data.dheas as number} onChange={n('dheas')} step={0.1} />
            <FormField id="igf1" label="IGF-1 (ng/mL)" type="number" value={data.igf1 as number} onChange={n('igf1')} step={0.1} />
            <FormField id="fsh" label="FSH (mIU/mL)" type="number" value={data.fsh as number} onChange={n('fsh')} step={0.1} />
          </FormRow>
          <FormRow columns={3}>
            <FormField id="lh" label="LH (mIU/mL)" type="number" value={data.lh as number} onChange={n('lh')} step={0.1} />
            <FormField id="prolactin" label="Prolactin (ng/mL)" type="number" value={data.prolactin as number} onChange={n('prolactin')} step={0.1} />
            <FormField id="progesterone" label="Progesterone (ng/mL)" type="number" value={data.progesterone as number} onChange={n('progesterone')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Vitamins & Minerals">
          <FormRow columns={3}>
            <FormField id="vitaminD" label="Vitamin D (nmol/L)" type="number" value={data.vitaminD as number} onChange={n('vitaminD')} step={0.1} />
            <FormField id="vitaminB12" label="Vitamin B12 (pg/mL)" type="number" value={data.vitaminB12 as number} onChange={n('vitaminB12')} step={1} />
            <FormField id="folate" label="Folate (ng/mL)" type="number" value={data.folate as number} onChange={n('folate')} step={0.1} />
          </FormRow>
          <FormRow columns={3}>
            <FormField id="magnesium" label="Magnesium (mg/dL)" type="number" value={data.magnesium as number} onChange={n('magnesium')} step={0.01} />
            <FormField id="zinc" label="Zinc (ug/dL)" type="number" value={data.zinc as number} onChange={n('zinc')} step={1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Iron Studies">
          <FormRow columns={4}>
            <FormField id="serumIron" label="Serum Iron (ug/dL)" type="number" value={data.serumIron as number} onChange={n('serumIron')} step={0.1} />
            <FormField id="tibc" label="TIBC (ug/dL)" type="number" value={data.tibc as number} onChange={n('tibc')} step={0.1} />
            <FormField id="transferrinSat" label="Transferrin Sat (%)" type="number" value={data.transferrinSat as number} onChange={n('transferrinSat')} step={0.1} />
            <FormField id="ferritin" label="Ferritin (ng/mL)" type="number" value={data.ferritin as number} onChange={n('ferritin')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Full Blood Count (FBC)">
          <FormRow columns={3}>
            <FormField id="hemoglobin" label="Hemoglobin (g/dL)" type="number" value={data.hemoglobin as number} onChange={n('hemoglobin')} step={0.1} />
            <FormField id="rbc" label="RBC (million/mcL)" type="number" value={data.rbc as number} onChange={n('rbc')} step={0.01} />
            <FormField id="hematocrit" label="Hematocrit (%)" type="number" value={data.hematocrit as number} onChange={n('hematocrit')} step={0.1} />
          </FormRow>
          <FormRow columns={4}>
            <FormField id="wbc" label="WBC (cells/mcL)" type="number" value={data.wbc as number} onChange={n('wbc')} step={0.1} />
            <FormField id="platelet" label="Platelets (cells/mcL)" type="number" value={data.platelet as number} onChange={n('platelet')} step={1} />
            <FormField id="mcv" label="MCV (fL)" type="number" value={data.mcv as number} onChange={n('mcv')} step={0.1} />
            <FormField id="mch" label="MCH (pg)" type="number" value={data.mch as number} onChange={n('mch')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Kidney Function & Electrolytes">
          <FormRow columns={3}>
            <FormField id="creatinine" label="Creatinine (mg/dL)" type="number" value={data.creatinine as number} onChange={n('creatinine')} step={0.01} />
            <FormField id="egfr" label="eGFR (mL/min)" type="number" value={data.egfr as number} onChange={n('egfr')} step={1} />
            <FormField id="bun" label="BUN (mg/dL)" type="number" value={data.bun as number} onChange={n('bun')} step={0.1} />
          </FormRow>
          <FormRow columns={4}>
            <FormField id="sodium" label="Sodium (mmol/L)" type="number" value={data.sodium as number} onChange={n('sodium')} step={0.1} />
            <FormField id="potassium" label="Potassium (mmol/L)" type="number" value={data.potassium as number} onChange={n('potassium')} step={0.1} />
            <FormField id="chloride" label="Chloride (mmol/L)" type="number" value={data.chloride as number} onChange={n('chloride')} step={0.1} />
            <FormField id="bicarbonate" label="Bicarbonate (mmol/L)" type="number" value={data.bicarbonate as number} onChange={n('bicarbonate')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Liver Function Tests">
          <FormRow columns={4}>
            <FormField id="alt" label="ALT (U/L)" type="number" value={data.alt as number} onChange={n('alt')} step={1} />
            <FormField id="ast" label="AST (U/L)" type="number" value={data.ast as number} onChange={n('ast')} step={1} />
            <FormField id="alp" label="ALP (U/L)" type="number" value={data.alp as number} onChange={n('alp')} step={1} />
            <FormField id="ggt" label="GGT (U/L)" type="number" value={data.ggt as number} onChange={n('ggt')} step={1} />
          </FormRow>
          <FormRow columns={3}>
            <FormField id="bilirubin" label="Total Bilirubin (mg/dL)" type="number" value={data.bilirubin as number} onChange={n('bilirubin')} step={0.1} />
            <FormField id="albumin" label="Albumin (g/dL)" type="number" value={data.albumin as number} onChange={n('albumin')} step={0.1} />
            <FormField id="totalProtein" label="Total Protein (g/dL)" type="number" value={data.totalProtein as number} onChange={n('totalProtein')} step={0.1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Advanced Lipids">
          <FormRow>
            <FormField id="apoB" label="ApoB (mg/dL)" type="number" value={data.apoB as number} onChange={n('apoB')} step={1} />
            <FormField id="lpa" label="Lp(a) (mg/dL)" type="number" value={data.lpa as number} onChange={n('lpa')} step={1} />
          </FormRow>
        </TestCategory>

        <TestCategory title="Heavy Metals Screen">
          <FormRow columns={4}>
            <FormField id="lead" label="Lead (ug/dL)" type="number" value={data.lead as number} onChange={n('lead')} step={0.1} />
            <FormField id="mercury" label="Mercury (ug/L)" type="number" value={data.mercury as number} onChange={n('mercury')} step={0.1} />
            <FormField id="arsenic" label="Arsenic (ug/L)" type="number" value={data.arsenic as number} onChange={n('arsenic')} step={0.1} />
            <FormField id="cadmium" label="Cadmium (ug/L)" type="number" value={data.cadmium as number} onChange={n('cadmium')} step={0.1} />
          </FormRow>
        </TestCategory>
      </div>
    </div>
  );
}
