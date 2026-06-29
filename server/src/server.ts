import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_company', (companyId: string) => {
    socket.join(companyId);
    console.log(`Client ${socket.id} joined company room: ${companyId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Stop the old backend server or set PORT to another value.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error);
  process.exit(1);
});

server.listen(env.PORT, () => {
  console.log(`SkillForge AI Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
});
