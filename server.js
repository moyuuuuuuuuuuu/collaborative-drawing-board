import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 存储每个房间的路径数据
const roomPaths = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId; // 存储房间 ID 到 socket 对象中
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // 如果房间已有路径数据，发送给新加入的用户
    if (roomPaths.has(roomId)) {
      socket.emit('history-sync', { paths: roomPaths.get(roomId) });
    }
  });

  // 转发绘图数据并更新房间状态
  socket.on('draw', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('draw', { ...data, userId: socket.id });

      // 更新服务器端的路径缓存
      if (!roomPaths.has(roomId)) {
        roomPaths.set(roomId, []);
      }
      const paths = roomPaths.get(roomId);
      let path = paths.find(p => p.id === data.pathId);
      if (!path) {
        path = {
          id: data.pathId,
          userId: data.userId || socket.id,
          points: [{ x: data.lastX, y: data.lastY }],
          color: data.color,
          lineWidth: data.lineWidth,
          tool: data.tool
        };
        paths.push(path);
      }
      path.points.push({ x: data.x, y: data.y });
    }
  });

  // 转发鼠标移动
  socket.on('mouse-move', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('mouse-move', { ...data, userId: socket.id });
    }
  });

  // 转发清除画布
  socket.on('clear', (roomId) => {
    const targetRoom = roomId || socket.data.roomId;
    if (targetRoom) {
      socket.to(targetRoom).emit('clear');
      roomPaths.delete(targetRoom);
    }
  });

  // 转发撤销/重做（通常是完整的 paths 同步）
  socket.on('history-sync', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('history-sync', data);
      // 更新服务器端的完整状态
      if (data.paths) {
        roomPaths.set(roomId, data.paths);
      }
    }
  });

  // 转发绘图结束
  socket.on('draw-end', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('draw-end', { userId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('user-disconnected', socket.id);

      // 如果房间里没有人了，清理该房间的数据
      const room = io.sockets.adapter.rooms.get(roomId);
      if (!room || room.size === 0) {
        roomPaths.delete(roomId);
        console.log(`Room ${roomId} is empty, data cleared.`);
      }
    } else {
      io.emit('user-disconnected', socket.id);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on http://localhost:${PORT}`);
});
