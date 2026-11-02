// Account settings: change username/password (admin hand-over); logs out afterwards.
import { useState } from "react";
import { updateCredentials } from "../api";
import { errorMessage } from "../api/requisitions";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function AccountSettings() {
  const { user, logout, setEmail } = useAuth();
  const [form, setForm] = useState({ current_password: "", username: "", password: "", email: user.email ?? "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // Send only the fields that changed.
    const body = { current_password: form.current_password };
    if (form.username.trim()) body.username = form.username.trim();
    if (form.password) body.password = form.password;
    const newEmail = form.email.trim();
    if (newEmail && newEmail !== user.email) body.email = newEmail;
    if (!body.username && !body.password && !body.email) return setError("Change your email, username and/or password first.");

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateCredentials(body);
      if (body.username || body.password) {
        logout(); // new login details: clears tokens and sends the user to the login page
      } else {
        setEmail(body.email); // email-only change keeps the session
        setForm({ ...form, current_password: "" });
        setNotice("Email updated.");
        setBusy(false);
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Account settings</h2>
      <p><small>Changing your username or password signs you out; an email change does not.</small></p>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label className="field">
        <span>Current password</span>
        <PasswordInput autoComplete="current-password" value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
      </label>
      <label className="field">
        <span>New username</span>
        <input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </label>
      <label className="field">
        <span>New password</span>
        <PasswordInput required={false} autoComplete="new-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      {error && <p className="error">{error}</p>}
      {notice && <p>{notice}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
