const express = require("express");
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

dotenv.config();
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server);

const userSocketMap = {};
const PORT = process.env.PORT || 8000;

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        userName: userSocketMap[socketId],
      };
    }
  );
};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    userSocketMap[socket.id] = userName;
    socket.join(roomId);
    
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("user-connected", {
        clients,
        userName,
        socketId: socket.id,
      });
    });

    socket.on("disconnecting", () => {
      const rooms = [...socket.rooms];
      rooms.forEach((roomId) => {
        socket.in(roomId).emit("user-disconnected", {
          socketId: socket.id,
          userName: userSocketMap[socket.id],
        });
      });
      delete userSocketMap[socket.id];
      socket.leave();
    });
  });

  socket.on('change', ({ roomId, code }) => {
    socket.to(roomId).emit('change', { code });
  });

  socket.on("codesync", ({ code, socketId }) => {
    io.to(socketId).emit("change", { code });
  });
});

app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.post("/compile", (req, res) => {
  res.status(200).json({ data: "Compilation endpoint" });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});