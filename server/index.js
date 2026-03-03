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

/* ===============================
   ORIGIN CHECKER (wildcard vercel.app)
================================ */
const normalize = (v = "") => String(v).trim().replace(/\/+$/, "");

const parseOrigins = (str) => {
  if (!str) return [];
  return str
    .split(/[\s,]+/g)
    .map(normalize)
    .filter(Boolean);
};

const staticOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  "http://localhost:3000",
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleaned = normalize(origin);
  // Accepte toutes les URLs *.vercel.app et les origines statiques
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(cleaned)) return true;
  return staticOrigins.includes(cleaned);
};

console.log("===== Application Startup at", new Date().toISOString(), "=====");
console.log("Static allowed origins:", staticOrigins);

/* ===============================
   MIDDLEWARES
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.error("CORS blocked:", origin);
    return callback(new Error("CORS bloqué pour origin: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ===============================
   ROUTES
================================ */
app.get("/", (req, res) => {
  res.json({ status: "API en ligne ✅" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);
  res.status(500).json({ message: err.message });
});

/* ===============================
   SERVER + SOCKET
================================ */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Socket CORS bloqué: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"],
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinRoom", (roomId) => socket.join(roomId));

  socket.on("sendMessage", (payload) => {
    if (payload?.roomId) {
      io.to(payload.roomId).emit("newMessage", payload);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ===============================
   MONGO + START
================================ */
const PORT = process.env.PORT || 7860;

(async () => {
  try {
    if (!process.env.MONGO_URI)
      throw new Error("MONGO_URI manquant");

    mongoose.set("bufferCommands", false);

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connecté ✅");

    server.listen(PORT, () => {
      console.log("🚀 Serveur démarré sur le port", PORT);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();