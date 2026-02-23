const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const Message = require("./models/Message");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

/**
 * ========= CORS ORIGINS =========
 * En prod: CLIENT_URL = https://ton-frontend.vercel.app
 * En local: http://localhost:3000
 */
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Autorise les requêtes sans origin (Postman / curl)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqué pour origin: ${origin}`));
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * ========= UPLOADS =========
 * Railway: système de fichiers potentiellement éphémère, ok pour MVP.
 * Tu peux rediriger via UPLOAD_DIR plus tard.
 */
const baseUploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "uploads");

const uploadsAudio = path.join(baseUploadDir, "audio");
const uploadsFiles = path.join(baseUploadDir, "files");

if (!fs.existsSync(uploadsAudio)) fs.mkdirSync(uploadsAudio, { recursive: true });
if (!fs.existsSync(uploadsFiles)) fs.mkdirSync(uploadsFiles, { recursive: true });

app.use("/uploads", express.static(baseUploadDir));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/messages", require("./routes/messages"));

/**
 * ========= SOCKET.IO =========
 */
const io = new Server(server, {
  cors: corsOptions,
});

/**
 * ========= DB =========
 */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ MongoDB erreur:", err));

const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Non autorisé"));
  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = userId;
    next();
  } catch {
    next(new Error("Token invalide"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log("✅ Socket connecté:", userId);

  onlineUsers.set(userId, socket.id);

  try {
    await User.findByIdAndUpdate(userId, { isOnline: true });
  } catch (e) {
    console.error("❌ Update online error:", e?.message || e);
  }

  io.emit("users:online", Array.from(onlineUsers.keys()));

  socket.on("message:send", async ({ receiverId, content, type, audioUrl }) => {
    try {
      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        content: content || "",
        type: type || "text",
        audioUrl: audioUrl || null,
      });

      await message.populate("sender", "username avatar");

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("message:receive", message);

      socket.emit("message:sent", message);
    } catch (err) {
      console.error("❌ message:send error:", err?.message || err);
      socket.emit("error", { message: "Erreur envoi message" });
    }
  });

  socket.on("message:forward", (message) => {
    const receiverId =
      message.receiver && message.receiver._id
        ? String(message.receiver._id)
        : String(message.receiver);

    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("message:receive", message);

    socket.emit("message:sent", message);
  });

  socket.on("typing:start", ({ receiverId }) => {
    const s = onlineUsers.get(receiverId);
    if (s) io.to(s).emit("typing:start", { userId });
  });

  socket.on("typing:stop", ({ receiverId }) => {
    const s = onlineUsers.get(receiverId);
    if (s) io.to(s).emit("typing:stop", { userId });
  });

  socket.on("call:initiate", ({ receiverId, callType, offer }) => {
    const s = onlineUsers.get(receiverId);
    if (s) io.to(s).emit("call:incoming", { callerId: userId, callType, offer });
    else socket.emit("call:unavailable", { receiverId });
  });

  socket.on("call:answer", ({ callerId, answer }) => {
    const s = onlineUsers.get(callerId);
    if (s) io.to(s).emit("call:answered", { answer });
  });

  socket.on("call:reject", ({ callerId }) => {
    const s = onlineUsers.get(callerId);
    if (s) io.to(s).emit("call:rejected");
  });

  socket.on("call:ice-candidate", ({ targetId, candidate }) => {
    const s = onlineUsers.get(targetId);
    if (s) io.to(s).emit("call:ice-candidate", { candidate });
  });

  socket.on("call:end", ({ targetId }) => {
    const s = onlineUsers.get(targetId);
    if (s) io.to(s).emit("call:ended");
  });

  socket.on("disconnect", async () => {
    console.log("❌ Socket déconnecté:", userId);

    onlineUsers.delete(userId);

    try {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    } catch (e) {
      console.error("❌ Update offline error:", e?.message || e);
    }

    io.emit("users:online", Array.from(onlineUsers.keys()));
  });
});

/**
 * ========= START =========
 */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log("✅ Allowed origins:", allowedOrigins);
});