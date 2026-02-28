// client/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const SERVER_URL = process.env.REACT_APP_SERVER_URL;

  const api = axios.create({
    baseURL: `${SERVER_URL}/api`,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur de connexion";

      console.error("LOGIN ERROR:", { status, msg, err });
      return { ok: false, status, message: msg };
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post("/auth/register", payload);
      setUser(res.data?.user || null);
      return { ok: true, data: res.data };
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur d'inscription";

      console.error("REGISTER ERROR:", { status, msg, err });
      return { ok: false, status, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);