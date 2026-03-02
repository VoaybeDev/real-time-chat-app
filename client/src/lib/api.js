// client/src/lib/api.js
import axios from "axios";

const API_BASE =
  (process.env.REACT_APP_SERVER_URL || "").replace(/\/$/, "") ||
  window.location.origin;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // OK même si tu n'utilises pas les cookies
});

export const getApiBase = () => API_BASE;