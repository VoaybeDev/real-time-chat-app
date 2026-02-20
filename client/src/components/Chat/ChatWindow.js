import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceMessage } from '../../hooks/useVoiceMessage';
import MessageBubble from './MessageBubble';
import './Chat.css';

const ChatWindow = ({ selectedUser, messages, onlineUsers, onStartCall }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [text,      setText]      = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const voice = useVoiceMessage();
  const isOnline = onlineUsers.includes(selectedUser._id);

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Écouter le typing
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

  // Envoyer message texte
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

  // Envoyer message vocal
  const sendVoiceMessage = async () => {
    if (!voice.audioBlob) return;
    const formData = new FormData();
    formData.append('audio', voice.audioBlob, 'voice-message.webm');
    formData.append('receiverId', selectedUser._id);

    try {
      const res = await fetch('http://localhost:5000/api/messages/voice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      // Notifier via socket
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

  // Gestion du typing
  const handleTextChange = (e) => {
    setText(e.target.value);
    socket?.emit('typing:start', { receiverId: selectedUser._id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { receiverId: selectedUser._id });
    }, 1500);
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-avatar">{selectedUser.username[0].toUpperCase()}</div>
          <div>
            <h3>{selectedUser.username}</h3>
            <span className={`chat-status ${isOnline ? 'online' : 'offline'}`}>
              {isTyping ? '✍️ En train d\'écrire...' : isOnline ? '● En ligne' : '○ Hors ligne'}
            </span>
          </div>
        </div>

        <div className="call-buttons">
          <button
            className="call-btn audio"
            onClick={() => onStartCall('audio')}
            title="Appel vocal"
          >
            📞
          </button>
          <button
            className="call-btn video"
            onClick={() => onStartCall('video')}
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
              <span>{voice.formatDuration(voice.duration)}</span>
              <button onClick={voice.stopRecording} className="stop-rec-btn">
                ⏹ Arrêter
              </button>
              <button onClick={voice.cancelRecording} className="cancel-rec-btn">
                ✕
              </button>
            </div>
          ) : voice.audioUrl ? (
            <div className="audio-preview">
              <audio src={voice.audioUrl} controls />
              <button onClick={sendVoiceMessage} className="send-voice-btn">
                ➤ Envoyer
              </button>
              <button onClick={voice.cancelRecording} className="cancel-rec-btn">
                ✕ Annuler
              </button>
            </div>
          ) : (
            <div className="start-recording">
              <button onClick={voice.startRecording} className="start-rec-btn">
                🎤 Démarrer l'enregistrement
              </button>
              <button onClick={() => setShowVoice(false)} className="cancel-rec-btn">
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="message-input">
        <button
          type="button"
          className={`voice-toggle-btn ${showVoice ? 'active' : ''}`}
          onClick={() => setShowVoice(!showVoice)}
          title="Message vocal"
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
        <button type="submit" className="send-btn" disabled={!text.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;