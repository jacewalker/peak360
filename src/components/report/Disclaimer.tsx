'use client';

export function Disclaimer() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-[11px] leading-relaxed text-gray-600">
      <p className="font-semibold text-gray-700 mb-1">Medical Disclaimer</p>
      <p>
        This report is generated for informational and educational purposes only.
        It does not constitute medical advice, diagnosis, or treatment. Normative
        ranges are based on published clinical reference data for the general adult
        population and may not reflect individual health circumstances. All results
        should be reviewed in consultation with a qualified healthcare professional.
        If any markers are flagged as critically out of range, seek prompt medical advice.
      </p>
      <p className="mt-1.5 text-[10px] text-gray-500 italic">
        Normative ranges are based on biological sex reference data.
      </p>
    </div>
  );
}
