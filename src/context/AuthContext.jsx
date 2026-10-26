// Holds the logged-in user and exposes login/logout backed by the Django JWT API.
import { createContext, useContext, useState } from "react";
import api, { login as apiLogin, tokens } from "../api";
import { ROLES } from "../constants";

const AuthContext = createContext(null);

// Backend role enum -> role keys the existing UI already uses.
const ROLE_MAP = {
  REQUESTOR: ROLES.REQUESTER,
  SENIOR_APPROVER: ROLES.APPROVER,
  ADMIN: ROLES.ADMIN,
  PURCHASING_AGENT: ROLES.ADMIN,
};

const toUiUser = (u) => ({
  id: u.id,
  name: `${u.first_name} ${u.last_name}`.trim() || u.username,
  email: u.email,
  role: ROLE_MAP[u.role] ?? ROLES.REQUESTER,
});

export function AuthProvider({ children }) {
  // Profile is cached for refresh; the JWTs themselves live in localStorage (see api.ts).
  const [user, setUser] = useState(() =>
    tokens.access ? JSON.parse(sessionStorage.getItem("user") || "null") : null,
  );

  const login = async (username, password) => {
    await apiLogin(username, password); // stores access_token + refresh_token
    try {
      const { data } = await api.get("/api/users/me/");
      const u = toUiUser(data);
      sessionStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    } catch (e) {
      tokens.clear(); // don't stay half-logged-in if the profile call fails
      throw e;
    }
  };

  const logout = () => {
    tokens.clear();
    sessionStorage.removeItem("user");
    setUser(null); // Layout sees no user and routes to /login without a page reload (a reload 404s on static hosts)
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
