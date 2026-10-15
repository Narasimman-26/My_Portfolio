import { Request, Response } from 'express';
import { z } from 'zod';
import { ClaudeService } from '../services/claude.service';

const checkSchema = z.object({
  text: z.string().max(4000),
});

export class AiController {
  /**
   * Consented Deep AI sensitivity check using Claude.
   * STRICT ZERO-RETENTION:
   * - Never logs plaintext or tokens.
   * - Ephemeral classification response only.
   */
  static async checkSensitivity(req: Request, res: Response): Promise<void> {
    const parseResult = checkSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: 'Invalid message payload' });
      return;
    }

    try {
      const { text } = parseResult.data;
      const result = await ClaudeService.checkSensitivity(text);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Do not log the sensitive text under any circumstance
      console.error('Sensitivity check error occurred in AI controller');
      res.status(500).json({
        success: false,
        error: 'Failed to process AI sensitivity inspection',
      });
    }
  }
}
