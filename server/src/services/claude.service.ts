import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/environment';
import { DeepCheckResponse, SensitivityCategory } from '@securechat/shared';

let anthropicClient: Anthropic | null = null;

if (env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });
}

export class ClaudeService {
  /**
   * Evaluates text for confidentiality risk using Anthropic Claude.
   * STRICT ZERO-RETENTION POLICY:
   * - Ephemeral evaluation only.
   * - Never logged, never written to disk or database.
   */
  static async checkSensitivity(text: string): Promise<DeepCheckResponse> {
    if (!text || text.trim().length === 0) {
      return {
        isSensitive: false,
        risk: 'none',
        confidence: 1.0,
      };
    }

    if (!anthropicClient) {
      // Fallback analysis if API key is not configured in local environment
      return this.fallbackAnalysis(text);
    }

    try {
      const response = await anthropicClient.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 250,
        temperature: 0,
        system: `You are a high-speed security filter analyzing message text for confidential leaks before transmission.
Analyze if the text contains sensitive credentials, authentication codes, or high-risk identifiers:
1. CARD: Credit or debit card numbers, CVVs
2. AADHAAR: 12-digit Indian national identity numbers
3. PAN: 10-character Indian Permanent Account Numbers
4. PASSWORD: Passwords, private keys, API tokens, bearer tokens, connection strings
5. OTP: One-time passwords, 2FA verification codes
6. PII: Sensitive personally identifiable information (SSN, passport, personal secret)

You must respond ONLY with a valid JSON object matching this schema:
{
  "isSensitive": boolean,
  "category": "CARD" | "AADHAAR" | "PAN" | "PASSWORD" | "OTP" | "PII" | null,
  "risk": "none" | "low" | "medium" | "high",
  "explanation": "Short 1-sentence warning for user without echoing the secret",
  "confidence": number between 0.0 and 1.0
}
DO NOT quote or echo the sensitive values in your explanation.`,
        messages: [
          {
            role: 'user',
            content: `Analyze this draft message for sensitivity:\n"""\n${text}\n"""`,
          },
        ],
      });

      const messageContent = response.content[0];
      if (messageContent.type === 'text') {
        const jsonMatch = messageContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            isSensitive: Boolean(parsed.isSensitive),
            category: parsed.category as SensitivityCategory | undefined,
            risk: parsed.risk || (parsed.isSensitive ? 'high' : 'none'),
            explanation: parsed.explanation || (parsed.isSensitive ? 'This draft contains sensitive credentials or personal data.' : undefined),
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          };
        }
      }

      return {
        isSensitive: false,
        risk: 'none',
        confidence: 0.5,
      };
    } catch (error) {
      console.error('Claude API sensitivity check failed, using fallback:', error instanceof Error ? error.message : error);
      return this.fallbackAnalysis(text);
    }
  }

  /**
   * Fallback heuristic analysis if Claude API is not configured or network fails.
   */
  private static fallbackAnalysis(text: string): DeepCheckResponse {
    // Quick keyword & structure checks
    const lower = text.toLowerCase();
    if (/(password|passwd|secret_key|api_key|bearer\s+[a-zA-Z0-9_\-\.]+)/i.test(lower)) {
      return {
        isSensitive: true,
        category: 'PASSWORD',
        risk: 'high',
        explanation: 'Potential password or API key detected.',
        confidence: 0.85,
      };
    }
    if (/(otp|verification code|pin\s+code)[\s:=]*\d{4,8}/i.test(lower)) {
      return {
        isSensitive: true,
        category: 'OTP',
        risk: 'high',
        explanation: 'Verification code or OTP detected.',
        confidence: 0.9,
      };
    }

    return {
      isSensitive: false,
      risk: 'none',
      confidence: 0.7,
    };
  }
}
