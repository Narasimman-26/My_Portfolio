import {
  CREDIT_CARD_REGEX,
  FORMATTED_CARD_REGEX,
  AADHAAR_REGEX,
  PAN_REGEX,
  OTP_CONTEXT_REGEX,
  PRIVATE_KEY_HEADER_REGEX,
  JWT_TOKEN_REGEX,
  AWS_KEY_REGEX,
  GENERIC_SECRET_REGEX,
  validateLuhn,
  maskSensitive,
  SensitivityCheckResult,
  SensitiveMatch,
} from '@securechat/shared';

export class LocalSensitivityScanner {
  /**
   * Fast, zero-network, on-device heuristic detection for confidential leaks.
   */
  static scan(text: string): SensitivityCheckResult {
    if (!text || text.trim().length === 0) {
      return { isSensitive: false, matches: [], source: 'local_heuristic' };
    }

    const matches: SensitiveMatch[] = [];

    // 1. Credit / Debit Cards (with Luhn validation)
    const cardCandidates = text.match(FORMATTED_CARD_REGEX) || text.match(CREDIT_CARD_REGEX) || [];
    for (const candidate of cardCandidates) {
      if (validateLuhn(candidate)) {
        matches.push({
          category: 'CARD',
          description: 'Payment card number detected',
          matchedPreview: maskSensitive(candidate),
          risk: 'high',
        });
        break;
      }
    }

    // 2. Aadhaar Numbers (12 digits)
    const aadhaarCandidates = text.match(AADHAAR_REGEX) || [];
    if (aadhaarCandidates.length > 0) {
      const first = aadhaarCandidates[0].replace(/[\s-]/g, '');
      if (first.length === 12) {
        matches.push({
          category: 'AADHAAR',
          description: 'Indian Aadhaar identity number detected',
          matchedPreview: `•••• •••• ${first.slice(-4)}`,
          risk: 'high',
        });
      }
    }

    // 3. PAN Card Numbers
    const panCandidates = text.match(PAN_REGEX) || [];
    if (panCandidates.length > 0) {
      matches.push({
        category: 'PAN',
        description: 'Indian Permanent Account Number (PAN) detected',
        matchedPreview: `${panCandidates[0].slice(0, 2)}•••••${panCandidates[0].slice(-1)}`,
        risk: 'medium',
      });
    }

    // 4. Passwords / Secrets / Private Keys / API Keys
    if (PRIVATE_KEY_HEADER_REGEX.test(text)) {
      matches.push({
        category: 'PASSWORD',
        description: 'Cryptographic private key header detected',
        matchedPreview: '-----BEGIN PRIVATE KEY-----',
        risk: 'high',
      });
    } else if (AWS_KEY_REGEX.test(text)) {
      matches.push({
        category: 'PASSWORD',
        description: 'Cloud provider access key (AWS AKIA) detected',
        matchedPreview: 'AKIA••••••••••••••••',
        risk: 'high',
      });
    } else if (JWT_TOKEN_REGEX.test(text)) {
      matches.push({
        category: 'PASSWORD',
        description: 'Authentication bearer / JWT token detected',
        matchedPreview: 'eyJ••••••••••.••••••••••',
        risk: 'high',
      });
    } else if (GENERIC_SECRET_REGEX.test(text)) {
      matches.push({
        category: 'PASSWORD',
        description: 'Explicit password or API key assignment detected',
        matchedPreview: 'password=••••••••',
        risk: 'high',
      });
    }

    // 5. One-Time Passwords (OTP)
    const otpMatch = text.match(OTP_CONTEXT_REGEX);
    if (otpMatch) {
      const code = otpMatch[1];
      matches.push({
        category: 'OTP',
        description: 'One-time verification code (OTP) detected',
        matchedPreview: `Code: ••••${code.slice(-2)}`,
        risk: 'high',
      });
    }

    const isSensitive = matches.length > 0;
    const warningMessage = isSensitive
      ? 'This message appears to contain confidential credentials, identity numbers, or authentication codes.'
      : undefined;

    return {
      isSensitive,
      matches,
      warningMessage,
      source: 'local_heuristic',
    };
  }
}
