import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { setupMatchSockets } from './sockets/matchSocket.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupMatchSockets(io);

server.listen(env.PORT, () => {
  console.log(`🚀 RallyPoint API & Socket server listening on port ${env.PORT}`);
  console.log(`📑 OpenAPI Documentation available at http://localhost:${env.PORT}/api/docs`);
});

export { server, io };
