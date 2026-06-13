import { api } from "@/lib/api";

export interface SlotRequestUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface SlotRequest {
  id: string;
  slotName: string;
  kickUsername: string;
  userId: string | null;
  status: "PENDING" | "ADDED" | "REJECTED";
  requestedAt: string;
  user: SlotRequestUser | null;
}

export const slotRequestApi = {
  getStatus: () => api.get("/api/slot-requests/status").then((d) => d.open as boolean),
  getAll: () => api.get("/api/slot-requests").then((d) => d.requests as SlotRequest[]),
  getPending: () => api.get("/api/slot-requests/pending").then((d) => d.requests as SlotRequest[]),
  open: () => api.post("/api/slot-requests/open", {}),
  close: () => api.post("/api/slot-requests/close", {}),
  markAdded: (id: string) => api.patch(`/api/slot-requests/${id}/add`, {}),
  markRejected: (id: string) => api.patch(`/api/slot-requests/${id}/reject`, {}),
  delete: (id: string) => api.delete(`/api/slot-requests/${id}`),
  clearPending: () => api.delete("/api/slot-requests/clear"),
};
