// client/src/lib/api.js
import axios from "axios";

const raw = process.env.REACT_APP_SERVER_URL || "";
const origin = window.location.origin;

// Nettoie les / à la fin
const SERVER = (raw || origin).replace(/\/+$/, "");

// IMPORTANT: l'API est sous /api
const API_BASE = `${SERVER}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

export const getApiBase = () => API_BASE;