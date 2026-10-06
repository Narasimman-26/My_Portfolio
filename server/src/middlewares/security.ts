import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/environment';

export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", '*'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const corsSecurity = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps or tools) or matched origins
    if (!origin || env.CLIENT_ORIGIN === '*' || env.CLIENT_ORIGIN.split(',').includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
