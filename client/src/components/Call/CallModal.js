import { useRef, useEffect, useState } from 'react';
import './Call.css';

const CallModal = ({
  callType, callStatus, localStream, remoteStream,
  targetUser, onEndCall, onToggleMic, onToggleCamera,
}) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const [micOn,    setMicOn]    = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleMic = () => {
    onToggleMic();
    setMicOn((v) => !v);
  };

  const handleToggleCamera = () => {
    onToggleCamera();
    setCameraOn((v) => !v);
  };

  return (
    <div className="call-modal-overlay">
      <div className={`call-modal ${callType}`}>
        <div className="call-modal-header">
          <span className="call-type-badge">
            {callType === 'video' ? '📹 Appel vidéo' : '📞 Appel vocal'}
          </span>
          <h3>{targetUser?.username}</h3>
          <span className={`call-state ${callStatus}`}>
            {callStatus === 'calling' ? '⏳ Appel en cours...' : '🟢 Connecté'}
          </span>
        </div>

        {/* Vidéos */}
        {callType === 'video' && (
          <div className="video-container">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        )}

        {/* Audio seulement */}
        {callType === 'audio' && (
          <div className="audio-call-visual">
            <div className="caller-avatar large">
              {targetUser?.username?.[0]?.toUpperCase()}
            </div>
            <audio ref={remoteVideoRef} autoPlay />
          </div>
        )}

        {/* Contrôles */}
        <div className="call-controls">
          <button
            className={`control-btn ${!micOn ? 'off' : ''}`}
            onClick={handleToggleMic}
            title={micOn ? 'Couper micro' : 'Activer micro'}
          >
            {micOn ? '🎤' : '🔇'}
          </button>

          {callType === 'video' && (
            <button
              className={`control-btn ${!cameraOn ? 'off' : ''}`}
              onClick={handleToggleCamera}
              title={cameraOn ? 'Couper caméra' : 'Activer caméra'}
            >
              {cameraOn ? '📷' : '🚫'}
            </button>
          )}

          <button className="control-btn end-call" onClick={onEndCall} title="Raccrocher">
            📵
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;