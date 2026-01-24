import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId; // 存储房间 ID 到 socket 对象中
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // 转发绘图数据
  socket.on('draw', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('draw', { ...data, userId: socket.id });
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
    }
  });

  // 转发撤销/重做
  socket.on('history-sync', (data) => {
    const roomId = data.roomId || socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('history-sync', data.dataUrl);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('user-disconnected', socket.id);
    } else {
      io.emit('user-disconnected', socket.id);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on http://localhost:${PORT}`);
});
