// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

// Routes
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

const app = express();

// --------------------
// Utils
// --------------------
const parseOrigins = (originsStr) => {
  if (!originsStr) return [];
  return originsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

// Exemple:
// CLIENT_URL="https://xxx.vercel.app,https://yyy.vercel.app"
const allowedOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  "http://localhost:3000",
];

// --------------------
// Middlewares
// --------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: function (origin, callback) {
      // Autorise les appels sans origin (Postman/curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(
        new Error(
          `CORS blocked for origin: ${origin}. Allowed: ${allowedOrigins.join(
            ", "
          )}`
        )
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------
// Health check
// --------------------
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "chat-api" });
});

// --------------------
// API routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// --------------------
// Error handler
// --------------------
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err?.message || err);
  res.status(500).json({ message: "Server error", error: err?.message });
});

// --------------------
// Server + Socket
// --------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"], // important pour HF / proxies
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  socket.on("sendMessage", (payload) => {
    // payload: { roomId, message }
    if (payload?.roomId) {
      io.to(payload.roomId).emit("newMessage", payload);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// --------------------
// Mongo + Start
// --------------------
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI manquant dans les variables d'environnement.");
    }

    await mongoose.connect(process.env.MONGO_URI);
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