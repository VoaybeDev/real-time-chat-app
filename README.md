# 💬 ChatApp — Real-Time Messenger MVP

Application de messagerie instantanée complète avec appels audio/vidéo, messages vocaux, partage de fichiers, notifications stylées et design gradient.

> Built by [VoaybeDev](https://github.com/VoaybeDev)

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Inscription (username, email, mot de passe)
- Connexion sécurisée via JWT (7 jours)
- Sessions persistantes (localStorage)
- Protection des routes React et des connexions Socket.io

### 💬 Messagerie temps réel
- Messages texte instantanés via Socket.io
- Indicateur de frappe animé
- Statut en ligne / hors ligne en temps réel
- Historique des conversations persisté en MongoDB
- Messages marqués comme lus à l'ouverture
- Badge de messages non lus avec compteur
- Aperçu du dernier message dans la sidebar avec horodatage
- Fond différencié pour les conversations avec messages non lus

### 🎤 Messages vocaux
- Enregistrement audio directement dans l'app
- Compteur de durée en temps réel
- Aperçu avant envoi avec lecteur audio
- Détection automatique du format (WebM, OGG, MP4)
- Compatible Chrome, Firefox et Safari mobile

### 📎 Partage de fichiers
- Images : JPG, PNG, GIF, WEBP, BMP, SVG, TIFF, HEIC, AVIF...
- Documents : PDF, Word, Excel, PowerPoint
- Archives : ZIP, RAR, 7Z
- Texte : TXT, Markdown
- Taille max : 20 MB
- Aperçu intégré pour les images (blob URL pour compatibilité ngrok)
- Icône et taille affichées pour les fichiers
- Téléchargement direct

### 📞 Appels audio/vidéo (WebRTC)
- Appels vocaux peer-to-peer
- Appels vidéo peer-to-peer
- Contrôles micro et caméra
- Notification d'appel entrant stylée
- Gestion refus, fin d'appel et indisponibilité

### 🔔 Notifications Toast
- Toasts stylés avec gradient pour tous les événements
- Types : succes, erreur, avertissement, info, appel
- Remplacement complet des alert() natifs
- Animation fluide, auto-fermeture après 4 secondes

### 🎨 Design
- Thème violet/indigo avec degrades CSS (textes + backgrounds)
- Signature cliquable en bas de sidebar vers profil GitHub
- Interface inspirée WhatsApp/Messenger
- Bulles de messages avec gradient pour l'expéditeur
- Animations de chargement pour les images

### 📱 Responsive Mobile
- Sidebar plein écran sur mobile avec animation slide
- Bouton retour dans la conversation
- Compatibilite touch complete (onPointerDown)
- Hauteur dynamique (100dvh)
- Boutons minimum 42px pour le tactile

---

## 🛠️ Stack technique

| Cote | Technologie |
|------|-------------|
| Frontend | React.js 18 |
| Temps réel client | Socket.io-client 4 |
| Appels | WebRTC natif (STUN Google) |
| Requetes HTTP | Axios |
| Backend | Node.js + Express.js |
| Temps réel serveur | Socket.io 4 |
| Base de données | MongoDB 8.0 (Mongoose) |
| Authentification | JWT + bcryptjs |
| Upload fichiers | Multer |
| HTTPS dev mobile | ngrok |

---

## 📁 Structure du projet

```
real-time-chat-app/
│
├── client/
│   └── src/
│       ├── components/
│       │   ├── Auth/
│       │   │   ├── Login.js
│       │   │   ├── Register.js
│       │   │   └── Auth.css
│       │   ├── Call/
│       │   │   ├── CallModal.js        # Interface appel actif
│       │   │   ├── IncomingCall.js     # Notification appel entrant
│       │   │   └── Call.css
│       │   ├── Chat/
│       │   │   ├── ChatLayout.js       # Layout principal + gestion etat global
│       │   │   ├── ChatWindow.js       # Fenetre conversation + upload fichiers
│       │   │   ├── UserList.js         # Sidebar : liste + badges non lus
│       │   │   ├── MessageBubble.js    # Rendu text/vocal/image/fichier
│       │   │   └── Chat.css            # Styles globaux + gradient
│       │   └── UI/
│       │       ├── Toast.js            # Systeme de notifications
│       │       └── Toast.css
│       ├── context/
│       │   ├── AuthContext.js          # JWT, axios defaults, login/logout
│       │   └── SocketContext.js        # Connexion socket + onlineUsers
│       ├── hooks/
│       │   ├── useWebRTC.js            # RTCPeerConnection, ICE, signaling
│       │   └── useVoiceMessage.js      # MediaRecorder, blob, duree
│       ├── App.js
│       └── index.css
│
└── server/
    ├── middleware/
    │   └── authMiddleware.js           # Verification JWT
    ├── models/
    │   ├── User.js                     # Schema utilisateur
    │   └── Message.js                  # Schema message (text/voice/image/file)
    ├── routes/
    │   ├── auth.js                     # Register, Login, /me, /users
    │   └── messages.js                 # Historique + upload voice/file
    ├── uploads/
    │   ├── audio/                      # Fichiers vocaux (.webm)
    │   └── files/                      # Images et documents
    ├── index.js                        # Express + Socket.io + WebRTC signaling
    ├── .env
    └── package.json
```

---

## 🚀 Installation

### Prerequis
- Node.js v18+
- MongoDB 8.0
- ngrok (pour acces mobile)

### 1. Cloner
```bash
git clone https://github.com/VoaybeDev/real-time-chat-app.git
cd real-time-chat-app
```

### 2. Serveur
```bash
cd server && npm install
```

Creer `server/.env` :
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=change_moi_avec_une_longue_chaine_aleatoire
CLIENT_URL=http://localhost:3000
```

### 3. Client
```bash
cd ../client && npm install
```

Creer `client/.env` :
```env
REACT_APP_SERVER_URL=http://localhost:5000
```

---

## ▶️ Lancement

### PC uniquement

```bash
# Terminal 1 — MongoDB
sudo systemctl start mongod

# Terminal 2 — Serveur
cd server && npm run dev

# Terminal 3 — Client
cd client && npm start
```

Acces : `http://localhost:3000`

---

### PC + Mobile (meme WiFi)

Le micro, la camera et WebRTC necessitent HTTPS sur mobile.

```bash
# Terminal 1
sudo systemctl start mongod

# Terminal 2
cd server && npm run dev

# Terminal 3 — expose le serveur en HTTPS
ngrok http 5000
# Copier l URL : https://xxxx.ngrok-free.app

# Mettre a jour client/.env :
# REACT_APP_SERVER_URL=https://xxxx.ngrok-free.app

# Terminal 4
cd client && HTTPS=true npm start
```

Acces mobile : `https://192.168.0.XXX:3000`
Accepter l avertissement de certificat auto-signe sur mobile.

---

## 🔌 API REST

### Authentification
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Creer un compte |
| POST | `/api/auth/login` | Se connecter |
| GET | `/api/auth/me` | Profil utilisateur connecte |
| GET | `/api/auth/users` | Liste de tous les utilisateurs |

### Messages
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/messages/:userId` | Historique de conversation |
| POST | `/api/messages/voice` | Upload message vocal |
| POST | `/api/messages/file` | Upload fichier ou image |

---

## 🔌 Evenements Socket.io

| Evenement | Sens | Description |
|-----------|------|-------------|
| `message:send` | Client -> Serveur | Message texte (sauvegarde en DB) |
| `message:forward` | Client -> Serveur | Fichier deja sauvegarde (pas de double) |
| `message:receive` | Serveur -> Client | Nouveau message recu |
| `message:sent` | Serveur -> Client | Confirmation envoi |
| `typing:start` | Client <-> Serveur | Debut de frappe |
| `typing:stop` | Client <-> Serveur | Fin de frappe |
| `users:online` | Serveur -> Client | Liste des IDs connectes |
| `call:initiate` | Client -> Serveur | Initier un appel |
| `call:incoming` | Serveur -> Client | Appel entrant |
| `call:answer` | Client -> Serveur | Accepter |
| `call:answered` | Serveur -> Client | Appel accepte |
| `call:reject` | Client -> Serveur | Refuser |
| `call:rejected` | Serveur -> Client | Appel refuse |
| `call:ice-candidate` | Client <-> Serveur | Negociation ICE WebRTC |
| `call:end` | Client -> Serveur | Terminer l appel |
| `call:ended` | Serveur -> Client | Appel termine |
| `call:unavailable` | Serveur -> Client | Utilisateur absent |

---

## 🗄️ Modeles MongoDB

### User
```js
{
  username:  String,    // unique
  email:     String,    // unique
  password:  String,    // hache bcrypt
  isOnline:  Boolean,   // defaut false
  lastSeen:  Date,
  createdAt: Date,
}
```

### Message
```js
{
  sender:    ObjectId,  // ref User
  receiver:  ObjectId,  // ref User
  content:   String,    // texte (vide pour voice/file)
  type:      String,    // 'text' | 'voice' | 'image' | 'file'
  audioUrl:  String,    // /uploads/audio/xxx.webm
  fileUrl:   String,    // /uploads/files/xxx.pdf
  fileName:  String,    // nom original du fichier
  fileSize:  Number,    // taille en bytes
  read:      Boolean,   // defaut false
  createdAt: Date,
}
```

---

## 🐛 Solutions aux problemes connus

| Probleme | Cause | Solution |
|----------|-------|----------|
| Micro/camera bloques mobile | HTTP interdit getUserMedia | Utiliser HTTPS via ngrok |
| "Aucun utilisateur" avec ngrok | Page avertissement ngrok intercepte les requetes | Header `ngrok-skip-browser-warning: true` dans axios |
| Images ne s affichent pas | `<img>` ne peut pas envoyer de headers ngrok | Chargement via `fetch` + `URL.createObjectURL` |
| Double message a l envoi fichier | Socket re-sauvegardait en DB | Utiliser `message:forward` au lieu de `message:send` |
| "clean exit" nodemon | `server.listen()` non atteint | Verifier les chemins `require()` |
| MODULE_NOT_FOUND | Chemins relatifs incorrects | `./models/` depuis index.js, `../models/` depuis routes/ |
| Port 5000 deja utilise | Processus zombie | `kill $(lsof -t -i:5000)` |

---

## 📦 Dependances principales

### Serveur
```json
{
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.0.3",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.0",
  "mongoose": "^7.3.1",
  "multer": "^1.4.5-lts.1",
  "socket.io": "^4.6.1",
  "nodemon": "^3.0.0"
}
```

### Client
```json
{
  "axios": "^1.4.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.6.1"
}
```

---

## 📄 Licence

MIT — © 2025 [VoaybeDev](https://github.com/VoaybeDev)