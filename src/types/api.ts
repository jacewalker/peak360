export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ExtractionResult {
  fields: Record<string, {
    value: number | string;
    unit?: string;
    rawText?: string;
  }>;
  unmapped: string[];
}

export interface VerificationResult {
  fields: Record<string, {
    value: number | string;
    confidence: 'high' | 'medium' | 'low';
    notes?: string;
    suggested?: number | string;
  }>;
  overallConfidence: 'high' | 'medium' | 'low';
}
