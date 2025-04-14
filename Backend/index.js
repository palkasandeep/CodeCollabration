import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = new Map(); // To store users in rooms

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentUser = null;

  // User joins a room
  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("user-joined", Array.from(rooms.get(currentRoom) || []));
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(userName);
    io.to(roomId).emit("user-joined", Array.from(rooms.get(roomId)));
  });

  // Real-time code update
  socket.on("Codechange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeupdate", code);
  });

  // Chat message
  socket.on("send-message", (message) => {
    io.to(message.roomId).emit("chat-message", message);
  });

  // Language change event
  socket.on("language-change", ({ roomId, language }) => {
    socket.to(roomId).emit("language-updated", { language });
  });

  // Drawing pad updates
  socket.on("draw", ({ roomId, drawData }) => {
    socket.to(roomId).emit("draw-update", drawData);
  });

  // Typing event
  socket.on("typing", ({ roomId, user }) => {
    socket.to(roomId).emit("user-typing", { user });
  });

  // Disconnect event
  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("user-joined", Array.from(rooms.get(currentRoom) || []));
    }
    console.log("User Disconnected", socket.id);
  });
});

const port = process.env.PORT || 5000;


const __dirname = path.resolve()

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
