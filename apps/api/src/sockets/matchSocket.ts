import { Server, Socket } from 'socket.io';
import { getMatchState } from '../services/eventSyncService.js';

export function setupMatchSockets(io: Server): void {
  const matchNamespace = io.of('/match');

  matchNamespace.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;

    socket.on('joinMatch', ({ matchId }: { matchId: string; role?: string }) => {
      const room = `match:${matchId}`;
      if (currentRoom) {
        socket.leave(currentRoom);
      }

      socket.join(room);
      currentRoom = room;

      // Broadcast spectator count
      const count = matchNamespace.adapter.rooms.get(room)?.size ?? 1;
      matchNamespace.to(room).emit('spectatorCount', { matchId, count });

      // Send latest state to newly connected client
      const state = getMatchState(matchId);
      if (state) {
        socket.emit('matchState', state);
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('match:')) {
          const matchId = room.split(':')[1];
          const remaining = (matchNamespace.adapter.rooms.get(room)?.size ?? 1) - 1;
          matchNamespace.to(room).emit('spectatorCount', {
            matchId,
            count: Math.max(0, remaining),
          });
        }
      }
    });
  });
}
