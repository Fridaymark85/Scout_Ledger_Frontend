// Sign-in form: username + password against the Django JWT endpoint.
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.username, form.password);
      nav("/");
    } catch (err) {
      setError(err.response?.status === 401 ? "Invalid username or password" : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Scout Ledger</h2>
      <label className="field">
        <span>Username</span>
        <input required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </label>
      <label className="field">
        <span>Password</span>
        <PasswordInput autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p><small>No account? <Link to="/signup">Sign up</Link></small></p>
    </form>
  );
}
