import { useState, useEffect } from 'react';
import './Chat.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'ico', 'heic', 'heif', 'avif'];

const getFileIcon = (fileName) => {
  if (!fileName) return '📎';
  const ext = fileName.split('.').pop().toLowerCase();
  if (imageExts.includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📈';
  if (ext === 'txt' || ext === 'md') return '📃';
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return '🎵';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '🎬';
  return '📎';
};

const buildUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return SERVER_URL + (url.startsWith('/') ? url : '/' + url);
};

const isImageFile = (message) => {
  if (message.type === 'image') return true;
  if (message.fileUrl) {
    const ext = message.fileUrl.split('.').pop().split('?')[0].toLowerCase();
    if (imageExts.includes(ext)) return true;
  }
  if (message.fileName) {
    const ext = message.fileName.split('.').pop().toLowerCase();
    if (imageExts.includes(ext)) return true;
  }
  return false;
};

// Charge l'image via fetch avec le header ngrok pour éviter le blocage
const AuthImage = ({ src, alt, className, onClick }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error,   setError]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) return;
    let objectUrl = null;

    const loadImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'ngrok-skip-browser-warning': 'true' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(src, { headers });
        if (!res.ok) throw new Error('Erreur chargement image');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error('Erreur image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (loading) {
    return (
      <div className="img-loading">
        <div className="img-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="img-error-link">
        🖼️ Voir image
      </a>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
};

const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const fileUrl     = buildUrl(message.fileUrl);
  const audioUrl    = buildUrl(message.audioUrl);
  const showAsImage = isImageFile(message);

  return (
    <div className={'message-bubble ' + (isOwn ? 'own' : 'other')}>
      <div className="bubble-content">

        {message.type === 'text' && (
          <p>{message.content}</p>
        )}

        {message.type === 'voice' && audioUrl && (
          <div className="voice-message">
            <span>🎤</span>
            <audio src={audioUrl} controls className="audio-player" />
          </div>
        )}

        {showAsImage && fileUrl && (
          <div className="image-message">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <AuthImage
                src={fileUrl}
                alt="Image"
                className="msg-image"
              />
            </a>
          </div>
        )}

        {!showAsImage && message.type === 'file' && fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="file-message"
            download={message.fileName}
          >
            <span className="file-icon">{getFileIcon(message.fileName)}</span>
            <div className="file-info">
              <span className="file-name">{message.fileName || 'Fichier'}</span>
              <span className="file-size">{formatSize(message.fileSize)}</span>
            </div>
            <span className="file-download">⬇</span>
          </a>
        )}

        {message.type !== 'text' &&
         message.type !== 'voice' &&
         !showAsImage &&
         message.type !== 'file' &&
         message.content && (
          <p>{message.content}</p>
        )}

      </div>
      <span className="message-time">{time}</span>
    </div>
  );
};

export default MessageBubble;