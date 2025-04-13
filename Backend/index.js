import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Setup for __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Create HTTP server and bind Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store room data
const roomData = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      updateRoomData(currentRoom, currentUser, 'leave');
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    if (!roomData.has(roomId)) {
      roomData.set(roomId, {
        users: new Set(),
        code: '',
        language: 'javascript'
      });
    }

    const room = roomData.get(roomId);
    room.users.add(userName);

    socket.emit("codeupdate", room.code);
    io.to(roomId).emit("user-joined", Array.from(room.users));
  });

  socket.on("Codechange", ({ roomId, code }) => {
    if (roomData.has(roomId)) {
      roomData.get(roomId).code = code;
      socket.to(roomId).emit("codeupdate", code);
    }
  });

  socket.on("send-message", (message) => {
    io.to(message.roomId).emit("chat-message", message);
  });

  socket.on("typing", ({ roomId, user }) => {
    socket.to(roomId).emit("user-typing", { user });
  });

  socket.on("leaveRoom", ({ roomId, userName }) => {
    updateRoomData(roomId, userName, 'leave');
    socket.leave(roomId);
    io.to(roomId).emit("user-joined", Array.from(roomData.get(roomId)?.users || []));
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      updateRoomData(currentRoom, currentUser, 'leave');
      io.to(currentRoom).emit("user-joined", Array.from(roomData.get(currentRoom)?.users || []));
    }
    console.log(`User disconnected: ${socket.id}`);
  });

  function updateRoomData(roomId, user, action) {
    if (roomData.has(roomId)) {
      const room = roomData.get(roomId);
      action === 'join' ? room.users.add(user) : room.users.delete(user);

      if (room.users.size === 0) {
        roomData.delete(roomId);
      }
    }
  }
});

// Serve frontend files
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
