// Request detail: items, approval chain, approver actions, and purchasing-admin controls.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { requisitions, people, errorMessage } from "../api/requisitions";
import { useAuth } from "../context/AuthContext";
import { itemValue, ROLES, STATUS } from "../constants";
import StatusBadge from "../components/StatusBadge";

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [req, setReq] = useState(null);
  const [approvers, setApprovers] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const load = () => requisitions.get(id).then(setReq).catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    load();
    people.approvers().then(setApprovers).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  const isAdmin = user.role === ROLES.ADMIN;
  const myApproval = req.approvals.find((a) => a.approverId === user.id);
  const canDecide = user.role === ROLES.APPROVER && myApproval?.decision === "PENDING" && req.status === STATUS.PENDING;
  const canSubmit = user.role === ROLES.REQUESTER && req.status === STATUS.DRAFT;
  const total = req.items.reduce((s, i) => s + itemValue(i), 0);
  const materials = req.items.filter((i) => i.type === "Material");
  const services = req.items.filter((i) => i.type === "Service");

  // Run an API call, reload the request, and surface errors.
  const run = (p) =>
    p.then(load).then(() => { setComment(""); setError(""); }).catch((e) => setError(errorMessage(e)));

  return (
    <div className="card">
      <h2>{req.prNumber} <StatusBadge status={req.status} /></h2>
      <p><strong>Requester:</strong> {req.requesterName}<br /><strong>Header note:</strong> {req.headerNote}</p>

      {materials.length > 0 && (
        <>
          <h3>Materials</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Short text</th><th>Qty</th><th>UOM</th><th>Delivery</th><th>Purch. grp</th><th>Total value</th>
                  <th>Plant</th><th>Stor. loc.</th><th>Requisitioner</th><th>Mat. group</th></tr>
              </thead>
              <tbody>
                {materials.map((i, n) => (
                  <tr key={n}><td>{i.shortText}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.deliveryDate}</td>
                    <td>{i.purchasingGroup}</td><td>{i.totalValue}</td><td>{i.plant}</td><td>{i.storageLocation}</td>
                    <td>{i.requisitioner}</td><td>{i.materialGroup}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {services.length > 0 && (
        <>
          <h3>Services</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Short text</th><th>Qty</th><th>UOM</th><th>Gross price</th><th>Currency</th><th>Cost center</th></tr></thead>
              <tbody>
                {services.map((i, n) => (
                  <tr key={n}><td>{i.shortText}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.grossPrice}</td>
                    <td>{i.currency}</td><td>{i.costCenter}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p><strong>Estimated total: {total.toFixed(2)}</strong></p>

      <h3>Approvals</h3>
      <ul className="approvals">
        {req.approvals.map((a) => {
          const pending = a.decision === "PENDING" && req.status === STATUS.PENDING;
          return (
            <li key={a.approverId}>
              {a.approverName}: <span className={`badge ${a.decision}`}>{a.decision}</span>
              {a.comment && <em> — “{a.comment}”</em>}
              {isAdmin && pending && (
                <span className="admin-actions">
                  <select defaultValue="" onChange={(e) => e.target.value && run(requisitions.reassign(a.stepId, Number(e.target.value)))}>
                    <option value="">Reassign to…</option>
                    {approvers.filter((u) => !req.approvals.some((x) => x.approverId === u.id))
                      .map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button className="btn small" onClick={() => run(requisitions.decide(a.stepId, "APPROVED", comment))}>Approve for them</button>
                  <button className="btn small danger" onClick={() => run(requisitions.decide(a.stepId, "REJECTED", comment))}>Reject for them</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {(canDecide || (isAdmin && req.status === STATUS.PENDING)) && (
        <input placeholder={isAdmin ? "Comment for admin override (optional)" : "Comment (optional)"} value={comment} onChange={(e) => setComment(e.target.value)} />
      )}
      {canSubmit && (
        <div>
          {/* Chain = all active senior approvers in listed order */}
          <button className="btn primary" disabled={approvers.length === 0}
            onClick={() => run(requisitions.submit(id, approvers.map((a) => a.id)))}>Submit for approval</button>
        </div>
      )}
      {canDecide && (
        <div>
          <button className="btn primary" onClick={() => run(requisitions.decide(myApproval.stepId, "APPROVED", comment))}>Approve</button>
          <button className="btn danger" onClick={() => run(requisitions.decide(myApproval.stepId, "REJECTED", comment))}>Reject</button>
        </div>
      )}

      {isAdmin && [STATUS.APPROVED, STATUS.PO_REQUESTED].includes(req.status) && (
        <div>
          {req.status === STATUS.APPROVED ? (
            // Export streams the SAP .xlsx and moves the request to "PO requested".
            <button className="btn primary" onClick={() => run(requisitions.exportSheet(req.id, req.prNumber))}>
              Download SAP sheet &amp; request PO
            </button>
          ) : (
            <strong>PO requested — sheet already exported.</strong>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
