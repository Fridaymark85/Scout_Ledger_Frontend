// Account settings: change username/password (admin hand-over); logs out afterwards.
import { useState } from "react";
import { updateCredentials } from "../api";
import { errorMessage } from "../api/requisitions";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function AccountSettings() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ current_password: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // Send only the fields the user filled in.
    const body = { current_password: form.current_password };
    if (form.username.trim()) body.username = form.username.trim();
    if (form.password) body.password = form.password;
    if (!body.username && !body.password) return setError("Enter a new username and/or a new password.");

    setBusy(true);
    setError("");
    try {
      await updateCredentials(body);
      logout(); // clears tokens and sends the user to the login page
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Account settings</h2>
      <p><small>You will be signed out after saving and must log in with the new details.</small></p>
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
      <button className="btn primary block" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
