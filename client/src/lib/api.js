import axios from "axios";

const baseURL =
  process.env.REACT_APP_SERVER_URL?.replace(/\/$/, "") || "http://localhost:5000";

const api = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true, // OK même si tu n'utilises pas de cookies
  headers: { "Content-Type": "application/json" },
});

// Ajoute automatiquement Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { baseURL };