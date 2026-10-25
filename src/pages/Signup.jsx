// Public sign-up: first account becomes the admin, later ones wait for admin approval.
import { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../api";
import { errorMessage } from "../api/requisitions";
import PasswordInput from "../components/PasswordInput";

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await register(form);
      setMessage(
        res.role === "ADMIN"
          ? "Admin account created successfully. You may now log in."
          : "Account created. Pending Admin approval.",
      );
    } catch (err) {
      setError(err.response?.status === 429 ? "Too many sign-ups. Try again later." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (message) {
    return (
      <div className="card login">
        <h2>Scout Ledger</h2>
        <p>{message}</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Create account</h2>
      <label className="field">
        <span>Username</span>
        <input required autoComplete="username" value={form.username} onChange={set("username")} />
      </label>
      <label className="field">
        <span>Email</span>
        <input required type="email" autoComplete="email" value={form.email} onChange={set("email")} />
      </label>
      <label className="field">
        <span>Password</span>
        <PasswordInput autoComplete="new-password" value={form.password} onChange={set("password")} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? "Creating…" : "Sign up"}</button>
      <p><small>Already have an account? <Link to="/login">Sign in</Link></small></p>
    </form>
  );
}
