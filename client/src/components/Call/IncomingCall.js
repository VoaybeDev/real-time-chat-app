import './Call.css';

const IncomingCall = ({ callerName, callType, onAccept, onReject }) => {
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="incoming-call-avatar">
          {callerName?.[0]?.toUpperCase()}
        </div>
        <h3>{callerName}</h3>
        <p>{callType === 'video' ? '📹 Appel vidéo entrant' : '📞 Appel vocal entrant'}</p>
        <div className="incoming-call-actions">
          <button className="reject-btn" onClick={onReject}>
            📵 Refuser
          </button>
          <button className="accept-btn" onClick={onAccept}>
            📞 Accepter
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;