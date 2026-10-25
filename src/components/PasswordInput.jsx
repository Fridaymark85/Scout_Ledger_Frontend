// Password input with a show/hide toggle.
import { useState } from "react";

export default function PasswordInput({ value, onChange, autoComplete, required = true }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        style={{ flex: 1 }}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
      />
      <button type="button" className="btn small" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}
