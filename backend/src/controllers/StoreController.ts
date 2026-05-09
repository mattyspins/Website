import { Request, Response } from 'express';
import { StoreService, PurchaseRequest } from '@/services/StoreService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class StoreController {
  // Get store items
  static getStoreItems = asyncHandler(async (req: Request, res: Response) => {
    const { category, includeInactive = 'false' } = req.query;

    const includeInactiveFlag = includeInactive === 'true';

    try {
      const items = await StoreService.getStoreItems(
        category as string,
        includeInactiveFlag
      );

      res.json({
        success: true,
        data: {
          items,
          category: category || null,
          total: items.length,
        },
      });
    } catch (error) {
      logger.error('Error getting store items:', error);
      throw createError.internal('Failed to get store items');
    }
  });

  // Get single store item
  static getStoreItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;

    if (!itemId) {
      throw createError.badRequest('Item ID is required');
    }

    try {
      const item = await StoreService.getStoreItem(itemId);

      if (!item) {
        throw createError.notFound('Store item not found');
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      logger.error('Error getting store item:', error);
      throw error;
    }
  });

  // Get store categories
  static getStoreCategories = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const categories = await StoreService.getStoreCategories();

        res.json({
          success: true,
          data: {
            categories,
            total: categories.length,
          },
        });
      } catch (error) {
        logger.error('Error getting store categories:', error);
        throw createError.internal('Failed to get store categories');
      }
    }
  );

  // Purchase item
  static purchaseItem = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { itemId, quantity = 1 } = req.body;

      if (!itemId) {
        throw createError.badRequest('Item ID is required');
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw createError.badRequest('Quantity must be a positive integer');
      }

      const purchaseRequest: PurchaseRequest = {
        userId: req.user.id,
        itemId,
        quantity,
      };

      try {
        const purchase = await StoreService.purchaseItem(purchaseRequest);

        logger.info(
          `Store purchase completed: ${req.user.id} -> ${quantity}x ${itemId}`
        );

        res.json({
          success: true,
          data: purchase,
          message: 'Purchase completed successfully',
        });
      } catch (error) {
        logger.error('Error purchasing item:', error);
        throw error;
      }
    }
  );

  // Get user purchases
  static getUserPurchases = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { limit = '50', offset = '0' } = req.query;
      const { userId } = req.params;

      // Check if user can access these purchases (own purchases or admin)
      const targetUserId = userId || req.user.id;
      if (targetUserId !== req.user.id && !req.user.isAdmin) {
        throw createError.forbidden('Cannot access other user purchases');
      }

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

      try {
        const result = await StoreService.getUserPurchases(
          targetUserId,
          limitNum,
          offsetNum
        );

        res.json({
          success: true,
          data: {
            purchases: result.purchases,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting user purchases:', error);
        throw createError.internal('Failed to get user purchases');
      }
    }
  );

  // Get store statistics
  static getStoreStatistics = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const stats = await StoreService.getStoreStatistics();

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Error getting store statistics:', error);
        throw createError.internal('Failed to get store statistics');
      }
    }
  );

  // Admin: Create store item
  static createStoreItem = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const {
        name,
        description,
        price,
        category,
        stock = -1,
        deliveryType = 'instant',
        isActive = true,
        sortOrder = 0,
        metadata,
      } = req.body;

      if (!name || !price || !category) {
        throw createError.badRequest('Name, price, and category are required');
      }

      if (price < 0) {
        throw createError.badRequest('Price must be non-negative');
      }

      if (stock < -1) {
        throw createError.badRequest(
          'Stock must be -1 (unlimited) or positive'
        );
      }

      const validDeliveryTypes = ['instant', 'manual', 'scheduled'];
      if (!validDeliveryTypes.includes(deliveryType)) {
        throw createError.badRequest(
          'Invalid delivery type. Must be: instant, manual, or scheduled'
        );
      }

      try {
        const item = await StoreService.createStoreItem({
          name,
          description,
          price,
          category,
          stock,
          deliveryType,
          isActive,
          sortOrder,
          metadata,
        });

        logger.info(
          `Store item created by admin ${req.user.id}: ${item.name} (${item.id})`
        );

        res.status(201).json({
          success: true,
          data: item,
          message: 'Store item created successfully',
        });
      } catch (error) {
        logger.error('Error creating store item:', error);
        throw createError.internal('Failed to create store item');
      }
    }
  );

  // Admin: Update store item
  static updateStoreItem = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { itemId } = req.params;
      const updates = req.body;

      if (!itemId) {
        throw createError.badRequest('Item ID is required');
      }

      // Validate price if provided
      if (updates.price !== undefined && updates.price < 0) {
        throw createError.badRequest('Price must be non-negative');
      }

      // Validate stock if provided
      if (updates.stock !== undefined && updates.stock < -1) {
        throw createError.badRequest(
          'Stock must be -1 (unlimited) or positive'
        );
      }

      // Validate delivery type if provided
      if (updates.deliveryType) {
        const validDeliveryTypes = ['instant', 'manual', 'scheduled'];
        if (!validDeliveryTypes.includes(updates.deliveryType)) {
          throw createError.badRequest(
            'Invalid delivery type. Must be: instant, manual, or scheduled'
          );
        }
      }

      try {
        const updatedItem = await StoreService.updateStoreItem(itemId, updates);

        logger.info(`Store item updated by admin ${req.user.id}: ${itemId}`);

        res.json({
          success: true,
          data: updatedItem,
          message: 'Store item updated successfully',
        });
      } catch (error) {
        logger.error('Error updating store item:', error);
        throw createError.internal('Failed to update store item');
      }
    }
  );

  // Admin: Delete store item
  static deleteStoreItem = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { itemId } = req.params;

      if (!itemId) {
        throw createError.badRequest('Item ID is required');
      }

      try {
        await StoreService.deleteStoreItem(itemId);

        logger.info(`Store item deleted by admin ${req.user.id}: ${itemId}`);

        res.json({
          success: true,
          message: 'Store item deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting store item:', error);
        throw createError.internal('Failed to delete store item');
      }
    }
  );

  // Admin: Update inventory
  static updateInventory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { itemId } = req.params;
      const { stock } = req.body;

      if (!itemId) {
        throw createError.badRequest('Item ID is required');
      }

      if (stock === undefined || stock < -1) {
        throw createError.badRequest(
          'Stock must be -1 (unlimited) or positive'
        );
      }

      try {
        const updatedItem = await StoreService.updateInventory(itemId, stock);

        logger.info(
          `Inventory updated by admin ${req.user.id}: ${itemId} -> stock: ${stock}`
        );

        res.json({
          success: true,
          data: updatedItem,
          message: 'Inventory updated successfully',
        });
      } catch (error) {
        logger.error('Error updating inventory:', error);
        throw createError.internal('Failed to update inventory');
      }
    }
  );

  // Admin: Complete purchase (mark as delivered)
  static completePurchase = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { purchaseId } = req.params;

      if (!purchaseId) {
        throw createError.badRequest('Purchase ID is required');
      }

      try {
        const purchase = await StoreService.completePurchase(
          purchaseId,
          req.user.id
        );

        logger.info(
          `Purchase completed by admin ${req.user.id}: ${purchaseId}`
        );

        res.json({
          success: true,
          data: purchase,
          message: 'Purchase marked as completed successfully',
        });
      } catch (error) {
        logger.error('Error completing purchase:', error);
        throw error;
      }
    }
  );

  // Admin: Process refund
  static processRefund = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { purchaseId } = req.params;
      const { reason } = req.body;

      if (!purchaseId) {
        throw createError.badRequest('Purchase ID is required');
      }

      if (!reason || typeof reason !== 'string') {
        throw createError.badRequest('Refund reason is required');
      }

      try {
        const result = await StoreService.processRefund(
          purchaseId,
          reason,
          req.user.id
        );

        logger.info(
          `Refund processed by admin ${req.user.id}: ${purchaseId} -> ${result.refundAmount} points`
        );

        res.json({
          success: true,
          data: {
            purchaseId,
            refundAmount: result.refundAmount,
            reason,
            processedAt: new Date(),
            processedBy: req.user.id,
          },
          message: 'Refund processed successfully',
        });
      } catch (error) {
        logger.error('Error processing refund:', error);
        throw createError.internal('Failed to process refund');
      }
    }
  );

  // Admin: Get all purchases (for management)
  static getAllPurchases = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user?.isAdmin) {
        throw createError.forbidden('Admin access required');
      }

      const { limit = '50', offset = '0', status, userId, itemId } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

      try {
        const result = await StoreService.getAllPurchases({
          limit: limitNum,
          offset: offsetNum,
          status: status as string,
          userId: userId as string,
          itemId: itemId as string,
        });

        res.json({
          success: true,
          data: {
            purchases: result.purchases,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
            filters: {
              status: status || null,
              userId: userId || null,
              itemId: itemId || null,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting all purchases:', error);
        throw createError.internal('Failed to get purchases');
      }
    }
  );
}
