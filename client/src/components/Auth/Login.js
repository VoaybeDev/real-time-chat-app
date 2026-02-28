// client/src/components/Auth/Login.js
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./Auth.css";

const Login = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ IMPORTANT: utilise api (baseURL = HF)
      const { data } = await api.post("/auth/login", form);

      // attend { user, token }
      if (!data?.user || !data?.token) {
        console.error("Login response unexpected:", data);
        setError("Réponse serveur invalide (user/token manquant)");
        return;
      }

      login(data.user, data.token);
    } catch (err) {
      console.error("LOGIN ERROR:", err?.response?.data || err?.message || err);
      setError(err?.response?.data?.message || "Erreur de connexion");
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
          <span onClick={onSwitch} role="button" tabIndex={0}>
            Créer un compte
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;