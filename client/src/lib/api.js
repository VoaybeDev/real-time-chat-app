// client/src/lib/api.js
import axios from "axios";

const isBrowser = typeof window !== "undefined";

const raw = process.env.REACT_APP_SERVER_URL || "";
const origin = isBrowser ? window.location.origin : "";

const SERVER = (raw || origin).replace(/\/+$/, "");
const API_BASE = SERVER ? `${SERVER}/api` : "/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

export const getApiBase = () => API_BASE;