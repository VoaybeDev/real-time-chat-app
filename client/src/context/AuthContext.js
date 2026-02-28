// client/src/context/AuthContext.js
import React, { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const SERVER_URL = process.env.REACT_APP_SERVER_URL;

  // IMPORTANT : baseURL doit pointer vers le BACKEND
  const api = useMemo(() => {
    if (!SERVER_URL) {
      console.error("REACT_APP_SERVER_URL manquant !");
    }
    return axios.create({
      baseURL: `${SERVER_URL}/api`,
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
  }, [SERVER_URL]);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur de connexion";
      console.error("LOGIN ERROR", { status, message, err });
      return { ok: false, status, message };
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post("/auth/register", payload);
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur inscription";
      console.error("REGISTER ERROR", { status, message, err });
      return { ok: false, status, message };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);