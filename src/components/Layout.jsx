// App shell: top bar with navigation and current user; wraps protected pages.
import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_LABEL } from "../constants";

export default function Layout() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="topbar">
        <strong>Scout Ledger</strong>
        <nav>
          <Link to="/">Requests</Link>
          {user.role === ROLES.REQUESTER && <Link to="/new">New request</Link>}
          {user.role === ROLES.ADMIN && <Link to="/admin">Admin</Link>}
          <Link to="/account">Account</Link>
        </nav>
        <span className="user">
          {user.name} <small>({ROLE_LABEL[user.role]})</small>
          <button className="btn small" onClick={logout}>Logout</button>
        </span>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
