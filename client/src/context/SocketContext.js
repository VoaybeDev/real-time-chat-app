// client/src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  const SERVER_URL = process.env.REACT_APP_SERVER_URL;

  useEffect(() => {
    if (!SERVER_URL) {
      console.error("REACT_APP_SERVER_URL manquant !");
      return;
    }

    // IMPORTANT : on laisse polling + websocket pour éviter les erreurs "réseau"
    const s = io(SERVER_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
    });

    s.on("connect", () => {
      console.log("Socket connected ✅", s.id);
    });

    s.on("connect_error", (err) => {
      console.error("Socket connect_error ❌", err?.message || err);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [SERVER_URL]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);