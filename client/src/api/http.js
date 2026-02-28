import axios from "axios";

const SERVER_URL = (process.env.REACT_APP_SERVER_URL || "").replace(/\/$/, "");

if (!SERVER_URL) {
  // Tsy crash fa manampy debug
  // eslint-disable-next-line no-console
  console.warn("⚠️ REACT_APP_SERVER_URL is missing");
}

const http = axios.create({
  baseURL: SERVER_URL, // oh: https://voaybe-voaybe-chat-api.hf.space
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default http;