import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceMessage } from '../../hooks/useVoiceMessage';
import MessageBubble from './MessageBubble';
import './Chat.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const ChatWindow = ({ selectedUser, messages, onlineUsers, onStartCall, onBack, showBackButton }) => {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [text,      setText]      = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const voice = useVoiceMessage();
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('typing:start', ({ userId }) => {
      if (userId === selectedUser._id) setIsTyping(true);
    });
    socket.on('typing:stop', ({ userId }) => {
      if (userId === selectedUser._id) setIsTyping(false);
    });
    return () => {
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [socket, selectedUser]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket?.emit('message:send', {
      receiverId: selectedUser._id,
      content: text.trim(),
      type: 'text',
    });
    setText('');
    socket?.emit('typing:stop', { receiverId: selectedUser._id });
  };

  const sendVoiceMessage = async () => {
    if (!voice.audioBlob) return;
    const formData = new FormData();
    formData.append('audio', voice.audioBlob, 'voice-message.webm');
    formData.append('receiverId', selectedUser._id);
    try {
      const res = await fetch(`${SERVER_URL}/api/messages/voice`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'ngrok-skip-browser-warning': 'true',  // ← ajoute cette ligne
  },
  body: formData,
});
      const data = await res.json();
      socket?.emit('message:send', {
        receiverId: selectedUser._id,
        content: '',
        type: 'voice',
        audioUrl: data.message.audioUrl,
      });
      voice.resetAudio();
      setShowVoice(false);
    } catch (err) {
      console.error('Erreur envoi vocal:', err);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    socket?.emit('typing:start', { receiverId: selectedUser._id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { receiverId: selectedUser._id });
    }, 1500);
  };

  // Handler unifié touch + click pour les boutons d'appel
  const handleCall = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onStartCall(type);
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          {/* Bouton retour mobile */}
          {showBackButton && (
            <button className="back-btn" onClick={onBack}>←</button>
          )}
          <div className="chat-avatar">{selectedUser.username[0].toUpperCase()}</div>
          <div>
            <h3>{selectedUser.username}</h3>
            <span className={`chat-status ${isOnline ? 'online' : 'offline'}`}>
              {isTyping ? '✍️ En train d\'écrire...' : isOnline ? '● En ligne' : '○ Hors ligne'}
            </span>
          </div>
        </div>

        <div className="call-buttons">
          {/* onPointerDown pour compatibilité mobile */}
          <button
            className="call-btn audio"
            onPointerDown={handleCall('audio')}
            title="Appel vocal"
          >
            📞
          </button>
          <button
            className="call-btn video"
            onPointerDown={handleCall('video')}
            title="Appel vidéo"
          >
            📹
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id || i}
            message={msg}
            isOwn={
              (msg.sender?._id || msg.sender) === user._id ||
              msg.senderId === user._id
            }
          />
        ))}
        {isTyping && (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone message vocal */}
      {showVoice && (
        <div className="voice-recorder">
          {voice.isRecording ? (
            <div className="recording-active">
              <div className="rec-dot" />
              <span className="rec-timer">{voice.formatDuration(voice.duration)}</span>
              <button onPointerDown={voice.stopRecording} className="stop-rec-btn">⏹ Stop</button>
              <button onPointerDown={voice.cancelRecording} className="cancel-rec-btn">✕</button>
            </div>
          ) : voice.audioUrl ? (
            <div className="audio-preview">
              <audio src={voice.audioUrl} controls className="audio-preview-player" />
              <button onPointerDown={sendVoiceMessage} className="send-voice-btn">➤ Envoyer</button>
              <button onPointerDown={voice.cancelRecording} className="cancel-rec-btn">✕</button>
            </div>
          ) : (
            <div className="start-recording">
              <button onPointerDown={voice.startRecording} className="start-rec-btn">
                🎤 Enregistrer
              </button>
              <button onPointerDown={() => setShowVoice(false)} className="cancel-rec-btn">✕</button>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="message-input">
        <button
          type="button"
          className={`voice-toggle-btn ${showVoice ? 'active' : ''}`}
          onPointerDown={() => setShowVoice(!showVoice)}
        >
          🎤
        </button>
        <input
          type="text"
          placeholder={`Message à ${selectedUser.username}...`}
          value={text}
          onChange={handleTextChange}
          className="text-input"
        />
        <button type="submit" className="send-btn" disabled={!text.trim()}>➤</button>
      </form>
    </div>
  );
};

export default ChatWindow;