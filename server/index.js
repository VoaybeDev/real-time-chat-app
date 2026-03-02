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

/**
 * Nettoie une origin / url (enlève slash final)
 */
const normalizeOrigin = (value = "") => String(value).trim().replace(/\/+$/, "");

/**
 * Parse CLIENT_URL robuste :
 * - accepte virgules, espaces, nouvelles lignes
 * - nettoie les urls (trim + enlève slash final)
 *
 * Exemples valides dans HF Secrets :
 * 1) "https://a.vercel.app,https://b.vercel.app"
 * 2) "https://a.vercel.app https://b.vercel.app"
 * 3) "https://a.vercel.app\nhttps://b.vercel.app"
 */
const parseOrigins = (originsStr) => {
  if (!originsStr) return [];
  return String(originsStr)
    .split(/[\s,]+/g) // <-- important : split sur espaces OU virgules
    .map(normalizeOrigin)
    .filter(Boolean);
};

// --------------------
// Allowed origins
// --------------------
const allowedOrigins = Array.from(
  new Set([
    ...parseOrigins(process.env.CLIENT_URL),
    "http://localhost:3000",
  ])
);

// --------------------
// Middlewares
// --------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS Express (REST)
app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise les appels sans Origin (curl/postman)
      if (!origin) return callback(null, true);

      const cleaned = normalizeOrigin(origin);
      if (allowedOrigins.includes(cleaned)) return callback(null, true);

      return callback(
        new Error(
          `CORS blocked for origin: ${cleaned}. Allowed: ${allowedOrigins.join(
            " | "
          )}`
        )
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Optionnel mais pratique pour les preflight
app.options("*", cors());

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
  console.error("SERVER ERROR:", err?.stack || err);
  res.status(500).json({
    message: err?.message || "Server error",
  });
});

// --------------------
// Server + Socket.io
// --------------------
const server = http.createServer(app);

// CORS Socket.io : même logique que REST (sinon tu auras des 400 sur /socket.io)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleaned = normalizeOrigin(origin);
      if (allowedOrigins.includes(cleaned)) return callback(null, true);

      return callback(new Error(`Socket CORS blocked for origin: ${cleaned}`));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"], // ok pour HF proxies
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    if (roomId) socket.join(roomId);
  });

  socket.on("sendMessage", (payload) => {
    if (payload?.roomId) io.to(payload.roomId).emit("newMessage", payload);
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

    // Si Mongo est inaccessible -> erreur claire (pas buffering)
    mongoose.set("bufferCommands", false);

    mongoose.connection.on("connected", () =>
      console.log("Mongo event: connected ✅")
    );
    mongoose.connection.on("error", (e) =>
      console.error("Mongo event: error ❌", e)
    );
    mongoose.connection.on("disconnected", () =>
      console.log("Mongo event: disconnected ⚠️")
    );

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
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