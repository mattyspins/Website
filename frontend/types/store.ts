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
