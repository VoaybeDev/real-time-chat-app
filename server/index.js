// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const Message = require("./models/Message");

const app = express();

console.log("===== Application Startup at", new Date().toISOString(), "=====");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors({ origin: true, credentials: true }));

app.get("/", (req, res) => res.json({ status: "API en ligne ✅" }));
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/uploads", express.static("uploads"));

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);
  res.status(500).json({ message: err.message });
});

const server = http.createServer(app);

// Map userId → socketId
const onlineUsers = new Map();

const io = new Server(server, {
  cors: { origin: true, credentials: true },
  transports: ["polling", "websocket"],
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // User signals online
  socket.on("user:online", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.broadcast.emit("user:connected", userId);
    socket.emit("users:online", Array.from(onlineUsers.keys()));
    console.log("User online:", userId, "| Total:", onlineUsers.size);
  });

  socket.on("joinRoom", (roomId) => socket.join(roomId));

  // ── MESSAGE TEXTE (sauvegarde en DB + emit aux 2 parties) ──
  socket.on("message:send", async ({ receiverId, content, type = "text" }) => {
    try {
      if (!socket.userId || !receiverId || !content) return;

      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        content,
        type,
      });

      await message.populate("sender", "username avatar");
      await message.populate("receiver", "username avatar");

      const msgData = message.toObject();

      // Envoyer à l'expéditeur
      socket.emit("message:sent", msgData);

      // Envoyer au destinataire s'il est connecté
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message:receive", msgData);
      }
    } catch (err) {
      console.error("message:send error:", err);
      socket.emit("message:error", { error: err.message });
    }
  });

  // ── MESSAGE FORWARD (pour fichiers/audio déjà créés en DB) ──
  socket.on("message:forward", (message) => {
    if (!message?.receiver) return;
    const receiverId = message.receiver?._id || message.receiver;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message:receive", message);
    }
  });

  // Typing indicators
  socket.on("typing:start", ({ receiverId }) => {
    const targetSocketId = onlineUsers.get(receiverId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("typing:start", { userId: socket.userId });
    }
  });

  socket.on("typing:stop", ({ receiverId }) => {
    const targetSocketId = onlineUsers.get(receiverId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("typing:stop", { userId: socket.userId });
    }
  });

  // WebRTC signaling
  socket.on("call:initiate", ({ receiverId: targetUserId, callType, offer }) => {
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:incoming", {
        callerId: socket.userId,
        callType,
        offer,
      });
    } else {
      socket.emit("call:unavailable");
    }
  });

  socket.on("call:answer", ({ callerId, answer }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:answered", { answer });
    }
  });

  socket.on("call:ice-candidate", ({ targetId: targetUserId, candidate }) => {
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ice-candidate", { candidate });
    }
  });

  socket.on("call:end", ({ targetId: targetUserId }) => {
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ended");
    }
  });

  socket.on("call:reject", ({ callerId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:rejected");
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user:disconnected", socket.userId);
      console.log("User offline:", socket.userId, "| Total:", onlineUsers.size);
    }
  });
});

const PORT = process.env.PORT || 7860;

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI manquant");
    mongoose.set("bufferCommands", false);
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("MongoDB connecté ✅");
    server.listen(PORT, () => console.log("🚀 Serveur démarré sur le port", PORT));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
