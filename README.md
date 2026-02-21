# 💬 ChatApp — Real-Time Messenger MVP

Application de messagerie instantanée complète avec appels audio/vidéo, messages vocaux et partage de fichiers.

> Built by [VoaybeDev](https://github.com/VoaybeDev)

---

## ✨ Fonctionnalités

- 🔐 Authentification JWT (inscription / connexion)
- 💬 Messagerie temps réel (Socket.io)
- 🟢 Statut en ligne / hors ligne en temps réel
- ✍️ Indicateur de frappe
- 🔢 Compteur de messages non lus
- 📞 Appels vocaux (WebRTC)
- 📹 Appels vidéo (WebRTC)
- 🎤 Messages vocaux
- 📎 Partage de fichiers (images, PDF, ZIP, Word, Excel, TXT — max 20MB)
- 📱 Interface responsive (mobile & desktop)
- 🔔 Notifications toast stylées

---

## 🛠️ Stack technique

| Côté | Technologie |
|------|-------------|
| Frontend | React.js, Socket.io-client, WebRTC |
| Backend | Node.js, Express.js, Socket.io |
| Base de données | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |
| Upload | Multer |
| HTTPS mobile | ngrok |

---

## 🚀 Installation

### Prérequis
- Node.js v18+
- MongoDB
- ngrok (pour mobile)

### 1. Cloner le projet
```bash
git clone https://github.com/VoaybeDev/real-time-chat-app.git
cd real-time-chat-app
```

### 2. Configurer le serveur
```bash
cd server
npm install
```

Créer `server/.env` :
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=ton_secret_jwt_tres_long
CLIENT_URL=http://localhost:3000
```

### 3. Configurer le client
```bash
cd client
npm install
```

Créer `client/.env` :
```env
REACT_APP_SERVER_URL=http://localhost:5000
```

---

## ▶️ Lancement

### PC uniquement
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm start
```
Accès : `http://localhost:3000`

### PC + Mobile (même réseau WiFi)
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && HTTPS=true npm start

# Terminal 3 — expose le serveur en HTTPS
ngrok http 5000
```

Mettre à jour `client/.env` avec l'URL ngrok :
```env
REACT_APP_SERVER_URL=https://xxxx.ngrok-free.app
```

Redémarrer le client, puis accéder sur mobile via :
```
https://192.168.0.XXX:3000
```

---

## 📁 Structure du projet
```
real-time-chat-app/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/          # Login, Register
│   │   │   ├── Call/          # CallModal, IncomingCall
│   │   │   ├── Chat/          # ChatLayout, ChatWindow, UserList, MessageBubble
│   │   │   └── UI/            # Toast (notifications)
│   │   ├── context/           # AuthContext, SocketContext
│   │   └── hooks/             # useWebRTC, useVoiceMessage
│   └── .env
└── server/
    ├── models/                # User, Message
    ├── routes/                # auth.js, messages.js
    ├── middleware/            # authMiddleware.js
    ├── uploads/               # audio/, files/
    └── .env
```

---

## 📄 Licence
MIT — © 2025 [VoaybeDev](https://github.com/VoaybeDev)