import { Socket } from 'socket.io';
import { JwtService } from '../services/jwt.service';
import { SocketData } from '@securechat/shared';

export function socketAuthMiddleware(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
): void {
  try {
    const auth = socket.handshake.auth;
    const headers = socket.handshake.headers;

    let token = auth?.token;

    if (!token && headers.authorization) {
      const parts = headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication failed: Missing token'));
    }

    const payload = JwtService.verifyAccessToken(token);

    socket.data.user = {
      uid: payload.uid,
      email: payload.email,
      username: payload.username,
    };

    next();
  } catch (error) {
    next(new Error('Authentication failed: Invalid or expired token'));
  }
}
