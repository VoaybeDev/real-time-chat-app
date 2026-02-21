import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceMessage } from '../../hooks/useVoiceMessage';
import MessageBubble from './MessageBubble';
import './Chat.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const ALLOWED_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'application/zip','application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ChatWindow = ({ selectedUser, messages, onlineUsers, onStartCall, onBack, showBackButton, showToast }) => {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [text,        setText]        = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [showVoice,   setShowVoice]   = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef   = useRef(null);
  const voice          = useVoiceMessage();
  const isOnline       = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('typing:start', ({ userId }) => { if (userId === selectedUser._id) setIsTyping(true);  });
    socket.on('typing:stop',  ({ userId }) => { if (userId === selectedUser._id) setIsTyping(false); });
    return () => { socket.off('typing:start'); socket.off('typing:stop'); };
  }, [socket, selectedUser]);

  // Envoyer message texte
  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket?.emit('message:send', { receiverId: selectedUser._id, content: text.trim(), type: 'text' });
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
      setUploading(true);
      const res = await fetch(`${SERVER_URL}/api/messages/voice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });
      const data = await res.json();
      socket?.emit('message:send', {
        receiverId: selectedUser._id, content: '',
        type: 'voice', audioUrl: data.message.audioUrl,
      });
      voice.resetAudio();
      setShowVoice(false);
    } catch (err) {
      showToast({ title: 'Erreur', message: 'Impossible d\'envoyer le message vocal', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Envoyer fichier/image
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ title: 'Format non supporté', message: 'Images, PDF, ZIP, Word, Excel, TXT seulement', type: 'warning' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast({ title: 'Fichier trop lourd', message: 'Maximum 20MB', type: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', selectedUser._id);

    try {
      setUploading(true);
      const res = await fetch(`${SERVER_URL}/api/messages/file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });
      const data = await res.json();
      const isImage = file.type.startsWith('image/');
      socket?.emit('message:send', {
        receiverId: selectedUser._id,
        content:    '',
        type:       isImage ? 'image' : 'file',
        fileUrl:    data.message.fileUrl,
        fileName:   data.message.fileName,
        fileSize:   data.message.fileSize,
      });
      showToast({ title: 'Fichier envoyé !', type: 'success' });
    } catch (err) {
      showToast({ title: 'Erreur upload', message: err.message, type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
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
          {showBackButton && (
            <button className="back-btn" onClick={onBack}>←</button>
          )}
          <div className="chat-avatar gradient-bg">{selectedUser.username[0].toUpperCase()}</div>
          <div>
            <h3 className="gradient-text">{selectedUser.username}</h3>
            <span className={`chat-status ${isOnline ? 'online' : 'offline'}`}>
              {isTyping ? '✍️ En train d\'écrire...' : isOnline ? '● En ligne' : '○ Hors ligne'}
            </span>
          </div>
        </div>
        <div className="call-buttons">
          <button className="call-btn audio" onPointerDown={handleCall('audio')} title="Appel vocal">📞</button>
          <button className="call-btn video" onPointerDown={handleCall('video')} title="Appel vidéo">📹</button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id || i}
            message={msg}
            isOwn={(msg.sender?._id || msg.sender) === user._id || msg.senderId === user._id}
          />
        ))}
        {isTyping && (
          <div className="typing-indicator"><span /><span /><span /></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice recorder */}
      {showVoice && (
        <div className="voice-recorder">
          {voice.isRecording ? (
            <div className="recording-active">
              <div className="rec-dot" />
              <span className="rec-timer">{voice.formatDuration(voice.duration)}</span>
              <button onPointerDown={voice.stopRecording}    className="stop-rec-btn">⏹ Stop</button>
              <button onPointerDown={voice.cancelRecording}  className="cancel-rec-btn">✕</button>
            </div>
          ) : voice.audioUrl ? (
            <div className="audio-preview">
              <audio src={voice.audioUrl} controls className="audio-preview-player" />
              <button onPointerDown={sendVoiceMessage}       className="send-voice-btn" disabled={uploading}>
                {uploading ? '⏳' : '➤ Envoyer'}
              </button>
              <button onPointerDown={voice.cancelRecording}  className="cancel-rec-btn">✕</button>
            </div>
          ) : (
            <div className="start-recording">
              <button onPointerDown={voice.startRecording}   className="start-rec-btn">🎤 Enregistrer</button>
              <button onPointerDown={() => setShowVoice(false)} className="cancel-rec-btn">✕</button>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="message-input">
        {/* Bouton micro */}
        <button
          type="button"
          className={`voice-toggle-btn ${showVoice ? 'active' : ''}`}
          onPointerDown={() => setShowVoice(!showVoice)}
          title="Message vocal"
        >🎤</button>

        {/* Bouton fichier */}
        <button
          type="button"
          className="file-btn"
          onPointerDown={() => fileInputRef.current?.click()}
          title="Joindre un fichier"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.zip,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Texte */}
        <input
          type="text"
          placeholder={`Message à ${selectedUser.username}...`}
          value={text}
          onChange={handleTextChange}
          className="text-input"
        />

        {/* Envoyer */}
        <button type="submit" className="send-btn" disabled={!text.trim()}>➤</button>
      </form>
    </div>
  );
};

export default ChatWindow;