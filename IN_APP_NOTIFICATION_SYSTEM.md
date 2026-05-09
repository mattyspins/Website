# In-App Notification System Implementation

## Overview

Implemented a comprehensive in-app notification system to replace Discord webhooks. Users and admins now receive notifications directly in the website for purchases, game wins, refunds, and points awarded.

## Backend Implementation

### Database Schema

- **Migration**: `backend/prisma/migrations/20260509000000_add_notifications/migration.sql`
- **Model**: `Notification` in Prisma schema with fields:
  - `id`, `userId`, `type`, `title`, `message`
  - `channels`, `priority`, `metadata`
  - `readAt`, `createdAt`, `updatedAt`

### Services

#### NotificationService (`backend/src/services/NotificationService.ts`)

Core notification management service with methods:

- `createNotification()` - Create a new notification
- `getUserNotifications()` - Get user notifications with pagination and filtering
- `markAsRead()` - Mark single notification as read
- `markAllAsRead()` - Mark all user notifications as read
- `deleteNotification()` - Delete a notification

**Helper Methods** (for specific notification types):

- `notifyPurchase()` - User purchase confirmation
- `notifyGameWin()` - Game win notification with points
- `notifyAdminPurchase()` - Admin notification for new purchases
- `notifyRefund()` - Refund processed notification
- `notifyPointsAwarded()` - Generic points awarded notification

#### Updated Services

**StoreService** (`backend/src/services/StoreService.ts`):

- Removed Discord webhook method `sendPurchaseNotification()`
- Added `sendPurchaseNotifications()` method that:
  - Notifies the user about their purchase
  - Notifies all admins about the new purchase
  - Uses admin Discord IDs from environment variable

**GuessTheBalanceService** (`backend/src/services/GuessTheBalanceService.ts`):

- Added `NotificationService` import
- Sends win notification when game is completed and winner is awarded points
- Notification includes game title, points won, and link to profile

### API Routes

#### NotificationController (`backend/src/controllers/NotificationController.ts`)

Handles HTTP requests for notification operations.

#### Routes (`backend/src/routes/notifications.ts`)

- `GET /api/notifications` - Get user notifications (with pagination and filters)
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

Routes registered in `backend/src/index.ts`.

## Frontend Implementation

### API Client (`frontend/lib/api/notifications.ts`)

TypeScript client for notification API with methods:

- `getNotifications(limit, offset, unreadOnly)` - Fetch notifications
- `getUnreadCount()` - Get count of unread notifications
- `markAsRead(notificationId)` - Mark single as read
- `markAllAsRead()` - Mark all as read
- `deleteNotification(notificationId)` - Delete notification

### Components

#### NotificationDropdown (`frontend/components/NotificationDropdown.tsx`)

Bell icon dropdown component with:

- **Bell Icon**: Shows in navbar with unread count badge
- **Auto-refresh**: Fetches unread count every 30 seconds
- **Dropdown Panel**: Shows recent 10 notifications
- **Features**:
  - Mark individual notifications as read
  - Mark all as read button
  - Click notification to view details (auto-marks as read)
  - Link to full notifications page
  - Emoji icons for different notification types
  - Relative timestamps (e.g., "2 minutes ago")

#### Navbar (`frontend/components/Navbar.tsx`)

- Added `NotificationDropdown` component
- Only shows notification bell when user is logged in
- Tracks login state via localStorage

#### Notifications Page (`frontend/app/notifications/page.tsx`)

Full-page notification management interface with:

- **Filters**: All notifications or unread only
- **Actions**:
  - Mark individual as read
  - Mark all as read
  - Delete notifications
  - Refresh list
- **Pagination**: 20 notifications per page
- **Visual Indicators**: Unread notifications have gold left border
- **Empty States**: Different messages for no notifications vs no unread
- **Responsive Design**: Works on mobile and desktop

## Notification Types

### User Notifications

1. **Purchase** (`purchase`)
   - Title: "🛒 Purchase Successful"
   - Message: "You purchased {itemName} for {points} points"
   - Action: Link to `/profile/purchases`

2. **Game Win** (`game_win`)
   - Title: "🎉 You Won!"
   - Message: "Congratulations! You won {points} points in {gameTitle}"
   - Action: Link to `/profile`

3. **Refund** (`refund`)
   - Title: "💰 Refund Processed"
   - Message: "Your purchase of {itemName} has been refunded. {points} points returned."
   - Action: Link to `/profile/purchases`

4. **Points Awarded** (`points_awarded`)
   - Title: "💎 Points Awarded"
   - Message: "You received {points} points! {reason}"
   - Action: Link to `/profile`

### Admin Notifications

1. **Admin Purchase** (`admin_purchase`)
   - Title: "🛒 New Purchase"
   - Message: "{userName} purchased {itemName} for {points} points"
   - Action: Link to `/admin/store?tab=purchases`

## Features

### Real-time Updates

- Unread count updates every 30 seconds
- Notifications refresh when dropdown opens
- Manual refresh button available

### User Experience

- **Visual Feedback**: Unread count badge on bell icon
- **Smooth Animations**: Framer Motion animations for dropdown and page
- **Relative Timestamps**: Human-readable time (e.g., "5 minutes ago")
- **Action Links**: Direct links to relevant pages
- **Emoji Icons**: Visual distinction between notification types
- **Responsive**: Works on all screen sizes

### Accessibility

- Proper ARIA labels on buttons
- Keyboard navigation support
- Clear visual indicators for unread status
- High contrast colors

## Environment Variables

### Backend

- `ADMIN_DISCORD_IDS` - Comma-separated list of admin Discord IDs for admin notifications

## Database Migration

The notification table migration needs to be run on production:

```bash
npx prisma migrate deploy
```

This will create the `Notification` table with proper indexes and relations.

## Testing Checklist

### User Flow

- [ ] User makes a purchase → receives purchase notification
- [ ] User wins a game → receives win notification
- [ ] User receives refund → receives refund notification
- [ ] Notification bell shows unread count
- [ ] Click notification → marks as read
- [ ] Click "Mark all as read" → all notifications marked as read
- [ ] Delete notification → notification removed
- [ ] Click action link → navigates to correct page

### Admin Flow

- [ ] User makes purchase → admin receives notification
- [ ] Admin notification shows user name, item, and points
- [ ] Admin can click to view purchase details
- [ ] Multiple admins all receive notifications

### UI/UX

- [ ] Bell icon only shows when logged in
- [ ] Unread count badge displays correctly
- [ ] Dropdown opens/closes smoothly
- [ ] Notifications page loads correctly
- [ ] Filters work (all/unread)
- [ ] Pagination works
- [ ] Mobile responsive
- [ ] Timestamps are human-readable

## Files Changed

### Backend

- `backend/src/services/NotificationService.ts` (new)
- `backend/src/controllers/NotificationController.ts` (new)
- `backend/src/routes/notifications.ts` (new)
- `backend/src/services/StoreService.ts` (modified)
- `backend/src/services/GuessTheBalanceService.ts` (modified)
- `backend/src/index.ts` (modified - added routes)
- `backend/prisma/migrations/20260509000000_add_notifications/migration.sql` (existing)

### Frontend

- `frontend/lib/api/notifications.ts` (new)
- `frontend/components/NotificationDropdown.tsx` (new)
- `frontend/app/notifications/page.tsx` (new)
- `frontend/components/Navbar.tsx` (modified)
- `frontend/package.json` (modified - added date-fns)

## Dependencies Added

- `date-fns` - For human-readable date formatting

## Next Steps

1. **Deploy to Production**: Changes are pushed to GitHub and will auto-deploy
2. **Run Migration**: Railway will automatically run the migration on deploy
3. **Test Notifications**:
   - Make a test purchase to verify user and admin notifications
   - Complete a game to verify win notifications
4. **Monitor**: Check Railway logs for any notification-related errors

## Notes

- Discord webhooks completely removed from StoreService
- All notifications are now in-app only
- Admins are identified by Discord IDs in environment variable
- Notification metadata stores additional context (purchase ID, game ID, etc.)
- Notifications are soft-deletable (user can delete their own)
- Unread notifications are tracked via `readAt` timestamp
