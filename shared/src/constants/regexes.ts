/**
 * Regular expressions and validation algorithms for on-device heuristic scanning.
 */

// Credit card number pattern (Visa, MasterCard, Amex, Discover, Diners, JCB)
export const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g;

// Space/hyphen-separated 16 digit cards: "4111 1111 1111 1111" or "4111-1111-1111-1111"
export const FORMATTED_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

// Indian Aadhaar: 12 digits, often formatted as 4-4-4 (e.g., 2345 6789 0123)
export const AADHAAR_REGEX = /\b[2-9]{1}[0-9]{3}[ -]?[0-9]{4}[ -]?[0-9]{4}\b/g;

// Indian PAN Card: 5 uppercase letters, 4 digits, 1 uppercase letter
export const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;

// OTP / Verification Code patterns (e.g., "OTP: 123456", "code is 849201", "verification code 9283")
export const OTP_CONTEXT_REGEX = /(?:otp|code|verification code|one[- ]time password|pin|security code)[\s:=#\-]{1,5}([0-9]{4,8})\b/i;

// Standalone 6-digit OTP when flagged in conversational prompts
export const STANDALONE_OTP_REGEX = /\b\d{6}\b/g;

// Passwords & API Tokens
export const PRIVATE_KEY_HEADER_REGEX = /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i;
export const JWT_TOKEN_REGEX = /\beyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\b/g;
export const AWS_KEY_REGEX = /\b(?:AKIA|ABIA|ACCA)[0-9A-Z]{16}\b/g;
export const GENERIC_SECRET_REGEX = /(?:password|passwd|pwd|secret|api[_-]?key|auth[_-]?token|bearer)\s*[:=]\s*['"]?([^\s'";]+)/i;

/**
 * Validates a number string using the Luhn Algorithm (Mod 10).
 */
export function validateLuhn(numberString: string): boolean {
  const sanitized = numberString.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Mask sensitive numbers for UI preview (e.g. "•••• •••• •••• 1234").
 */
export function maskSensitive(text: string): string {
  const clean = text.replace(/[\s-]/g, '');
  if (clean.length <= 4) return '••••';
  const last4 = clean.slice(-4);
  return '•••• '.repeat(Math.max(1, Math.floor((clean.length - 4) / 4))) + last4;
}
