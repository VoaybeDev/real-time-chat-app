import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import CallModal from '../Call/CallModal';
import IncomingCall from '../Call/IncomingCall';
import axios from 'axios';
import './Chat.css';

const ChatLayout = () => {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users,          setUsers]          = useState([]);
  const [selectedUser,   setSelectedUser]   = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [incomingCall,   setIncomingCall]   = useState(null); // { callerId, callType, offer }

  const webrtc = useWebRTC(socket);

  // Charger la liste des utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await axios.get('/api/auth/users');
      setUsers(data.users);
    };
    fetchUsers();
  }, []);

  // Charger l'historique quand on sélectionne un utilisateur
  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      const { data } = await axios.get(`/api/messages/${selectedUser._id}`);
      setMessages(data.messages);
    };
    fetchMessages();
  }, [selectedUser]);

  // Écouter les événements Socket
  useEffect(() => {
    if (!socket) return;

    socket.on('message:receive', (message) => {
      if (
        selectedUser &&
        (message.sender._id === selectedUser._id ||
          message.sender === selectedUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message:sent', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Appel entrant
    socket.on('call:incoming', ({ callerId, callType, offer }) => {
      const caller = users.find((u) => u._id === callerId);
      setIncomingCall({ callerId, callType, offer, callerName: caller?.username || callerId });
      webrtc.setCallerId(callerId);
      webrtc.setCallType(callType);
      webrtc.setCallStatus('receiving');
    });

    socket.on('call:answered', webrtc.handleCallAnswered);
    socket.on('call:ice-candidate', webrtc.handleICECandidate);
    socket.on('call:ended',   () => webrtc.endCall());
    socket.on('call:rejected', () => { webrtc.endCall(); alert('Appel refusé'); });
    socket.on('call:unavailable', () => { webrtc.endCall(); alert('Utilisateur non disponible'); });

    return () => {
      socket.off('message:receive');
      socket.off('message:sent');
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
      socket.off('call:rejected');
      socket.off('call:unavailable');
    };
  }, [socket, selectedUser, users, webrtc]);

  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      webrtc.answerCall(incomingCall.callerId, incomingCall.offer, incomingCall.callType);
      setIncomingCall(null);
    }
  }, [incomingCall, webrtc]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      webrtc.rejectCall(incomingCall.callerId);
      setIncomingCall(null);
    }
  }, [incomingCall, webrtc]);

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <span className="username">{user?.username}</span>
          </div>
          <button onClick={logout} className="logout-btn" title="Déconnexion">
            ⏻
          </button>
        </div>

        <UserList
          users={users}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      </div>

      {/* Fenêtre de chat */}
      <div className="main-content">
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            onlineUsers={onlineUsers}
            onStartCall={(type) => webrtc.startCall(selectedUser._id, type)}
          />
        ) : (
          <div className="no-chat">
            <div className="no-chat-icon">💬</div>
            <h2>Sélectionnez une conversation</h2>
            <p>Choisissez un utilisateur pour commencer à chatter</p>
          </div>
        )}
      </div>

      {/* Modal appel actif */}
      {(webrtc.callStatus === 'calling' || webrtc.callStatus === 'in-call') && (
        <CallModal
          callType={webrtc.callType}
          callStatus={webrtc.callStatus}
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          targetUser={selectedUser}
          onEndCall={() => webrtc.endCall(selectedUser?._id)}
          onToggleMic={webrtc.toggleMic}
          onToggleCamera={webrtc.toggleCamera}
        />
      )}

      {/* Modal appel entrant */}
      {incomingCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
};

export default ChatLayout;