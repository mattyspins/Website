import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { PointsService } from '@/services/PointsService';
import { StatisticsService } from '@/services/StatisticsService';

export interface StoreItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number; // -1 for unlimited
  deliveryType: 'instant' | 'manual' | 'scheduled';
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  purchasedAt: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
  metadata?: any;
}

export interface PurchaseRequest {
  userId: string;
  itemId: string;
  quantity: number;
}

export interface RefundResult {
  success: boolean;
  refundAmount: number;
  transaction?: any;
}

export class StoreService {
  // Get store items by category
  static async getStoreItems(
    category?: string,
    includeInactive: boolean = false
  ): Promise<StoreItem[]> {
    try {
      const cacheKey = category ? `store:items:${category}` : 'store:items:all';

      // Try cache first
      const cached = await RedisService.getJSON<StoreItem[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (!includeInactive) {
        where.isActive = true;
      }

      const items = await prisma.storeItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const result = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: item.price,
        category: item.category,
        stock: item.stock,
        deliveryType: item.deliveryType as any,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata,
      }));

      // Cache for 10 minutes
      await RedisService.setJSON(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting store items:', error);
      throw createError.internal('Failed to get store items');
    }
  }

  // Get single store item
  static async getStoreItem(itemId: string): Promise<StoreItem | null> {
    try {
      const cacheKey = `store:item:${itemId}`;

      // Try cache first
      const cached = await RedisService.getJSON<StoreItem>(cacheKey);
      if (cached) {
        return cached;
      }

      const item = await prisma.storeItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return null;
      }

      const result = {
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: item.price,
        category: item.category,
        stock: item.stock,
        deliveryType: item.deliveryType as any,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata,
      };

      // Cache for 10 minutes
      await RedisService.setJSON(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting store item:', error);
      throw createError.internal('Failed to get store item');
    }
  }

  // Purchase item
  static async purchaseItem(request: PurchaseRequest): Promise<Purchase> {
    const { userId, itemId, quantity } = request;

    if (quantity <= 0) {
      throw createError.badRequest('Quantity must be positive');
    }

    if (quantity > 10) {
      throw createError.badRequest('Maximum 10 items per purchase');
    }

    try {
      const result = await prisma.$transaction(async tx => {
        // Get item details
        const item = await tx.storeItem.findUnique({
          where: { id: itemId },
        });

        if (!item) {
          throw createError.notFound('Store item not found');
        }

        if (!item.isActive) {
          throw createError.badRequest('Item is not available');
        }

        // Check stock availability
        if (item.stock !== -1 && item.stock < quantity) {
          throw createError.badRequest(`Only ${item.stock} items available`);
        }

        // Get user details
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw createError.notFound('User not found');
        }

        const totalPrice = quantity * item.price;

        // Check user balance
        if (user.points < totalPrice) {
          throw createError.badRequest('Insufficient points');
        }

        // Create purchase record
        const purchase = await tx.storePurchase.create({
          data: {
            userId,
            itemId,
            quantity,
            unitPrice: item.price,
            totalPrice,
            status: item.deliveryType === 'instant' ? 'completed' : 'pending',
            deliveredAt: item.deliveryType === 'instant' ? new Date() : null,
          },
        });

        // Update item stock (if not unlimited)
        if (item.stock !== -1) {
          await tx.storeItem.update({
            where: { id: itemId },
            data: {
              stock: { decrement: quantity },
            },
          });
        }

        // Deduct points from user
        await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: totalPrice },
            totalSpent: { increment: totalPrice },
          },
        });

        // Create point transaction
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: -totalPrice,
            transactionType: 'spent',
            reason: `Store purchase: ${item.name}`,
            referenceId: purchase.id,
            referenceType: 'purchase',
            metadata: {
              itemId,
              itemName: item.name,
              quantity,
              unitPrice: item.price,
            },
          },
        });

        return purchase;
      });

      // Update user statistics
      await StatisticsService.updatePurchaseStats(userId, result.totalPrice);

      // Clear caches
      await this.clearStoreCaches(itemId);

      logger.info(
        `Store purchase: ${userId} -> ${quantity}x ${itemId} for ${result.totalPrice} points`
      );

      return {
        id: result.id,
        userId: result.userId,
        itemId: result.itemId,
        quantity: result.quantity,
        unitPrice: result.unitPrice,
        totalPrice: result.totalPrice,
        status: result.status as any,
        purchasedAt: result.purchasedAt,
        deliveredAt: result.deliveredAt || undefined,
        refundedAt: result.refundedAt || undefined,
        refundReason: result.refundReason || undefined,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Error purchasing item:', error);
      throw error;
    }
  }

  // Get user purchases
  static async getUserPurchases(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ purchases: Purchase[]; total: number }> {
    try {
      const [purchases, total] = await Promise.all([
        prisma.storePurchase.findMany({
          where: { userId },
          include: {
            item: {
              select: {
                name: true,
                category: true,
              },
            },
          },
          orderBy: { purchasedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.storePurchase.count({
          where: { userId },
        }),
      ]);

      return {
        purchases: purchases.map(purchase => ({
          id: purchase.id,
          userId: purchase.userId,
          itemId: purchase.itemId,
          quantity: purchase.quantity,
          unitPrice: purchase.unitPrice,
          totalPrice: purchase.totalPrice,
          status: purchase.status as any,
          purchasedAt: purchase.purchasedAt,
          deliveredAt: purchase.deliveredAt || undefined,
          refundedAt: purchase.refundedAt || undefined,
          refundReason: purchase.refundReason || undefined,
          metadata: {
            ...purchase.metadata,
            itemName: purchase.item.name,
            itemCategory: purchase.item.category,
          },
        })),
        total,
      };
    } catch (error) {
      logger.error('Error getting user purchases:', error);
      throw createError.internal('Failed to get user purchases');
    }
  }

  // Process refund
  static async processRefund(
    purchaseId: string,
    reason: string,
    adminId?: string
  ): Promise<RefundResult> {
    try {
      const result = await prisma.$transaction(async tx => {
        // Get purchase details
        const purchase = await tx.storePurchase.findUnique({
          where: { id: purchaseId },
          include: {
            item: true,
          },
        });

        if (!purchase) {
          throw createError.notFound('Purchase not found');
        }

        if (purchase.status === 'refunded') {
          throw createError.badRequest('Purchase already refunded');
        }

        if (purchase.status === 'failed') {
          throw createError.badRequest('Cannot refund failed purchase');
        }

        // Update purchase status
        await tx.storePurchase.update({
          where: { id: purchaseId },
          data: {
            status: 'refunded',
            refundedAt: new Date(),
            refundReason: reason,
          },
        });

        // Restore item stock (if not unlimited)
        if (purchase.item.stock !== -1) {
          await tx.storeItem.update({
            where: { id: purchase.itemId },
            data: {
              stock: { increment: purchase.quantity },
            },
          });
        }

        // Refund points to user
        await tx.user.update({
          where: { id: purchase.userId },
          data: {
            points: { increment: purchase.totalPrice },
            totalSpent: { decrement: purchase.totalPrice },
          },
        });

        // Create refund transaction
        const transaction = await tx.pointTransaction.create({
          data: {
            userId: purchase.userId,
            amount: purchase.totalPrice,
            transactionType: 'refund',
            reason: `Store refund: ${reason}`,
            referenceId: purchaseId,
            referenceType: 'refund',
            adminId,
            metadata: {
              originalPurchaseId: purchaseId,
              itemId: purchase.itemId,
              itemName: purchase.item.name,
              refundReason: reason,
            },
          },
        });

        return {
          refundAmount: purchase.totalPrice,
          transaction,
        };
      });

      // Clear caches
      await this.clearStoreCaches();

      logger.info(
        `Store refund processed: ${purchaseId} -> ${result.refundAmount} points`
      );

      return {
        success: true,
        refundAmount: result.refundAmount,
        transaction: result.transaction,
      };
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw createError.internal('Failed to process refund');
    }
  }

  // Update inventory (admin)
  static async updateInventory(
    itemId: string,
    stock: number
  ): Promise<StoreItem> {
    try {
      const updatedItem = await prisma.storeItem.update({
        where: { id: itemId },
        data: {
          stock,
          updatedAt: new Date(),
        },
      });

      // Clear caches
      await this.clearStoreCaches(itemId);

      logger.info(`Inventory updated: ${itemId} -> stock: ${stock}`);

      return {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description || undefined,
        price: updatedItem.price,
        category: updatedItem.category,
        stock: updatedItem.stock,
        deliveryType: updatedItem.deliveryType as any,
        isActive: updatedItem.isActive,
        sortOrder: updatedItem.sortOrder,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
        metadata: updatedItem.metadata,
      };
    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw createError.internal('Failed to update inventory');
    }
  }

  // Create store item (admin)
  static async createStoreItem(
    itemData: Omit<StoreItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StoreItem> {
    try {
      const item = await prisma.storeItem.create({
        data: {
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          category: itemData.category,
          stock: itemData.stock,
          deliveryType: itemData.deliveryType,
          isActive: itemData.isActive,
          sortOrder: itemData.sortOrder,
          metadata: itemData.metadata,
        },
      });

      // Clear caches
      await this.clearStoreCaches();

      logger.info(`Store item created: ${item.name} (${item.id})`);

      return {
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        price: item.price,
        category: item.category,
        stock: item.stock,
        deliveryType: item.deliveryType as any,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata,
      };
    } catch (error) {
      logger.error('Error creating store item:', error);
      throw createError.internal('Failed to create store item');
    }
  }

  // Update store item (admin)
  static async updateStoreItem(
    itemId: string,
    updates: Partial<StoreItem>
  ): Promise<StoreItem> {
    try {
      // Remove fields that shouldn't be updated directly
      const { id, createdAt, ...allowedUpdates } = updates;

      const updatedItem = await prisma.storeItem.update({
        where: { id: itemId },
        data: {
          ...allowedUpdates,
          updatedAt: new Date(),
        },
      });

      // Clear caches
      await this.clearStoreCaches(itemId);

      logger.info(`Store item updated: ${itemId}`);

      return {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description || undefined,
        price: updatedItem.price,
        category: updatedItem.category,
        stock: updatedItem.stock,
        deliveryType: updatedItem.deliveryType as any,
        isActive: updatedItem.isActive,
        sortOrder: updatedItem.sortOrder,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
        metadata: updatedItem.metadata,
      };
    } catch (error) {
      logger.error('Error updating store item:', error);
      throw createError.internal('Failed to update store item');
    }
  }

  // Delete store item (admin)
  static async deleteStoreItem(itemId: string): Promise<void> {
    try {
      await prisma.storeItem.delete({
        where: { id: itemId },
      });

      // Clear caches
      await this.clearStoreCaches(itemId);

      logger.info(`Store item deleted: ${itemId}`);
    } catch (error) {
      logger.error('Error deleting store item:', error);
      throw createError.internal('Failed to delete store item');
    }
  }

  // Get store categories
  static async getStoreCategories(): Promise<
    Array<{ category: string; itemCount: number }>
  > {
    try {
      const cacheKey = 'store:categories';

      // Try cache first
      const cached =
        await RedisService.getJSON<
          Array<{ category: string; itemCount: number }>
        >(cacheKey);
      if (cached) {
        return cached;
      }

      const categories = await prisma.storeItem.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: {
          id: true,
        },
        orderBy: {
          category: 'asc',
        },
      });

      const result = categories.map(cat => ({
        category: cat.category,
        itemCount: cat._count.id,
      }));

      // Cache for 30 minutes
      await RedisService.setJSON(cacheKey, result, 1800);

      return result;
    } catch (error) {
      logger.error('Error getting store categories:', error);
      throw createError.internal('Failed to get store categories');
    }
  }

  // Get store statistics
  static async getStoreStatistics(): Promise<{
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
  }> {
    try {
      const [itemStats, purchaseStats, topItems] = await Promise.all([
        prisma.storeItem.aggregate({
          _count: { id: true },
        }),
        prisma.storePurchase.aggregate({
          where: { status: 'completed' },
          _count: { id: true },
          _sum: { totalPrice: true },
          _avg: { totalPrice: true },
        }),
        prisma.storePurchase.groupBy({
          by: ['itemId'],
          where: { status: 'completed' },
          _count: { id: true },
          _sum: { totalPrice: true, quantity: true },
          orderBy: {
            _sum: {
              quantity: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      const activeItemsCount = await prisma.storeItem.count({
        where: { isActive: true },
      });

      // Get item names for top selling items
      const topItemIds = topItems.map(item => item.itemId);
      const itemNames = await prisma.storeItem.findMany({
        where: { id: { in: topItemIds } },
        select: { id: true, name: true },
      });

      const itemNameMap = new Map(itemNames.map(item => [item.id, item.name]));

      const topSellingItems = topItems.map(item => ({
        itemId: item.itemId,
        itemName: itemNameMap.get(item.itemId) || 'Unknown Item',
        totalSold: item._sum.quantity || 0,
        revenue: item._sum.totalPrice || 0,
      }));

      return {
        totalItems: itemStats._count.id,
        activeItems: activeItemsCount,
        totalPurchases: purchaseStats._count.id,
        totalRevenue: purchaseStats._sum.totalPrice || 0,
        averageOrderValue: Math.round(purchaseStats._avg.totalPrice || 0),
        topSellingItems,
      };
    } catch (error) {
      logger.error('Error getting store statistics:', error);
      throw createError.internal('Failed to get store statistics');
    }
  }

  // Private helper methods

  private static async clearStoreCaches(itemId?: string): Promise<void> {
    try {
      const keysToDelete = ['store:items:all', 'store:categories'];

      if (itemId) {
        keysToDelete.push(`store:item:${itemId}`);
      }

      // Also clear category-specific caches
      const categories = await prisma.storeItem.findMany({
        select: { category: true },
        distinct: ['category'],
      });

      for (const cat of categories) {
        keysToDelete.push(`store:items:${cat.category}`);
      }

      await Promise.all(keysToDelete.map(key => RedisService.del(key)));
    } catch (error) {
      logger.error('Error clearing store caches:', error);
    }
  }
}
