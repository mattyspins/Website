# Store Purchase Management System

## Overview

Comprehensive purchase management system for admins to track, manage, and receive notifications about store purchases.

---

## Features

### 1. Admin Purchase Dashboard

**Location:** `/admin/store` → "Purchases" tab

**Features:**

- View all store purchases in one place
- Filter by status (pending, completed, refunded, failed)
- Search by item name, customer name, Discord ID, or purchase ID
- See detailed purchase information
- Process refunds with reason tracking

**Purchase Information Displayed:**

- Customer name and Discord ID
- Item name and category
- Quantity purchased
- Total points spent
- Purchase date
- Current status
- Refund reason (if refunded)

### 2. Discord Notifications

**Real-time notifications sent to Discord webhook when:**

- A user makes a purchase from the store

**Notification Includes:**

- Customer name and Discord ID
- Item name and category
- Quantity and total points
- Purchase status (instant/manual delivery)
- Purchase ID for reference
- Timestamp

### 3. Refund System

**Admins can:**

- Process refunds for completed purchases
- Provide refund reason (required)
- Points are automatically returned to user
- Refund is logged in purchase history

---

## Setup Instructions

### Step 1: Create Discord Webhook

1. **Go to your Discord server**
2. **Select a channel** for purchase notifications (e.g., #store-purchases)
3. **Edit Channel → Integrations → Webhooks**
4. **Create Webhook**
5. **Copy the Webhook URL**

### Step 2: Configure Backend

Add the webhook URL to your Railway environment variables:

```bash
DISCORD_PURCHASE_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

**In Railway:**

1. Go to your backend service
2. Click "Variables"
3. Add new variable:
   - Name: `DISCORD_PURCHASE_WEBHOOK_URL`
   - Value: Your webhook URL
4. Redeploy if needed

### Step 3: Test the System

1. **Make a test purchase:**
   - Login to the website
   - Go to `/store`
   - Purchase an item

2. **Check Discord:**
   - You should receive a notification in your configured channel
   - Notification includes all purchase details

3. **Check Admin Dashboard:**
   - Go to `/admin/store`
   - Click "Purchases" tab
   - Your test purchase should appear

---

## How to Use

### Viewing Purchases

1. **Login as admin**
2. **Go to `/admin/store`**
3. **Click "Purchases" tab**
4. **Use filters to find specific purchases:**
   - Status filter: All, Pending, Completed, Refunded, Failed
   - Search: Item name, customer name, Discord ID, purchase ID

### Processing Refunds

1. **Find the purchase** in the purchases list
2. **Click "Process Refund"** button (only for completed purchases)
3. **Enter refund reason** (required)
4. **Click "Confirm Refund"**
5. **Points are automatically returned** to the user
6. **Purchase status changes** to "refunded"
7. **Refund reason is logged** for future reference

### Understanding Purchase Statuses

- **Pending** 🟡 - Manual delivery required, admin needs to fulfill
- **Completed** 🟢 - Instant delivery or manually fulfilled
- **Refunded** ⚪ - Purchase refunded, points returned
- **Failed** 🔴 - Purchase failed (rare, usually payment issues)

---

## Discord Notification Format

```
🛒 New Store Purchase

👤 Customer
John Doe
Discord ID: 123456789

📦 Item
Premium Badge
Category: Cosmetics

💰 Details
Quantity: 1x
Total: 500 points

📋 Status
✅ Completed (Instant)
or
⏳ Pending (Manual Delivery)

🆔 Purchase ID
`abc123def456`

MattySpins Store • [timestamp]
```

---

## Purchase Workflow

### For Instant Delivery Items

1. User purchases item
2. Points deducted immediately
3. Purchase status: **Completed**
4. Discord notification sent
5. Item delivered automatically
6. Admin can view in dashboard

### For Manual Delivery Items

1. User purchases item
2. Points deducted immediately
3. Purchase status: **Pending**
4. Discord notification sent
5. **Admin sees notification**
6. **Admin fulfills order manually** (e.g., sends code via DM)
7. **Admin marks as completed** (future feature)
8. User receives item

---

## API Endpoints

### Get All Purchases (Admin Only)

```
GET /api/store/admin/purchases
Query Parameters:
  - limit: number (default: 50, max: 100)
  - offset: number (default: 0)
  - status: string (pending|completed|refunded|failed)
  - userId: string (filter by user)
  - itemId: string (filter by item)
```

### Process Refund (Admin Only)

```
POST /api/store/admin/refund/:purchaseId
Body:
  - reason: string (required)
```

---

## Database Schema

### StorePurchase Table

```prisma
model StorePurchase {
  id           String   @id @default(cuid())
  userId       String
  itemId       String
  quantity     Int
  unitPrice    Int
  totalPrice   Int
  status       String   // pending, completed, refunded, failed
  purchasedAt  DateTime @default(now())
  deliveredAt  DateTime?
  refundedAt   DateTime?
  refundReason String?
  metadata     Json?

  user User @relation(fields: [userId], references: [id])
  item StoreItem @relation(fields: [itemId], references: [id])
}
```

---

## Security Features

### Admin-Only Access

- Purchase management requires admin authentication
- Refund processing requires admin privileges
- Regular users cannot access purchase management

### Audit Trail

- All purchases logged with timestamps
- Refunds include reason and timestamp
- Point transactions tracked separately
- Admin actions logged

### Data Privacy

- User Discord IDs visible to admins only
- Purchase history private to user and admins
- Refund reasons stored for accountability

---

## Troubleshooting

### Discord Notifications Not Working

**Check:**

1. Webhook URL is correctly set in Railway
2. Webhook URL is valid and not expired
3. Discord channel permissions allow webhooks
4. Check backend logs for errors

**Test:**

```bash
# Test webhook manually
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message"}'
```

### Purchases Not Showing

**Check:**

1. User is logged in as admin
2. Backend API is responding
3. Check browser console for errors
4. Try refreshing the page

### Refund Not Processing

**Check:**

1. Purchase status is "completed"
2. Refund reason is provided
3. User still exists in database
4. Check backend logs for errors

---

## Future Enhancements

### Planned Features

1. **Mark as Delivered** - Manually mark pending purchases as completed
2. **Bulk Actions** - Process multiple purchases at once
3. **Export to CSV** - Download purchase history
4. **Email Notifications** - Send email to user on purchase/refund
5. **Purchase Analytics** - Charts and graphs for purchase trends
6. **Automated Delivery** - Integration with external services
7. **Purchase Notes** - Add internal notes to purchases
8. **Customer Communication** - Message users directly from dashboard

---

## Best Practices

### For Admins

1. **Check Discord regularly** for new purchase notifications
2. **Fulfill manual deliveries promptly** (within 24 hours)
3. **Provide clear refund reasons** for accountability
4. **Monitor pending purchases** daily
5. **Keep item stock updated** to avoid overselling

### For Store Management

1. **Set realistic delivery types:**
   - Instant: Only for automated items
   - Manual: For items requiring admin action
2. **Keep items in stock:**
   - Monitor inventory regularly
   - Update stock before it runs out
   - Disable items when out of stock

3. **Price items appropriately:**
   - Consider point earning rate
   - Balance value vs. cost
   - Adjust based on demand

---

## Statistics

### Available Metrics

- Total purchases count
- Total revenue (points)
- Average order value
- Top selling items
- Purchase status breakdown
- Refund rate

### Viewing Statistics

1. Go to `/admin/store`
2. Statistics cards show:
   - Total Items
   - Active Items
   - Total Sales
   - Revenue
3. Top Selling Items section shows best performers

---

## Support

### If You Need Help

1. **Check this documentation first**
2. **Check backend logs** in Railway
3. **Check browser console** for frontend errors
4. **Test with a small purchase** to verify system
5. **Contact support** if issues persist

### Common Questions

**Q: Can users see all purchases?**
A: No, users only see their own purchase history at `/profile/purchases`

**Q: Can I cancel a purchase?**
A: Yes, use the refund feature to return points to the user

**Q: What happens if a purchase fails?**
A: Points are not deducted, purchase is marked as failed

**Q: Can I edit a purchase?**
A: No, but you can refund and have the user repurchase

**Q: How do I know when someone makes a purchase?**
A: Discord notification is sent immediately to your configured channel

---

## Conclusion

The Store Purchase Management System provides:

- ✅ Real-time Discord notifications
- ✅ Comprehensive admin dashboard
- ✅ Easy refund processing
- ✅ Detailed purchase tracking
- ✅ Secure admin-only access
- ✅ Complete audit trail

This system ensures you never miss a purchase and can efficiently manage your store operations!
