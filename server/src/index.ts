import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/environment';
import { helmetSecurity, corsSecurity } from './middlewares/security';
import { globalLimiter } from './middlewares/rateLimiter';
import apiRoutes from './routes';
import { socketAuthMiddleware } from './sockets/socketAuth';
import { registerChatSocketHandlers } from './sockets/chatSocketHandler';
import { CleanupService } from './services/cleanup.service';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '@securechat/shared';

const app = express();
const server = http.createServer(app);

// Security Middlewares
app.use(helmetSecurity);
app.use(corsSecurity);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Rate Limiter
app.use(globalLimiter);

// Mount API Routes
app.use('/api', apiRoutes);

// Socket.IO Setup
const io = new Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>(server, {
  cors: {
    origin: env.CLIENT_ORIGIN === '*' ? '*' : env.CLIENT_ORIGIN.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// Guard all socket handshakes with JWT verification
io.use(socketAuthMiddleware);

// Handle socket connections
io.on('connection', (socket) => {
  registerChatSocketHandlers(io, socket);
});

// Start background disappearing message cleanup
CleanupService.startCleanupJob(60000);

// Start Server
const PORT = env.PORT;
server.listen(PORT, () => {
  console.log(`🛡️ SecureChat Backend running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 Socket.IO server mounted and listening for secure connections`);
});

// Graceful Shutdown
function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  CleanupService.stopCleanupJob();
  io.close(() => {
    server.close(() => {
      console.log('Server and sockets closed.');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, io };
