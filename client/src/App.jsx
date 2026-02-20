/**
 * @file src/App.jsx
 * @description Application de chat en temps réel — Frontend React + Socket.io.
 *
 * Flux de l'application :
 *  1. Écran d'auth → l'utilisateur saisit son pseudo et choisit un salon
 *  2. Écran de chat → messagerie temps réel dans le salon sélectionné
 *
 * Fonctionnalités :
 *  - Auth par pseudo (détection de doublon côté serveur)
 *  - Salons multiples avec changement à chaud
 *  - Messages différenciés (les miens à droite, les autres à gauche)
 *  - Indicateur "X est en train d'écrire…"
 *  - Liste des utilisateurs en ligne
 *  - Notifications de connexion / déconnexion
 *  - Historique rechargé à chaque changement de salon
 *  - Envoi par touche Entrée ou bouton
 *  - Auto-scroll vers le dernier message
 *  - Timestamps lisibles
 *
 * @author VoaybeDev
 * @link   https://github.com/VoaybeDev?tab=repositories
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** URL du serveur Socket.io (backend Node.js) */
const SERVER_URL = 'http://localhost:4000';

/** Délai avant d'arrêter l'indicateur de frappe (ms) */
const TYPING_TIMEOUT = 1500;

/** Salons par défaut (synchronisés avec le serveur) */
const ROOMS = ['Général', 'Technologie', 'Design', 'Random'];

/** Emoji de chaque salon */
const ROOM_ICONS = {
  Général:      '💬',
  Technologie:  '💻',
  Design:       '🎨',
  Random:       '🎲',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un timestamp ISO en heure lisible.
 * @param {string} iso - Date ISO 8601.
 * @returns {string} Ex : "14:32"
 */
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/**
 * Formate un timestamp ISO en date + heure si pas aujourd'hui.
 * @param {string} iso
 * @returns {string}
 */
const formatFullDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return formatTime(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + formatTime(iso);
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avatar avec initiales coloré.
 * @param {{ initials: string, color: string, size?: 'sm'|'md'|'lg' }} props
 */
function Avatar({ initials, color, size = 'md' }) {
  return (
    <div className={`avatar avatar--${color} avatar--${size}`} aria-hidden="true">
      {initials}
    </div>
  );
}

/**
 * Bulle de message individuelle.
 * @param {{ message: Object, isOwn: boolean }} props
 */
function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="msg-system">
        <span>{message.text}</span>
      </div>
    );
  }

  return (
    <div className={`msg-row ${isOwn ? 'msg-row--own' : 'msg-row--other'}`}>
      {!isOwn && (
        <Avatar initials={message.avatar} color={message.color} size="sm" />
      )}
      <div className={`msg-bubble ${isOwn ? 'msg-bubble--own' : 'msg-bubble--other'}`}>
        {!isOwn && (
          <p className={`msg-username msg-username--${message.color}`}>
            {message.username}
          </p>
        )}
        <p className="msg-text">{message.text}</p>
        <p className="msg-time">{formatFullDate(message.timestamp)}</p>
      </div>
    </div>
  );
}

/**
 * Indicateur de frappe animé.
 * @param {{ typingUsers: string[] }} props
 */
function TypingIndicator({ typingUsers }) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} est en train d'écrire`
      : `${typingUsers.join(', ')} écrivent`;

  return (
    <div className="typing-indicator" aria-live="polite">
      <span className="typing-dots">
        <span /><span /><span />
      </span>
      <span className="typing-text">{label}…</span>
    </div>
  );
}

/**
 * Écran d'authentification (choix du pseudo + salon).
 * @param {{ onJoin: Function, error: string }} props
 */
function AuthScreen({ onJoin, error }) {
  const [username, setUsername] = useState('');
  const [room,     setRoom]     = useState(ROOMS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) onJoin(username.trim(), room);
  };

  return (
    <div className="auth-screen">
      {/* Blobs décoratifs */}
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">💬</span>
          <h1 className="auth-logo-title">ChatCraft</h1>
        </div>

        <p className="auth-subtitle">
          Discussion en temps réel — rejoignez la conversation
        </p>

        {/* Erreur serveur */}
        {error && (
          <div className="auth-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* Pseudo */}
        <div className="auth-field">
          <label htmlFor="username" className="auth-label">Votre pseudo</label>
          <input
            id="username"
            type="text"
            className="auth-input"
            placeholder="Ex : bryan_dev"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoFocus
            autoComplete="off"
          />
          <p className="auth-hint">{username.length}/20 caractères</p>
        </div>

        {/* Salon */}
        <div className="auth-field">
          <label className="auth-label">Choisir un salon</label>
          <div className="room-grid">
            {ROOMS.map((r) => (
              <button
                key={r}
                type="button"
                className={`room-btn ${room === r ? 'room-btn--active' : ''}`}
                onClick={() => setRoom(r)}
              >
                <span className="room-btn-icon">{ROOM_ICONS[r]}</span>
                <span>{r}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="auth-submit"
          disabled={!username.trim()}
        >
          Rejoindre {ROOM_ICONS[room]} {room}
        </button>

        {/* Signature */}
        <a
          href="https://github.com/VoaybeDev?tab=repositories"
          target="_blank"
          rel="noopener noreferrer"
          className="signature"
          aria-label="VoaybeDev sur GitHub"
        >
          <span className="signature-icon">⌨️</span>
          <span className="signature-text">
            Crafted by <strong>VoaybeDev</strong>
          </span>
          <span className="signature-arrow">→</span>
        </a>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * App — Composant racine.
 * Gère la connexion Socket.io, l'auth et l'écran de chat.
 */
export default function App() {

  // ── State ─────────────────────────────────────────────────────────────────

  /** Utilisateur courant après auth : { username, avatar, color, room } | null */
  const [currentUser, setCurrentUser] = useState(null);

  /** Messages du salon courant */
  const [messages, setMessages] = useState([]);

  /** Utilisateurs en ligne dans le salon */
  const [onlineUsers, setOnlineUsers] = useState([]);

  /** Salon courant */
  const [currentRoom, setCurrentRoom] = useState(ROOMS[0]);

  /** Texte en cours de saisie */
  const [inputText, setInputText] = useState('');

  /** Utilisateurs en train d'écrire (noms) */
  const [typingUsers, setTypingUsers] = useState([]);

  /** Erreur d'auth renvoyée par le serveur */
  const [authError, setAuthError] = useState('');

  /** Panneau des membres visible sur mobile */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────

  /** Instance Socket.io persistante entre les renders */
  const socketRef = useRef(null);

  /** Ref sur le bas de la liste de messages (auto-scroll) */
  const messagesEndRef = useRef(null);

  /** Timer pour l'indicateur de frappe */
  const typingTimerRef = useRef(null);

  /** Indique si l'événement 'typing:start' a déjà été émis */
  const isTypingRef = useRef(false);

  // ── Connexion Socket.io ───────────────────────────────────────────────────

  useEffect(() => {
    // Crée la connexion Socket.io une seule fois
    socketRef.current = io(SERVER_URL, { autoConnect: true });
    const socket = socketRef.current;

    // ── Réception des événements serveur ──

    /** Auth réussie */
    socket.on('join:success', ({ user, history, users }) => {
      setCurrentUser(user);
      setCurrentRoom(user.room);
      setMessages(history);
      setOnlineUsers(users);
      setAuthError('');
    });

    /** Auth échouée */
    socket.on('join:error', ({ message }) => {
      setAuthError(message);
    });

    /** Nouveau message reçu */
    socket.on('message:receive', (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Retire l'utilisateur de la liste "en train d'écrire"
      setTypingUsers((prev) => prev.filter((u) => u !== msg.username));
    });

    /** Un utilisateur a rejoint le salon */
    socket.on('user:joined', ({ username, users }) => {
      setOnlineUsers(users);
      // Message système
      setMessages((prev) => [
        ...prev,
        {
          id:        `sys-${Date.now()}`,
          type:      'system',
          text:      `${username} a rejoint le salon 👋`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    /** Un utilisateur a quitté le salon */
    socket.on('user:left', ({ username, users }) => {
      setOnlineUsers(users);
      setTypingUsers((prev) => prev.filter((u) => u !== username));
      setMessages((prev) => [
        ...prev,
        {
          id:        `sys-${Date.now()}`,
          type:      'system',
          text:      `${username} a quitté le salon`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    /** Mise à jour liste des utilisateurs */
    socket.on('users:update', (users) => {
      setOnlineUsers(users);
    });

    /** Salon changé avec succès */
    socket.on('room:changed', ({ room, history, users }) => {
      setCurrentRoom(room);
      setMessages(history);
      setOnlineUsers(users);
      setTypingUsers([]);
    });

    /** Indicateur de frappe */
    socket.on('typing:update', ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        }
        return prev.filter((u) => u !== username);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Rejoint le chat avec un pseudo et un salon.
   * @param {string} username
   * @param {string} room
   */
  const handleJoin = useCallback((username, room) => {
    socketRef.current?.emit('join', { username, room });
  }, []);

  /**
   * Envoie un message texte.
   */
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    socketRef.current?.emit('message:send', { text });
    socketRef.current?.emit('typing:stop');
    isTypingRef.current = false;
    clearTimeout(typingTimerRef.current);
    setInputText('');
  }, [inputText]);

  /**
   * Envoie le message via la touche Entrée (sans Shift).
   * @param {React.KeyboardEvent} e
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Gère l'indicateur de frappe lors de la saisie.
   * @param {React.ChangeEvent} e
   */
  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);

    if (!isTypingRef.current) {
      socketRef.current?.emit('typing:start');
      isTypingRef.current = true;
    }

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop');
      isTypingRef.current = false;
    }, TYPING_TIMEOUT);
  }, []);

  /**
   * Change de salon.
   * @param {string} room
   */
  const handleRoomChange = useCallback((room) => {
    if (room === currentRoom) return;
    socketRef.current?.emit('room:change', { room });
    setSidebarOpen(false);
  }, [currentRoom]);

  /**
   * Se déconnecte et revient à l'écran d'auth.
   */
  const handleLeave = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current?.connect();
    setCurrentUser(null);
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers([]);
    setInputText('');
    setAuthError('');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // Écran d'authentification
  if (!currentUser) {
    return <AuthScreen onJoin={handleJoin} error={authError} />;
  }

  // Écran de chat
  return (
    <div className="chat-app">

      {/* ── Sidebar mobile overlay ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar gauche : salons + membres ─────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-header">
          <span className="sidebar-logo">💬 ChatCraft</span>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >✕</button>
        </div>

        {/* Salons */}
        <nav className="sidebar-section" aria-label="Salons de discussion">
          <p className="sidebar-section-title">Salons</p>
          {ROOMS.map((r) => (
            <button
              key={r}
              className={`sidebar-room ${currentRoom === r ? 'sidebar-room--active' : ''}`}
              onClick={() => handleRoomChange(r)}
              aria-current={currentRoom === r ? 'page' : undefined}
            >
              <span className="sidebar-room-icon">{ROOM_ICONS[r]}</span>
              <span>{r}</span>
              {currentRoom === r && <span className="sidebar-room-dot" />}
            </button>
          ))}
        </nav>

        {/* Membres en ligne */}
        <div className="sidebar-section">
          <p className="sidebar-section-title">
            En ligne — {onlineUsers.length}
          </p>
          <ul className="members-list" aria-label="Membres en ligne">
            {onlineUsers.map((u) => (
              <li key={u.id} className="member-item">
                <Avatar initials={u.avatar} color={u.color} size="sm" />
                <span className="member-name">
                  {u.username}
                  {u.username === currentUser.username && (
                    <span className="member-you"> (vous)</span>
                  )}
                </span>
                <span className="member-dot" aria-label="En ligne" />
              </li>
            ))}
          </ul>
        </div>

        {/* Quitter */}
        <button className="sidebar-leave" onClick={handleLeave}>
          ⬅ Quitter le chat
        </button>
      </aside>

      {/* ── Zone principale de chat ────────────────────────────────────── */}
      <main className="chat-main">

        {/* Header du chat */}
        <header className="chat-header">
          <button
            className="chat-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <div className="chat-header-info">
            <span className="chat-header-room">
              {ROOM_ICONS[currentRoom]} {currentRoom}
            </span>
            <span className="chat-header-count">
              {onlineUsers.length} membre{onlineUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="chat-header-user">
            <Avatar initials={currentUser.avatar} color={currentUser.color} size="sm" />
            <span className="chat-header-username">{currentUser.username}</span>
          </div>
        </header>

        {/* Liste des messages */}
        <section className="messages-area" aria-label="Messages">
          {messages.length === 0 && (
            <div className="messages-empty">
              <span className="messages-empty-icon" aria-hidden="true">
                {ROOM_ICONS[currentRoom]}
              </span>
              <p>Soyez le premier à écrire dans <strong>{currentRoom}</strong> !</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.socketId === socketRef.current?.id}
            />
          ))}

          {/* Indicateur de frappe */}
          <TypingIndicator typingUsers={typingUsers} />

          {/* Ancre pour l'auto-scroll */}
          <div ref={messagesEndRef} />
        </section>

        {/* Zone de saisie */}
        <footer className="chat-input-area">
          <textarea
            className="chat-input"
            placeholder={`Message dans ${currentRoom}…`}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={500}
            aria-label="Saisir un message"
          />
          <div className="chat-input-actions">
            <span className="chat-char-count">{inputText.length}/500</span>
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim()}
              aria-label="Envoyer le message"
            >
              ➤
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}