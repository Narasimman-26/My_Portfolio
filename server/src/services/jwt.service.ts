import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { TokenPayload, AuthTokens } from '@securechat/shared';

export class JwtService {
  /**
   * Generates a pair of access and refresh tokens for an authenticated user.
   */
  static generateTokens(payload: { uid: string; email: string; username: string }): AuthTokens {
    const accessPayload: TokenPayload = {
      ...payload,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      ...payload,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }

  /**
   * Verifies an access token.
   */
  static verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  }

  /**
   * Verifies a refresh token.
   */
  static verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  }
}
