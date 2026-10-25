// Mock API backed by localStorage so the workflow runs without a backend.
// Every function is async and mirrors the REST endpoints of the Django backend, so
// swapping to real fetch() calls later is local to this file.
import { ROLES, STATUS } from "../constants";

const KEY = "scout-ledger-db-v2";

// Seed users: one requester, three senior approvers, one purchasing admin.
const seed = {
  users: [
    { id: 1, name: "Riya Requester", email: "requester@demo.com", role: ROLES.REQUESTER, active: true },
    { id: 2, name: "Manoj Manager", email: "manager@demo.com", role: ROLES.APPROVER, active: true },
    { id: 3, name: "Farah Finance", email: "finance@demo.com", role: ROLES.APPROVER, active: true },
    { id: 4, name: "Dev Director", email: "director@demo.com", role: ROLES.APPROVER, active: true },
    { id: 5, name: "Pooja Purchasing", email: "admin@demo.com", role: ROLES.ADMIN, active: true },
  ],
  requests: [],
  nextId: 1,
  nextUserId: 6,
};

const load = () => JSON.parse(localStorage.getItem(KEY) || "null") || seed;
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const now = () => new Date().toISOString();
const find = (db, id) => db.requests.find((r) => r.id === Number(id));

// Recompute request status from its approvals: any rejection rejects; all approved approves.
const recompute = (req) => {
  if (req.status === STATUS.PO_REQUESTED) return;
  if (req.approvals.some((a) => a.decision === "REJECTED")) req.status = STATUS.REJECTED;
  else if (req.approvals.every((a) => a.decision === "APPROVED")) req.status = STATUS.APPROVED;
  else req.status = STATUS.PENDING;
};

export const api = {
  // POST /auth/login (demo: email only)
  async login(email) {
    const user = load().users.find((u) => u.email === email.trim().toLowerCase() && u.active);
    if (!user) throw new Error("Unknown or inactive user");
    return user;
  },

  async listUsers() {
    return load().users;
  },

  // GET /requests – requesters see their own; approvers & admin see everything.
  async listRequests(user) {
    const { requests } = load();
    if (user.role === ROLES.REQUESTER) return requests.filter((r) => r.requesterId === user.id);
    return requests;
  },

  async getRequest(id) {
    return find(load(), id);
  },

  // POST /requests – one pending approval row per active senior approver.
  async createRequest(user, { headerNote, items }) {
    const db = load();
    const approvals = db.users
      .filter((u) => u.role === ROLES.APPROVER && u.active)
      .map((u) => ({ approverId: u.id, approverName: u.name, decision: "PENDING", comment: "", at: null }));
    const req = {
      id: db.nextId++,
      prNumber: `PR-${String(db.nextId - 1).padStart(5, "0")}`,
      headerNote,
      items,
      requesterId: user.id,
      requesterName: user.name,
      status: STATUS.PENDING,
      approvals,
      createdAt: now(),
      poRef: null,
    };
    db.requests.push(req);
    save(db);
    return req;
  },

  // PATCH /approval-steps/:id – an approver decides on their own step.
  async decide(id, user, decision, comment) {
    const db = load();
    const req = find(db, id);
    const row = req.approvals.find((a) => a.approverId === user.id);
    if (!row) throw new Error("Not an approver for this request");
    Object.assign(row, { decision, comment, at: now() });
    recompute(req);
    save(db);
    return req;
  },

  // ADMIN: decide any pending step on behalf of its approver (audited in the comment).
  async adminDecide(id, admin, approverId, decision, comment) {
    const db = load();
    const req = find(db, id);
    const row = req.approvals.find((a) => a.approverId === approverId);
    Object.assign(row, { decision, comment: `[Admin override by ${admin.name}] ${comment}`.trim(), at: now() });
    recompute(req);
    save(db);
    return req;
  },

  // ADMIN: POST /approval-steps/:id/reassign – hand a pending step to another approver.
  async reassign(id, approverId, newApproverId) {
    const db = load();
    const req = find(db, id);
    const target = db.users.find((u) => u.id === newApproverId);
    if (req.approvals.some((a) => a.approverId === newApproverId)) throw new Error("Already in this chain");
    Object.assign(req.approvals.find((a) => a.approverId === approverId), {
      approverId: target.id,
      approverName: target.name,
    });
    save(db);
    return req;
  },

  // ADMIN: add a senior approver to the pool.
  async addApprover(name, email) {
    const db = load();
    if (db.users.some((u) => u.email === email.toLowerCase())) throw new Error("Email already exists");
    db.users.push({ id: db.nextUserId++, name, email: email.toLowerCase(), role: ROLES.APPROVER, active: true });
    save(db);
  },

  // ADMIN: enable/disable a user (disabled approvers are skipped for new requests).
  async setActive(userId, active) {
    const db = load();
    db.users.find((u) => u.id === userId).active = active;
    save(db);
  },

  // POST /requests/:id/po – only for fully approved requests; real backend will call SAP.
  async requestPO(id) {
    const db = load();
    const req = find(db, id);
    if (req.status !== STATUS.APPROVED) throw new Error("Request not fully approved");
    req.status = STATUS.PO_REQUESTED;
    req.poRef = `PO-REQ-${String(req.id).padStart(5, "0")}`;
    save(db);
    return req;
  },
};
