import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { baseURL } from "../lib/api";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const s = io(baseURL, {
      transports: ["polling", "websocket"],
      auth: { token },
      withCredentials: true,
    });

    s.on("connect", () => {
      console.log("Socket connecté:", s.id);
      // Signaler que je suis en ligne
      if (user?._id) s.emit("user:online", user._id);
    });

    // Mise à jour liste users en ligne
    s.on("users:online", (userIds) => {
      setOnlineUsers(Array.isArray(userIds) ? userIds : []);
    });

    s.on("user:connected", (userId) => {
      setOnlineUsers((prev) => prev.includes(userId) ? prev : [...prev, userId]);
    });

    s.on("user:disconnected", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    s.on("disconnect", () => {
      console.log("Socket déconnecté");
      setOnlineUsers([]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [isAuthenticated, token, user?._id]);

  const value = useMemo(() => ({ socket, onlineUsers }), [socket, onlineUsers]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};
