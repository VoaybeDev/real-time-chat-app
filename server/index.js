// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

const app = express();

// -------- utils
const parseOrigins = (originsStr) => {
  if (!originsStr) return [];
  return originsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, "")); // <-- enlève slash final
};

const allowedOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  "http://localhost:3000",
];

// -------- middlewares
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // curl/postman
      const cleaned = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(cleaned)) return callback(null, true);

      return callback(
        new Error(
          `CORS blocked for origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`
        )
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------- health
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "chat-api" });
});

// -------- routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// -------- error handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err?.stack || err);
  res.status(500).json({ message: err?.message || "Server error" });
});

// -------- server + socket
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"],
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinRoom", (roomId) => socket.join(roomId));

  socket.on("sendMessage", (payload) => {
    if (payload?.roomId) io.to(payload.roomId).emit("newMessage", payload);
  });

  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

// -------- mongo + start
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI manquant dans les variables d'environnement.");
    }

    // IMPORTANT : si Mongo est inaccessible, on veut une erreur CLAIRE, pas un buffering
    mongoose.set("bufferCommands", false);

    mongoose.connection.on("connected", () => console.log("Mongo event: connected ✅"));
    mongoose.connection.on("error", (e) => console.error("Mongo event: error ❌", e));
    mongoose.connection.on("disconnected", () => console.log("Mongo event: disconnected ⚠️"));

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000, // donne une vraie erreur si Atlas est bloqué
    });

    console.log("MongoDB connected ✅");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} ✅`);
      console.log("Allowed origins:", allowedOrigins);
    });
  } catch (e) {
    console.error("Startup error:", e);
    process.exit(1);
  }
})();