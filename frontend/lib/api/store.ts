import { api } from "../api";

export interface StoreItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number; // -1 for unlimited
  deliveryType: "instant" | "manual" | "scheduled";
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface StorePurchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: "pending" | "completed" | "refunded" | "failed";
  purchasedAt: string;
  deliveredAt?: string;
  refundedAt?: string;
  refundReason?: string;
  metadata?: any;
}

export interface StoreCategory {
  category: string;
  itemCount: number;
}

export interface StoreStatistics {
  totalItems: number;
  activeItems: number;
  totalPurchases: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingItems: Array<{
    itemId: string;
    itemName: string;
    totalSold: number;
    revenue: number;
  }>;
}

export interface CreateStoreItemRequest {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock?: number;
  deliveryType?: "instant" | "manual" | "scheduled";
  isActive?: boolean;
  sortOrder?: number;
  metadata?: any;
}

export interface PurchaseRequest {
  itemId: string;
  quantity?: number;
}

export const storeApi = {
  // Public endpoints
  async getStoreItems(
    category?: string,
    includeInactive = false,
  ): Promise<StoreItem[]> {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (includeInactive) params.append("includeInactive", "true");

    console.log(
      "Fetching store items from:",
      `/api/store/items?${params.toString()}`,
    );

    try {
      const response = await api.get(`/api/store/items?${params.toString()}`);
      console.log("Store items response:", response);
      return response.data.items;
    } catch (error) {
      console.error("Store API Error:", error);
      throw error;
    }
  },

  async getStoreItem(itemId: string): Promise<StoreItem> {
    const response = await api.get(`/api/store/items/${itemId}`);
    return response.data;
  },

  async getStoreCategories(): Promise<StoreCategory[]> {
    const response = await api.get("/api/store/categories");
    return response.data.categories;
  },

  async getStoreStatistics(): Promise<StoreStatistics> {
    const response = await api.get("/api/store/stats");
    return response.data;
  },

  // User endpoints (require authentication)
  async purchaseItem(request: PurchaseRequest): Promise<StorePurchase> {
    const response = await api.post("/api/store/purchase", request);
    return response.data;
  },

  async getUserPurchases(
    userId?: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    purchases: StorePurchase[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const url = userId
      ? `/api/store/purchases/${userId}`
      : "/api/store/purchases";
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await api.get(`${url}?${params.toString()}`);
    return response.data;
  },

  // Admin endpoints
  async createStoreItem(item: CreateStoreItemRequest): Promise<StoreItem> {
    const response = await api.post("/api/store/admin/items", item);
    return response.data;
  },

  async updateStoreItem(
    itemId: string,
    updates: Partial<CreateStoreItemRequest>,
  ): Promise<StoreItem> {
    const response = await api.put(`/api/store/admin/items/${itemId}`, updates);
    return response.data;
  },

  async deleteStoreItem(itemId: string): Promise<void> {
    await api.delete(`/api/store/admin/items/${itemId}`);
  },

  async updateInventory(itemId: string, stock: number): Promise<StoreItem> {
    const response = await api.patch(
      `/api/store/admin/items/${itemId}/inventory`,
      {
        stock,
      },
    );
    return response.data;
  },

  async processRefund(
    purchaseId: string,
    reason: string,
  ): Promise<{
    purchaseId: string;
    refundAmount: number;
    reason: string;
    processedAt: string;
    processedBy: string;
  }> {
    const response = await api.post(`/api/store/admin/refund/${purchaseId}`, {
      reason,
    });
    return response.data;
  },

  async getAllPurchases(filters?: {
    limit?: number;
    offset?: number;
    status?: string;
    userId?: string;
    itemId?: string;
  }): Promise<{
    purchases: StorePurchase[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
    filters: {
      status: string | null;
      userId: string | null;
      itemId: string | null;
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.itemId) params.append("itemId", filters.itemId);

    const response = await api.get(
      `/api/store/admin/purchases?${params.toString()}`,
    );
    return response.data;
  },
};
