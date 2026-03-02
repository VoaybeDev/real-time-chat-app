import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useToast } from "../UI/Toast";
import UserList from "./UserList";
import ChatWindow from "./ChatWindow";
import CallModal from "../Call/CallModal";
import IncomingCall from "../Call/IncomingCall";
import axios from "axios";
import "./Chat.css";

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

  // --- API client (prod + local) ---
  const api = useMemo(() => {
    // REACT_APP_SERVER_URL doit être: https://voaybe-voaybe-chat-api.hf.space (sans /api)
    const base =
      process.env.REACT_APP_SERVER_URL?.replace(/\/+$/, "") || "";
    const baseURL = base ? `${base}/api` : "/api";

    const instance = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 20000,
    });

    instance.interceptors.request.use((config) => {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        "";
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
  }, []);

  const webrtc = useWebRTC(socket);
  const webrtcRef = useRef(webrtc);
  useEffect(() => {
    webrtcRef.current = webrtc;
  }, [webrtc]);

  const isMobile = () => window.innerWidth <= 768;

  const handleSelectUser = useCallback((u) => {
    setSelectedUser(u);
    setUnreadCounts((prev) => ({ ...prev, [u._id]: 0 }));
    if (isMobile()) setShowSidebar(false);
  }, []);

  const handleBack = useCallback(() => {
    setShowSidebar(true);
    setSelectedUser(null);
  }, []);

  // --------------------
  // Load users
  // --------------------
  useEffect(() => {
    let alive = true;

    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/auth/users");

        const list = Array.isArray(data?.users) ? data.users : [];
        // Retire moi-même si l’API renvoie tous les users
        const filtered = user?._id
          ? list.filter((u) => u._id !== user._id)
          : list;

        if (alive) setUsers(filtered);
      } catch (err) {
        console.error("fetchUsers error:", err);
        showToast({
          title: "Erreur",
          message: "Impossible de charger les utilisateurs",
          type: "error",
        });
        if (alive) setUsers([]);
      }
    };

    fetchUsers();
    return () => {
      alive = false;
    };
  }, [api, showToast, user?._id]);

  // --------------------
  // Load message history
  // --------------------
  useEffect(() => {
    if (!selectedUser?._id) return;
    let alive = true;

    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedUser._id}`);
        const list = Array.isArray(data?.messages) ? data.messages : [];
        if (alive) setMessages(list);

        // reset unread for opened chat
        setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
      } catch (err) {
        console.error("fetchMessages error:", err);
        showToast({
          title: "Erreur",
          message: "Impossible de charger les messages",
          type: "error",
        });
        if (alive) setMessages([]);
      }
    };

    fetchMessages();
    return () => {
      alive = false;
    };
  }, [api, selectedUser?._id, showToast]);

  // --------------------
  // Socket listeners
  // --------------------
  useEffect(() => {
    if (!socket) return;

    const onMessageReceive = (message) => {
      const senderId = message?.sender?._id || message?.sender;
      if (!senderId) return;

      setLastMessages((prev) => ({ ...prev, [senderId]: message }));

      // si on est dans la conversation avec ce sender => append
      if (selectedUser?._id && senderId === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    const onMessageSent = (message) => {
      // message envoyé depuis moi => append seulement si chat ouvert correspond
      const receiverId = message?.receiver?._id || message?.receiver;
      if (receiverId) {
        setLastMessages((prev) => ({ ...prev, [receiverId]: message }));
      }
      if (selectedUser?._id && receiverId === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const onCallIncoming = ({ callerId, callType, offer }) => {
      const caller = users.find((u) => u._id === callerId);
      const callerName = caller?.username || "Inconnu";

      setIncomingCall({ callerId, callType, offer, callerName });

      const w = webrtcRef.current;
      w.setCallerId?.(callerId);
      w.setCallType?.(callType);
      w.setCallStatus?.("receiving");
    };

    const onCallEnded = () => {
      const w = webrtcRef.current;
      w.endCall?.();
      showToast({ title: "Appel terminé", type: "info" });
    };

    const onCallRejected = () => {
      const w = webrtcRef.current;
      w.endCall?.();
      showToast({
        title: "Appel refusé",
        message: "L'utilisateur a refusé l'appel",
        type: "error",
      });
    };

    const onCallUnavailable = () => {
      const w = webrtcRef.current;
      w.endCall?.();
      showToast({
        title: "Utilisateur indisponible",
        message: "Impossible de joindre l'utilisateur",
        type: "warning",
      });
    };

    socket.on("message:receive", onMessageReceive);
    socket.on("message:sent", onMessageSent);

    socket.on("call:incoming", onCallIncoming);
    socket.on("call:answered", webrtcRef.current.handleCallAnswered);
    socket.on("call:ice-candidate", webrtcRef.current.handleICECandidate);
    socket.on("call:ended", onCallEnded);
    socket.on("call:rejected", onCallRejected);
    socket.on("call:unavailable", onCallUnavailable);

    return () => {
      socket.off("message:receive", onMessageReceive);
      socket.off("message:sent", onMessageSent);

      socket.off("call:incoming", onCallIncoming);
      socket.off("call:answered", webrtcRef.current.handleCallAnswered);
      socket.off("call:ice-candidate", webrtcRef.current.handleICECandidate);
      socket.off("call:ended", onCallEnded);
      socket.off("call:rejected", onCallRejected);
      socket.off("call:unavailable", onCallUnavailable);
    };
  }, [socket, selectedUser?._id, users, showToast]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;

    const w = webrtcRef.current;
    w.answerCall?.(
      incomingCall.callerId,
      incomingCall.offer,
      incomingCall.callType
    );

    const caller = users.find((u) => u._id === incomingCall.callerId);
    if (caller) {
      setSelectedUser(caller);
      setUnreadCounts((prev) => ({ ...prev, [caller._id]: 0 }));
      if (isMobile()) setShowSidebar(false);
    }

    setIncomingCall(null);
  }, [incomingCall, users]);

  const handleRejectCall = useCallback(() => {
    if (!incomingCall) return;
    const w = webrtcRef.current;
    w.rejectCall?.(incomingCall.callerId);
    setIncomingCall(null);
  }, [incomingCall]);

  const displayUserInitial = user?.username?.[0]?.toUpperCase?.() || "?";

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div
        className={`sidebar ${
          showSidebar ? "sidebar-visible" : "sidebar-hidden"
        }`}
      >
        <div className="sidebar-header">
          <div className="user-info">
            <div className="avatar gradient-bg">{displayUserInitial}</div>
            <span className="username gradient-text">
              {user?.username || "Utilisateur"}
            </span>
          </div>
          <button onClick={logout} className="logout-btn" title="Déconnexion">
            ⏻
          </button>
        </div>

        <UserList
          users={users}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          unreadCounts={unreadCounts}
          lastMessages={lastMessages}
        />

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
      <div className={`main-content ${!showSidebar ? "main-full" : ""}`}>
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
      {(webrtc.callStatus === "calling" || webrtc.callStatus === "in-call") && (
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