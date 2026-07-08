import { api, getAuthHeaders, API_URL } from "@/lib/api";

export interface PickerUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface PickerEntry {
  id: string;
  pickerId: string;
  userId: string;
  enteredAt: string;
  user: PickerUser;
}

export interface PickerWinner {
  id: string;
  wonAt: string;
  user: PickerUser;
}

export interface ViewerPicker {
  id: string;
  keyword: string;
  label: string | null;
  status: "OPEN" | "CLOSED" | "COMPLETED";
  winnerId: string | null;
  createdAt: string;
  closedAt: string | null;
  entries: PickerEntry[];
  winner: PickerUser | null;
  winners: PickerWinner[];
}

export const pickerApi = {
  getAll: () => api.get("/api/viewer-picker").then((d) => d.pickers as ViewerPicker[]),
  getActive: () => api.get("/api/viewer-picker/active").then((d) => d.picker as ViewerPicker | null),
  create: (keyword: string, label?: string) =>
    api.post("/api/viewer-picker", { keyword, label }).then((d) => d.picker as ViewerPicker),
  close: (id: string) => api.post(`/api/viewer-picker/${id}/close`, {}).then((d) => d.picker as ViewerPicker),
  draw: (id: string, excludeUserIds?: string[]) =>
    api.post(`/api/viewer-picker/${id}/draw`, { excludeUserIds: excludeUserIds ?? [] }).then((d) => d.picker as ViewerPicker),
  addEntry: (id: string, kickUsername: string) =>
    api.post(`/api/viewer-picker/${id}/add-entry`, { kickUsername }).then((d) => d.picker as ViewerPicker),
  removeEntry: (entryId: string) =>
    api.delete(`/api/viewer-picker/entries/${entryId}`).then((d) => d.picker as ViewerPicker),
  delete: (id: string) => api.delete(`/api/viewer-picker/${id}`),
  exportParticipants: async (id: string) => {
    const res = await fetch(`${API_URL}/api/viewer-picker/${id}/export`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giveaway-${id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
