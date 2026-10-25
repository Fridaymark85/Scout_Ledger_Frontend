// Thin wrappers over the Django API; maps backend (snake_case) payloads to the shape the pages render.
import api from "../api";

// DRF returns either a plain array or {results: [...]} when pagination is on.
const unwrap = (data) => (Array.isArray(data) ? data : data.results ?? []);

const mapItem = (i) => ({
  id: i.id, type: i.item_type === "MATERIAL" ? "Material" : "Service", shortText: i.short_text,
  quantity: i.quantity, unit: i.unit_of_measure, deliveryDate: i.delivery_date,
  purchasingGroup: i.purchasing_group, totalValue: i.total_value, plant: i.plant,
  storageLocation: i.storage_location, requisitioner: i.requisitioner, materialGroup: i.material_group,
  grossPrice: i.gross_price, currency: i.currency, costCenter: i.cost_center,
});

const mapRequest = (r) => ({
  id: r.id, prNumber: r.pr_number, headerNote: r.header_note, status: r.status,
  requesterId: r.requestor, requesterName: r.requestor_name,
  items: r.items.map(mapItem),
  approvals: r.steps.map((s) => ({
    stepId: s.id, approverId: s.approver, approverName: s.approver_name,
    decision: s.status, comment: s.comments,
  })),
});

export const requisitions = {
  list: () => api.get("/api/requisitions/").then((r) => unwrap(r.data).map(mapRequest)),
  get: (id) => api.get(`/api/requisitions/${id}/`).then((r) => mapRequest(r.data)),
  // Moves DRAFT -> PENDING with the ordered approver chain.
  submit: (id, approverIds) =>
    api.post(`/api/requisitions/${id}/submit/`, { approver_ids: approverIds }),
  // Approver or admin override decision on one step.
  decide: (stepId, status, comments) =>
    api.patch(`/api/approval-steps/${stepId}/`, { status, comments }),
  reassign: (stepId, approverId) =>
    api.post(`/api/approval-steps/${stepId}/reassign/`, { approver_id: approverId }),
  // Streams the SAP .xlsx (blob) and triggers a native browser download.
  async exportSheet(id, prNumber) {
    const res = await api.get(`/api/requisitions/${id}/export/`, { responseType: "blob" }).catch(async (e) => {
      // Error bodies also arrive as blobs; decode to a readable message.
      const body = e.response?.data instanceof Blob ? await e.response.data.text() : "";
      try { e.response.data = JSON.parse(body); } catch { /* keep original */ }
      throw e;
    });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prNumber}.xlsx`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const people = {
  approvers: () => api.get("/api/users/approvers/").then((r) => r.data), // [{id, name}]
  list: () => api.get("/api/users/").then((r) => unwrap(r.data)),
  update: (id, patch) => api.patch(`/api/users/${id}/`, patch),
};

// Best readable message from a DRF/axios error (blob errors are not parsed).
export const errorMessage = (e) => {
  const d = e.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d)) return d.join(" ");
  if (d && typeof d === "object" && !(d instanceof Blob)) return JSON.stringify(d);
  return e.message || "Request failed";
};
