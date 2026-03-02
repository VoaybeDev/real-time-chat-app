import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./Auth.css";

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

const Login = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = useMemo(
    () => normalizeUrl(process.env.REACT_APP_SERVER_URL),
    []
  );

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,             // ex: https://voaybe-voaybe-chat-api.hf.space
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
  }, [API_BASE]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!API_BASE) {
      setError("REACT_APP_SERVER_URL manquant sur Vercel (Environment Variables).");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", form);
      login(data.user, data.token);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur de connexion";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>💬 ChatApp</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ?{" "}
          <span onClick={onSwitch}>Créer un compte</span>
        </p>

        {/* petit debug utile */}
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          API: {API_BASE || "MISSING"}
        </div>
      </div>
    </div>
  );
};

export default Login;