import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./Auth.css";

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, "") : "");

const Register = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = useMemo(
    () => normalizeUrl(process.env.REACT_APP_SERVER_URL),
    []
  );

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
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

    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 6) {
      setError("Mot de passe minimum 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      login(data.user, data.token);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur d'inscription";
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
          <p>Créer votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

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
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              name="confirm"
              placeholder="••••••••"
              value={form.confirm}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Inscription..." : "Créer le compte"}
          </button>
        </form>

        <p className="auth-switch">
          Déjà un compte ?{" "}
          <span onClick={onSwitch}>Se connecter</span>
        </p>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          API: {API_BASE || "MISSING"}
        </div>
      </div>
    </div>
  );
};

export default Register;