// client/src/lib/api.js
import axios from "axios";

const SERVER_URL = process.env.REACT_APP_SERVER_URL;

if (!SERVER_URL) {
  // Ça aide à diagnostiquer si Vercel n'injecte pas la variable
  console.warn("REACT_APP_SERVER_URL is missing in frontend build");
}

export const api = axios.create({
  baseURL: SERVER_URL ? `${SERVER_URL}/api` : "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ok même si tu n'utilises pas cookies
});