import { LocalSensitivityScanner } from '../localScanner';

describe('Local Sensitivity Scanner Suite', () => {
  it('should detect credit card numbers that pass the Luhn algorithm', () => {
    // Valid Visa test card
    const text = 'Here is the payment card 4532 0150 1234 5678 to charge';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(true);
    expect(result.matches.some((m) => m.category === 'CARD')).toBe(true);
    expect(result.matches[0].matchedPreview).toContain('••••');
  });

  it('should not flag random 16 digit numbers that fail the Luhn algorithm', () => {
    const text = 'Order sequence number is 1234567812345670';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.matches.some((m) => m.category === 'CARD')).toBe(false);
  });

  it('should detect 12-digit Indian Aadhaar numbers', () => {
    const text = 'Citizen Aadhaar ID: 3675 9834 6012';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(true);
    expect(result.matches.some((m) => m.category === 'AADHAAR')).toBe(true);
  });

  it('should detect Indian PAN numbers', () => {
    const text = 'Tax identification PAN is ABCDE1234F';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(true);
    expect(result.matches.some((m) => m.category === 'PAN')).toBe(true);
  });

  it('should detect passwords and secrets in text', () => {
    const text = 'The server db password = SuperSecret2026! dont share';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(true);
    expect(result.matches.some((m) => m.category === 'PASSWORD')).toBe(true);
  });

  it('should detect OTP verification codes with context', () => {
    const text = 'Your bank OTP is 738291. Do not share with anyone.';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(true);
    expect(result.matches.some((m) => m.category === 'OTP')).toBe(true);
  });

  it('should return clean result for normal conversational messages', () => {
    const text = 'Hey Alice, are we still meeting for coffee tomorrow morning?';
    const result = LocalSensitivityScanner.scan(text);

    expect(result.isSensitive).toBe(false);
    expect(result.matches.length).toBe(0);
  });
});
