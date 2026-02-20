import './Chat.css';

const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      <div className="bubble-content">
        {message.type === 'voice' ? (
          <div className="voice-message">
            🎵
            <audio
              src={`http://localhost:5000${message.audioUrl}`}
              controls
              className="audio-player"
            />
          </div>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      <span className="message-time">{time}</span>
    </div>
  );
};

export default MessageBubble;