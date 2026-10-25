// Colored pill showing a request status.
import { STATUS_LABEL } from "../constants";

export default function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>;
}
