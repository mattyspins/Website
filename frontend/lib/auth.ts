import { api } from "./api";

export interface User {
  id: string;
  discordId: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
}

export const getUser = async (): Promise<User | null> => {
  try {
    const response = await api.get("/auth/me");
    if (response.data.success) {
      return response.data.user;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getUser();
  return user !== null;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
    // Clear any local storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
};
