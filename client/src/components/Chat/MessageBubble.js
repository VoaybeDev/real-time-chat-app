import './Chat.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return '📄';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['txt'].includes(ext)) return '📃';
  return '📎';
};

const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  const fileUrl = message.fileUrl
    ? (message.fileUrl.startsWith('http') ? message.fileUrl : `${SERVER_URL}${message.fileUrl}`)
    : null;
  const audioUrl = message.audioUrl
    ? (message.audioUrl.startsWith('http') ? message.audioUrl : `${SERVER_URL}${message.audioUrl}`)
    : null;

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      <div className="bubble-content">

        {/* Message texte */}
        {message.type === 'text' && <p>{message.content}</p>}

        {/* Message vocal */}
        {message.type === 'voice' && (
          <div className="voice-message">
            🎤
            <audio src={audioUrl} controls className="audio-player" />
          </div>
        )}

        {/* Image */}
        {message.type === 'image' && (
          <div className="image-message">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <img src={fileUrl} alt="Image" className="msg-image" />
            </a>
          </div>
        )}

        {/* Fichier */}
        {message.type === 'file' && fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="file-message"
            download
          >
            <span className="file-icon">{getFileIcon(message.fileName)}</span>
            <div className="file-info">
              <span className="file-name">{message.fileName || 'Fichier'}</span>
              <span className="file-size">{formatSize(message.fileSize)}</span>
            </div>
            <span className="file-download">⬇</span>
          </a>
        )}
      </div>
      <span className="message-time">{time}</span>
    </div>
  );
};

export default MessageBubble;