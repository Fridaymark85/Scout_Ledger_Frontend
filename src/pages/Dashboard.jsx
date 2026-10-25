// Request list; requesters see their own, approvers and the purchasing admin see all.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { requisitions } from "../api/requisitions";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");

  // Backend already scopes the list by role (own / assigned / all).
  useEffect(() => {
    requisitions.list().then(setRequests).catch(() => setError("Could not load requests."));
  }, [user]);

  const shown = filter === "ALL" ? requests : requests.filter((r) => r.status === filter);
  const isAdmin = user.role === ROLES.ADMIN;

  return (
    <div className="card">
      <h2>Requests</h2>
      <label>
        Filter by status
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPORTED">PO requested</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      {shown.length === 0 ? (
        <p>No requests.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PR no.</th><th>Header note</th><th>Requester</th><th>Items</th><th>Approvals</th>
                {isAdmin && <th>Waiting on</th>}<th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/requests/${r.id}`}>{r.prNumber}</Link></td>
                  <td>{r.headerNote.slice(0, 40)}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.items.length}</td>
                  <td>{r.approvals.filter((a) => a.decision === "APPROVED").length}/{r.approvals.length}</td>
                  {isAdmin && (
                    <td>{r.approvals.filter((a) => a.decision === "PENDING").map((a) => a.approverName).join(", ") || "—"}</td>
                  )}
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
