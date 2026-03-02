// client/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------- Helpers storage ----------
  const persist = useCallback((u, t) => {
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");

    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  }, []);

  // ---------- Actions ----------
  const login = useCallback((u, t) => {
    setUser(u);
    setToken(t);
    persist(u, t);
  }, [persist]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    persist(null, null);
  }, [persist]);

  // (optionnel) si tu as une fonction register dans ce context
  // et qu'elle fait juste comme login :
  const register = useCallback((u, t) => {
    setUser(u);
    setToken(t);
    persist(u, t);
  }, [persist]);

  // ---------- Init from localStorage ----------
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch (e) {
      // ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!token;

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      login,
      logout,
      register,
    }),
    [user, token, loading, isAuthenticated, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);