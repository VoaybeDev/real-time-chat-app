// client/src/components/Auth/Register.js
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import "./Auth.css";

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

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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
      // ✅ IMPORTANT: utilise api (baseURL = HF)
      const { data } = await api.post("/auth/register", {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      // attend { user, token }
      if (!data?.user || !data?.token) {
        console.error("Register response unexpected:", data);
        setError("Réponse serveur invalide (user/token manquant)");
        return;
      }

      login(data.user, data.token);
    } catch (err) {
      console.error("REGISTER ERROR:", err?.response?.data || err?.message || err);
      setError(err?.response?.data?.message || "Erreur d'inscription");
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
          <span onClick={onSwitch} role="button" tabIndex={0}>
            Se connecter
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;