# 💬 ChatCraft — Application de Chat en Temps Réel

> Application de chat MVP construite avec **React + Socket.io + Node.js**.
> Auth par pseudo, salons multiples, indicateur de frappe, liste des membres en ligne.

## 🚀 Démarrage rapide

### Structure du projet

```
real-time-chat-app/
├── server/
│   ├── index.js          ← Serveur Node.js + Socket.io
│   └── package.json
├── src/
│   ├── App.jsx           ← Composant React principal
│   └── index.css         ← Tous les styles
├── package.json
└── README.md
```

### Installation

```bash
# 1. Créer le projet React
npx create-react-app real-time-chat-app
cd real-time-chat-app

# 2. Copier src/App.jsx et src/index.css dans src/

# 3. Modifier src/index.js
```

**src/index.js :**
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
```

```bash
# 4. Installer socket.io-client
npm install socket.io-client

# 5. Configurer le backend
mkdir server && cd server
# Copier server/index.js et server/package.json
npm install

# 6. Lancer le backend (terminal 1)
node index.js
# → Serveur sur http://localhost:4000

# 7. Lancer le frontend (terminal 2)
cd .. && npm start
# → App sur http://localhost:3000
```

## ✨ Fonctionnalités

| Feature | Description |
|---|---|
| **Auth pseudo** | Entrer son nom avant d'accéder au chat |
| **Détection doublon** | Pseudo déjà pris dans le salon → erreur |
| **4 salons** | Général, Technologie, Design, Random |
| **Changement de salon** | Sans déconnexion, historique rechargé |
| **Messages temps réel** | Socket.io, diffusion à tous les membres |
| **Bulles différenciées** | Mes messages droite (vert), autres gauche |
| **Indicateur de frappe** | "X est en train d'écrire…" animé |
| **Membres en ligne** | Mise à jour temps réel |
| **Notifications système** | "X a rejoint / quitté le salon" |
| **Historique** | 50 derniers messages par salon |
| **Avatars colorés** | Initiales + couleur selon le pseudo |
| **Timestamps** | Heure sur chaque message |
| **Entrée pour envoyer** | Shift+Entrée pour nouvelle ligne |
| **Auto-scroll** | Scroll vers le dernier message |
| **Responsive** | Sidebar drawer sur mobile |

## 🔌 Événements Socket.io

### Client → Serveur
| Événement | Payload | Description |
|---|---|---|
| `join` | `{ username, room }` | Auth + rejoindre salon |
| `message:send` | `{ text }` | Envoyer un message |
| `typing:start` | — | Début de frappe |
| `typing:stop` | — | Fin de frappe |
| `room:change` | `{ room }` | Changer de salon |

### Serveur → Client
| Événement | Payload | Description |
|---|---|---|
| `join:success` | `{ user, history, users }` | Auth OK |
| `join:error` | `{ message }` | Auth KO |
| `message:receive` | Message complet | Nouveau message |
| `user:joined` | `{ username, users }` | Nouveau membre |
| `user:left` | `{ username, users }` | Membre parti |
| `typing:update` | `{ username, isTyping }` | Statut frappe |

## 🎨 Design System

Thème **Dark Emerald** (vert forêt profond)

| Variable | Usage |
|---|---|
| `--grad-text: #00ff87 → #00d4ff` | Titres gradient |
| `--grad-primary: #00c96b → #00a855` | Boutons, bulles |
| `--grad-bg: #020d08 → #0d2818` | Fond sombre |

Polices : **Outfit** (titres) + **Plus Jakarta Sans** (texte)

## 🛠️ Personnalisation

### Ajouter un salon

`server/index.js` :
```javascript
const DEFAULT_ROOMS = ['Général', 'Technologie', 'Design', 'Random', 'Mon Salon'];
```

`src/App.jsx` :
```jsx
const ROOMS = ['Général', 'Technologie', 'Design', 'Random', 'Mon Salon'];
const ROOM_ICONS = { 'Mon Salon': '🌟', /* ...autres */ };
```

### Déploiement

```bash
# Backend → Render / Railway / Heroku
cd server && echo "web: node index.js" > Procfile

# Frontend → Vercel / Netlify
# Dans App.jsx, changer SERVER_URL :
const SERVER_URL = 'https://votre-serveur.onrender.com';
npm run build
```

---

**⌨️ Crafted with ❤️ by [VoaybeDev](https://github.com/VoaybeDev?tab=repositories)**