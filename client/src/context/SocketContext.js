import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

// ⚠️ Utilise la variable d'environnement, jamais localhost hardcodé
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SERVER_URL, {  // ← était 'http://localhost:5000' hardcodé
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('✅ Socket connecté:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket déconnecté');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Erreur socket:', err.message);
    });

    socket.on('users:online', (users) => setOnlineUsers(users));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);