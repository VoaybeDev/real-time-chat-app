import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useToast } from '../UI/Toast';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import CallModal from '../Call/CallModal';
import IncomingCall from '../Call/IncomingCall';
import axios from 'axios';
import './Chat.css';

const ChatLayout = () => {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); // { userId: count }
  const [lastMessages, setLastMessages] = useState({}); // { userId: message }

  const webrtc = useWebRTC(socket);
  const isMobile = () => window.innerWidth <= 768;

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    // Reset unread count for this user
    setUnreadCounts((prev) => ({ ...prev, [u._id]: 0 }));
    if (isMobile()) setShowSidebar(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
    setSelectedUser(null);
  };

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await axios.get('/api/auth/users');
      setUsers(data.users);
    };
    fetchUsers();
  }, []);

  // Load message history
  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      const { data } = await axios.get(`/api/messages/${selectedUser._id}`);
      setMessages(data.messages);
    };
    fetchMessages();
  }, [selectedUser]);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('message:receive', (message) => {
      const senderId = message.sender?._id || message.sender;

      // Update last message
      setLastMessages((prev) => ({ ...prev, [senderId]: message }));

      if (selectedUser && senderId === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
      } else {
        // Increment unread message count
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    });

    socket.on('message:sent', (message) => {
      setMessages((prev) => [...prev, message]);
      const receiverId = message.receiver?._id || message.receiver;
      setLastMessages((prev) => ({ ...prev, [receiverId]: message }));
    });

    // Handle calls
    socket.on('call:incoming', ({ callerId, callType, offer }) => {
      const caller = users.find((u) => u._id === callerId);
      const callerName = caller?.username || 'Inconnu';
      setIncomingCall({ callerId, callType, offer, callerName });
      webrtc.setCallerId(callerId);
      webrtc.setCallType(callType);
      webrtc.setCallStatus('receiving');
    });

    socket.on('call:answered', webrtc.handleCallAnswered);
    socket.on('call:ice-candidate', webrtc.handleICECandidate);

    socket.on('call:ended', () => {
      webrtc.endCall();
      showToast({ title: 'Appel terminé', type: 'info' });
    });

    socket.on('call:rejected', () => {
      webrtc.endCall();
      showToast({ title: 'Appel refusé', message: 'L\'utilisateur a refusé l\'appel', type: 'error' });
    });

    socket.on('call:unavailable', () => {
      webrtc.endCall();
      showToast({ title: 'Utilisateur indisponible', message: 'Impossible de joindre l\'utilisateur', type: 'warning' });
    });

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
  }, [socket, selectedUser, users, webrtc, showToast]);

  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      webrtc.answerCall(incomingCall.callerId, incomingCall.offer, incomingCall.callType);
      const caller = users.find((u) => u._id === incomingCall.callerId);
      if (caller) {
        setSelectedUser(caller);
        if (isMobile()) setShowSidebar(false);
      }
      setIncomingCall(null);
    }
  }, [incomingCall, webrtc, users]);

  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      webrtc.rejectCall(incomingCall.callerId);
      setIncomingCall(null);
    }
  }, [incomingCall, webrtc]);

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'sidebar-visible' : 'sidebar-hidden'}`}>
        <div className="sidebar-header">
          <div className="user-info">
            <div className="avatar gradient-bg">{user?.username?.[0]?.toUpperCase()}</div>
            <span className="username gradient-text">{user?.username}</span>
          </div>
          <button onClick={logout} className="logout-btn" title="Déconnexion">⏻</button>
        </div>

        <UserList
          users={users}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          unreadCounts={unreadCounts}
          lastMessages={lastMessages}
        />

        {/* Signature */}
        <a
          href="https://github.com/VoaybeDev"
          target="_blank"
          rel="noopener noreferrer"
          className="signature"
        >
          Built by VoaybeDev
        </a>
      </div>

      {/* Main Content */}
      <div className={`main-content ${!showSidebar ? 'main-full' : ''}`}>
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            onlineUsers={onlineUsers}
            onStartCall={(type) => webrtc.startCall(selectedUser._id, type)}
            onBack={handleBack}
            showBackButton={!showSidebar}
            showToast={showToast}
          />
        ) : (
          <div className="no-chat">
            <div className="no-chat-icon">💬</div>
            <h2 className="gradient-text">Sélectionnez une conversation</h2>
            <p>Choisissez un utilisateur pour commencer</p>
          </div>
        )}
      </div>

      {/* Modals */}
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