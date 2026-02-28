import React, { createContext, useContext, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const register = async (username, email, password) => {
    try {
      const res = await api.post("/auth/register", { username, email, password });
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      console.error("REGISTER ERROR:", err?.response?.data || err?.message);
      return {
        ok: false,
        status: err?.response?.status,
        message: err?.response?.data?.message || "Erreur d'inscription",
      };
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      console.error("LOGIN ERROR:", err?.response?.data || err?.message);
      return {
        ok: false,
        status: err?.response?.status,
        message: err?.response?.data?.message || "Erreur de connexion",
      };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);