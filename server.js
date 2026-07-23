const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  // Join / Create Room Handler
  socket.on("join_room", ({ code, name, isHost }) => {
    const cleanCode = (code || "").trim().toUpperCase();
    let room = rooms.get(cleanCode);

    if (!room && isHost) {
      room = {
        code: cleanCode,
        hostId: socket.id,
        players: [],
        currentHolderId: null,
        currentQuestion: "5 + 7",
        currentAnswer: 12,
        pctLeft: 1.0,
      };
      rooms.set(cleanCode, room);
    }

    if (room) {
      socket.join(cleanCode);
      const existingPlayer = room.players.find((p) => p.id === socket.id);
      if (!existingPlayer) {
        room.players.push({
          id: socket.id,
          name: name || `Player ${room.players.length + 1}`,
          isReady: isHost,
        });
      }
      io.to(cleanCode).emit("room_updated", room);
      socket.emit("room_joined", { room, player: { id: socket.id, name } });
    } else {
      socket.emit("error_message", "Room not found");
    }
  });

  // Ready State Handler
  socket.on("toggle_ready", ({ code, isReady }) => {
    const cleanCode = (code || "").trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.isReady = isReady;
      io.to(cleanCode).emit("room_updated", room);
    }
  });

  // Start Game Handler
  socket.on("start_game", ({ code }) => {
    const cleanCode = (code || "").trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) return;

    room.currentHolderId = room.players[0]?.id;
    io.to(cleanCode).emit("game_started", room);
  });

  // Answer Submission Handler
  socket.on("submit_answer", ({ code, answer }) => {
    const cleanCode = (code || "").trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) return;

    const numAnswer = parseInt(answer, 10);
    const isCorrect = numAnswer === room.currentAnswer;

    if (isCorrect && room.currentHolderId === socket.id) {
      // Pass bomb to next player
      const currentIndex = room.players.findIndex((p) => p.id === socket.id);
      const nextIndex = (currentIndex + 1) % room.players.length;
      room.currentHolderId = room.players[nextIndex].id;

      // Generate next random math question
      const a = Math.floor(Math.random() * 12) + 1;
      const b = Math.floor(Math.random() * 12) + 1;
      room.currentQuestion = `${a} + ${b}`;
      room.currentAnswer = a + b;

      io.to(cleanCode).emit("answer_result", { success: true, passerId: socket.id });
      io.to(cleanCode).emit("room_updated", room);
    } else {
      socket.emit("answer_result", { success: false });
    }
  });

  socket.on("disconnect", () => {
    // Clean up room players on disconnect
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
