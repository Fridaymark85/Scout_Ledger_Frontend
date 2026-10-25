// Shared enums/labels for roles and request statuses (mirror the DB enums).

export const ROLES = {
  REQUESTER: "requester", // creates material/service requests
  APPROVER: "approver", // senior member; approves/rejects
  ADMIN: "admin", // purchasing admin: full control, final export & SAP PO request
};

export const ROLE_LABEL = {
  requester: "Requester",
  approver: "Senior approver",
  admin: "Purchasing admin",
};

export const STATUS = {
  DRAFT: "DRAFT", // saved, not yet sent to approvers
  PENDING: "PENDING", // waiting on senior approvers
  APPROVED: "APPROVED", // all seniors approved
  REJECTED: "REJECTED",
  PO_REQUESTED: "EXPORTED", // SAP sheet exported / PO requested
};

export const STATUS_LABEL = {
  DRAFT: "Draft",
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPORTED: "PO requested",
};

export const ITEM_TYPES = ["Material", "Service"];
export const UNITS = ["EA", "KG", "L", "M", "HR", "LOT"];
export const CURRENCIES = ["INR", "USD", "EUR"];
export const MATERIAL_GROUPS = [
  { code: "05147", label: "05147 (B/O drones - Domestic)" },
  { code: "13147", label: "13147 (B/O drones - Import)" },
];

// Defaults from the requirement sheet.
export const DEFAULTS = { purchasingGroup: "77", plant: "7206", storageLocation: "GS27", currency: "INR" };

// Estimated value of one line: budgetary total for materials, qty x gross price for services.
export const itemValue = (it) =>
  it.type === "Material" ? Number(it.totalValue) || 0 : (Number(it.quantity) || 0) * (Number(it.grossPrice) || 0);
