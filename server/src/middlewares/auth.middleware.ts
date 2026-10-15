import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { AuthenticatedUser } from '@securechat/shared';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or malformed Authorization header',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = JwtService.verifyAccessToken(token);
    req.user = {
      uid: payload.uid,
      email: payload.email,
      username: payload.username,
    };
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
    });
    return;
  }
}
