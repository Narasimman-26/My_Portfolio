export type SensitivityCategory = 
  | 'CARD'
  | 'AADHAAR'
  | 'PAN'
  | 'PASSWORD'
  | 'OTP'
  | 'PII'
  | 'CRYPTO_KEY';

export type SensitivityRiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface SensitiveMatch {
  category: SensitivityCategory;
  description: string;
  matchedPreview: string; // Redacted snippet (e.g. "•••• •••• •••• 1234")
  risk: SensitivityRiskLevel;
}

export interface SensitivityCheckResult {
  isSensitive: boolean;
  matches: SensitiveMatch[];
  warningMessage?: string;
  source: 'local_heuristic' | 'claude_ai';
}

export interface DeepCheckRequest {
  text: string;
}

export interface DeepCheckResponse {
  isSensitive: boolean;
  category?: SensitivityCategory;
  risk: SensitivityRiskLevel;
  explanation?: string;
  confidence: number; // 0.0 - 1.0
}
