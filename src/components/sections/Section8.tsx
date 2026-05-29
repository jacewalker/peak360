'use client';

import type { SectionProps } from '@/app/portal/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import ValdResultCard from '@/components/ui/ValdResultCard';
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';
import type { ReactNode } from 'react';

function TestRow({ num, title, inputs, result }: { num: number; title: string; inputs: ReactNode; result: ReactNode }) {
  return (
    <section>
      <h3 className="font-mono text-[11px] font-medium text-gold-brand uppercase tracking-[0.18em] mb-2">{num}. {title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-bg-3 rounded-xl border border-line px-5 py-3.5 space-y-3">
          {inputs}
        </div>
        <div className="min-w-0">{result}</div>
      </div>
    </section>
  );
}

export default function Section8({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));
  const assessmentDate = data.assessmentDate as string | undefined;

  return (
    <div className="space-y-8">
      <SectionHeader
        number={8}
        title="Strength Testing"
        description="Record results for each strength test in testing order."
      />

      {/* 1. Handgrip Test */}
      <TestRow num={1} title="Handgrip Test" inputs={
        <FormRow>
          <FormField id="gripStrengthLeft" label="Left Hand (kg)" type="number" value={data.gripStrengthLeft as number} onChange={n('gripStrengthLeft')} step={0.1} />
          <FormField id="gripStrengthRight" label="Right Hand (kg)" type="number" value={data.gripStrengthRight as number} onChange={n('gripStrengthRight')} step={0.1} />
        </FormRow>
      } result={
        <ValdResultCard title="Handgrip Test" category="Strength" metric="Max force" unit="kg"
          left={data.gripStrengthLeft as number} right={data.gripStrengthRight as number} date={assessmentDate} />
      } />

      {/* 2. Countermovement Jump (Vald) */}
      <TestRow num={2} title="Countermovement Jump" inputs={
        <FormRow>
          <FormField id="cmjJumpHeight" label="Jump Height (cm)" type="number" value={data.cmjJumpHeight as number} onChange={n('cmjJumpHeight')} step={0.1} />
          <FormField id="cmjModifiedRsi" label="Modified RSI" type="number" value={data.cmjModifiedRsi as number} onChange={n('cmjModifiedRsi')} step={0.01} />
        </FormRow>
      } result={
        <ValdResultCard title="Countermovement Jump" category="Jump" metric="Jump height" unit="cm" isForceDecks
          singleValue={data.cmjJumpHeight as number} secondaryLabel="Modified RSI" secondaryValue={data.cmjModifiedRsi as number} secondaryUnit="" secondaryDecimals={2} date={assessmentDate} />
      } />

      {/* 3. Isometric Mid-Thigh Pull (Vald) */}
      <TestRow num={3} title="Isometric Mid-Thigh Pull" inputs={
        <>
          <FormRow>
            <FormField id="imtpMaxForce" label="Max Force (kg)" type="number" value={data.imtpMaxForce as number} onChange={n('imtpMaxForce')} step={0.1} />
          </FormRow>
          <FormRow>
            <FormField id="imtpLeft" label="Left (kg)" type="number" value={data.imtpLeft as number} onChange={n('imtpLeft')} step={0.1} />
            <FormField id="imtpRight" label="Right (kg)" type="number" value={data.imtpRight as number} onChange={n('imtpRight')} step={0.1} />
          </FormRow>
        </>
      } result={
        <ValdResultCard title="Isometric Mid-Thigh Pull" category="Strength" metric="Max force" unit="kg" isForceDecks showAsymmetryPercent
          left={data.imtpLeft as number} right={data.imtpRight as number} singleValue={data.imtpMaxForce as number} date={assessmentDate} />
      } />

      {/* 4. SL Jump */}
      <TestRow num={4} title="SL Jump" inputs={
        <>
          <FormRow>
            <FormField id="singleLegHopLeft" label="Left Jump Height (cm)" type="number" value={data.singleLegHopLeft as number} onChange={n('singleLegHopLeft')} step={0.1} />
            <FormField id="singleLegHopRight" label="Right Jump Height (cm)" type="number" value={data.singleLegHopRight as number} onChange={n('singleLegHopRight')} step={0.1} />
          </FormRow>
          <FormRow>
            <FormField id="singleLegHopRsiLeft" label="Left Modified RSI" type="number" value={data.singleLegHopRsiLeft as number} onChange={n('singleLegHopRsiLeft')} step={0.01} />
            <FormField id="singleLegHopRsiRight" label="Right Modified RSI" type="number" value={data.singleLegHopRsiRight as number} onChange={n('singleLegHopRsiRight')} step={0.01} />
          </FormRow>
        </>
      } result={
        <ValdResultCard title="SL Jump" category="Jump" metric="Jump height" unit="cm" isForceDecks
          left={data.singleLegHopLeft as number} right={data.singleLegHopRight as number}
          secondaryLeft={data.singleLegHopRsiLeft as number} secondaryRight={data.singleLegHopRsiRight as number} secondaryMetric="Modified RSI" secondaryDecimals={2} date={assessmentDate} />
      } />

      {/* 5. Single Leg Balance Test (Vald) */}
      <TestRow num={5} title="Single Leg Balance Test" inputs={
        <FormRow>
          <FormField id="singleLegBalanceLeft" label="Left - Min Balance Area (mm²)" type="number" value={data.singleLegBalanceLeft as number} onChange={n('singleLegBalanceLeft')} step={1} />
          <FormField id="singleLegBalanceRight" label="Right - Min Balance Area (mm²)" type="number" value={data.singleLegBalanceRight as number} onChange={n('singleLegBalanceRight')} step={1} />
        </FormRow>
      } result={
        <ValdResultCard title="Single Leg Balance" category="Balance" metric="Min balance area" subtitle="30s Exercise Length" unit="mm²" isForceDecks lowerIsBetter
          left={data.singleLegBalanceLeft as number} right={data.singleLegBalanceRight as number} date={assessmentDate} />
      } />

      {/* 5b. Single Leg Balance - Eyes Closed (Vald force plates, CoP) */}
      <TestRow num={5} title="Single Leg Balance - Eyes Closed (Vald force plates, CoP)" inputs={
        <>
          <p className="text-[11px] text-text-faint leading-snug">
            CoP movement in mm. ML = medial/lateral (side to side). AP = anterior/posterior (front to back). Lower is better.
          </p>
          <FormRow>
            <FormField id="singleLegBalanceEyesClosedLeftMl" label="Left - ML (mm)" type="number" value={data.singleLegBalanceEyesClosedLeftMl as number} onChange={n('singleLegBalanceEyesClosedLeftMl')} step={1} />
            <FormField id="singleLegBalanceEyesClosedLeftAp" label="Left - AP (mm)" type="number" value={data.singleLegBalanceEyesClosedLeftAp as number} onChange={n('singleLegBalanceEyesClosedLeftAp')} step={1} />
          </FormRow>
          <FormRow>
            <FormField id="singleLegBalanceEyesClosedRightMl" label="Right - ML (mm)" type="number" value={data.singleLegBalanceEyesClosedRightMl as number} onChange={n('singleLegBalanceEyesClosedRightMl')} step={1} />
            <FormField id="singleLegBalanceEyesClosedRightAp" label="Right - AP (mm)" type="number" value={data.singleLegBalanceEyesClosedRightAp as number} onChange={n('singleLegBalanceEyesClosedRightAp')} step={1} />
          </FormRow>
        </>
      } result={
        <ValdResultCard title="Single Leg Balance EC" category="Balance" metric="CoP - ML" subtitle="Eyes closed" unit="mm" isForceDecks lowerIsBetter
          left={data.singleLegBalanceEyesClosedLeftMl as number} right={data.singleLegBalanceEyesClosedRightMl as number}
          secondaryLeft={data.singleLegBalanceEyesClosedLeftAp as number} secondaryRight={data.singleLegBalanceEyesClosedRightAp as number} secondaryMetric="CoP - AP" date={assessmentDate} />
      } />

      {/* 6. Shoulder Iso-Y (Vald) */}
      <TestRow num={6} title="Shoulder Iso-Y" inputs={
        <FormRow>
          <FormField id="shoulderIsoYLeft" label="Left Max Force (kg)" type="number" value={data.shoulderIsoYLeft as number} onChange={n('shoulderIsoYLeft')} step={0.1} />
          <FormField id="shoulderIsoYRight" label="Right Max Force (kg)" type="number" value={data.shoulderIsoYRight as number} onChange={n('shoulderIsoYRight')} step={0.1} />
        </FormRow>
      } result={
        <ValdResultCard title="Shoulder ISO-Y" category="Strength" metric="Max force" unit="kg" isForceDecks
          left={data.shoulderIsoYLeft as number} right={data.shoulderIsoYRight as number} date={assessmentDate} />
      } />

      {/* 7. Push-Up Max Rep */}
      <TestRow num={7} title="Push-Up Max Rep Test" inputs={
        <FormRow>
          <FormField id="pushupsMax" label="Max Repetitions" type="number" value={data.pushupsMax as number} onChange={n('pushupsMax')} />
          <div />
        </FormRow>
      } result={
        <ValdResultCard title="Push-Up Max Rep" category="Strength" metric="Max repetitions" unit="reps"
          singleValue={data.pushupsMax as number} date={assessmentDate} />
      } />

      {/* 8. Dead Man Hang */}
      <TestRow num={8} title="Dead Man Hang Test" inputs={
        <FormRow>
          <FormField id="deadManHang" label="Time (seconds)" type="number" value={data.deadManHang as number} onChange={n('deadManHang')} step={0.1} />
          <div />
        </FormRow>
      } result={
        <ValdResultCard title="Dead Man Hang" category="Strength" metric="Hang time" unit="sec"
          singleValue={data.deadManHang as number} date={assessmentDate} />
      } />

      {/* 9. Farmers Carry (Bodyweight) */}
      <TestRow num={9} title="Farmers Carry" inputs={
        <FormRow>
          <FormField id="farmersCarryWeight" label="Weight (kg)" type="number" value={data.farmersCarryWeight as number} onChange={n('farmersCarryWeight')} step={0.5} />
          <FormField id="farmersCarryDistance" label="Distance (m)" type="number" value={data.farmersCarryDistance as number} onChange={n('farmersCarryDistance')} step={0.1} />
        </FormRow>
      } result={
        <ValdResultCard title="Farmers Carry" category="Strength" metric="Distance" subtitle="Bodyweight" unit="m"
          singleValue={data.farmersCarryDistance as number} secondaryLabel="Load" secondaryValue={data.farmersCarryWeight as number} secondaryUnit="kg" date={assessmentDate} />
      } />

      <CustomMarkersBlock section={8} data={data} onChange={onChange} />
    </div>
  );
}
