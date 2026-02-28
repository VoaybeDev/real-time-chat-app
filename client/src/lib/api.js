// client/src/lib/api.js
import axios from "axios";

const SERVER_URL = process.env.REACT_APP_SERVER_URL;

if (!SERVER_URL) {
  // ça te dira direct si Vercel n’a pas injecté la variable
  console.error("❌ REACT_APP_SERVER_URL manquant dans le build Vercel");
}

export const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});