// client/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  // Charge la session au démarrage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("chat_token");
      const savedUser = localStorage.getItem("chat_user");

      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSession = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("chat_token", nextToken);
    localStorage.setItem("chat_user", JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data.user, data.token);
    return data;
  };

  const register = async (username, email, password) => {
    const { data } = await api.post("/auth/register", { username, email, password });
    saveSession(data.user, data.token);
    return data;
  };

  const logout = () => {
    clearSession();
  };

  // Ajoute le token automatiquement sur les requêtes
  useEffect(() => {
    const id = api.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => api.interceptors.request.eject(id);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated, loading, login, register, logout }),
    [user, token, isAuthenticated, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);