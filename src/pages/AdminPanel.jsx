// Purchasing-admin console: status overview and approver management / workload.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requisitions, people, errorMessage } from "../api/requisitions";
import { useAuth } from "../context/AuthContext";
import { ROLES, STATUS, STATUS_LABEL } from "../constants";

// Backend role codes -> display labels.
const ROLE_NAME = {
  REQUESTOR: "Requester", SENIOR_APPROVER: "Senior approver",
  ADMIN: "Purchasing admin", PURCHASING_AGENT: "Purchasing agent",
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  const refresh = () => {
    people.list().then((list) => setUsers(list.map((u) => ({
      id: u.id, name: `${u.first_name} ${u.last_name}`.trim() || u.username, email: u.email,
      role: u.role, active: u.is_active,
    })))).catch((e) => setError(errorMessage(e)));
    requisitions.list().then(setRequests).catch((e) => setError(errorMessage(e)));
  };
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (user.role !== ROLES.ADMIN) return <Navigate to="/" replace />;

  // Pending/decided counts per approver across all requests.
  const stats = (id) => {
    const rows = requests.flatMap((r) => r.approvals.filter((a) => a.approverId === id));
    return { pending: rows.filter((a) => a.decision === "PENDING").length, done: rows.filter((a) => a.decision !== "PENDING").length };
  };

  // PATCH a user (role / active flag), then reload.
  const update = (id, patch) =>
    people.update(id, patch).then(() => { setError(""); refresh(); }).catch((e) => setError(errorMessage(e)));
  return (
    <>
      <div className="card">
        <h2>Overview</h2>
        <div className="stats">
          {Object.values(STATUS).map((s) => (
            <div key={s} className="stat">
              <strong>{requests.filter((r) => r.status === s).length}</strong>
              <span>{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Users &amp; approvers</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Pending</th><th>Decided</th><th>Active</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const s = stats(u.id);
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{u.email}</td>
                    <td>
                      {/* Admin can't change their own role; others get a dropdown that saves on change */}
                      {u.id === user.id ? (ROLE_NAME[u.role] ?? u.role) : (
                        <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                          {Object.entries(ROLE_NAME).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                        </select>
                      )}
                    </td>
                    <td>{u.role === "SENIOR_APPROVER" ? s.pending : "—"}</td>
                    <td>{u.role === "SENIOR_APPROVER" ? s.done : "—"}</td>
                    <td>
                      {u.id !== user.id && (
                        <button className="btn small" onClick={() => update(u.id, { is_active: !u.active })}>
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      )}
                      {u.active ? " Yes" : " No"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="error">{error}</p>}
        <p><small>Change a user's role to "Senior approver" to add them to the approver pool; accounts are created in the Django admin.</small></p>
      </div>
    </>
  );
}
