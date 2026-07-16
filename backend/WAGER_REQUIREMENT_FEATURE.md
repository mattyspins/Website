# Raffle Wager Requirement Feature

## Overview

Added wager requirement validation to the raffle system, ensuring only users who have wagered a minimum amount in recent days can purchase raffle tickets.

## Features Implemented

### 1. Wager Requirement for Raffle Entry

- **New Fields Added to Raffle Model:**
  - `minWagerRequirement` (Decimal): Minimum wager amount required (default: $0)
  - `wagerDays` (Integer): Number of days to look back for wager history (default: 7)

### 2. Wager Validation Logic

- Before allowing ticket purchase, system checks user's wager history
- Aggregates all wagers from `razedDailyWager` table within the specified time period
- Compares total wagered amount against requirement
- Shows clear error message with current wager amount and required amount

### 3. Enhanced Sunnyrocks Winner Guarantee

- Now checks for both:
  - Kick username: "sunnyrocks" (case-insensitive)
  - Display name: "sunnyrocks" or "sunny_the_indian_gambler" (case-insensitive)
- Guarantees sunnyrocks as position 1 winner when they have tickets

## Database Changes

### Migration: `20260716000000_add_wager_requirement_to_raffles`

```sql
ALTER TABLE "public"."raffles"
ADD COLUMN "min_wager_requirement" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "wager_days" INTEGER NOT NULL DEFAULT 7;
```

## API Changes

### Create Raffle (POST /api/raffles)

**New Request Body Fields:**

```typescript
{
  // ... existing fields
  minWagerRequirement?: number;  // Optional, defaults to 0
  wagerDays?: number;            // Optional, defaults to 7
}
```

### Purchase Tickets (POST /api/raffles/:id/purchase)

**New Validation:**

- Checks if `minWagerRequirement > 0`
- If yes, validates user has wagered enough in past X days
- Returns error if requirement not met:

```json
{
  "error": "Wager requirement not met. You need to wager $500.00 in the past 7 days. You have wagered $250.00."
}
```

## Usage Examples

### Example 1: Create Raffle with $500 Wager Requirement

```typescript
const raffle = await RaffleService.createRaffle({
  title: 'VIP High Roller Raffle',
  prize: '$1000 Cash',
  ticketPrice: 1000,
  maxTickets: 50,
  numberOfWinners: 3,
  endDate: new Date('2026-07-30'),
  minWagerRequirement: 500, // Must have wagered $500
  wagerDays: 7, // In the past 7 days
  createdBy: adminId,
});
```

### Example 2: No Wager Requirement (Open to All)

```typescript
const raffle = await RaffleService.createRaffle({
  title: 'Community Raffle',
  prize: '$100 Gift Card',
  ticketPrice: 100,
  maxTickets: 100,
  numberOfWinners: 1,
  endDate: new Date('2026-07-25'),
  minWagerRequirement: 0, // No requirement
  wagerDays: 7,
  createdBy: adminId,
});
```

### Example 3: Different Time Periods

```typescript
// 30-day wager requirement
const raffle = await RaffleService.createRaffle({
  // ... other fields
  minWagerRequirement: 1000,
  wagerDays: 30, // Must have wagered in past 30 days
});

// 24-hour wager requirement (for daily active users)
const dailyRaffle = await RaffleService.createRaffle({
  // ... other fields
  minWagerRequirement: 100,
  wagerDays: 1, // Must have wagered in past 24 hours
});
```

## Implementation Details

### Wager Calculation

```typescript
// Gets sum of all wagers in the specified period
const userWagers = await tx.razedDailyWager.aggregate({
  where: {
    userId,
    date: {
      gte: wagerDaysAgo, // Past X days
    },
  },
  _sum: {
    amount: true,
  },
});

const totalWagered = Number(userWagers._sum.amount || 0);
```

### Sunnyrocks Identification

```typescript
const sunnyrocksTickets = raffle.tickets.filter(
  ticket =>
    ticket.user.kickUsername?.toLowerCase() === 'sunnyrocks' ||
    ticket.user.displayName?.toLowerCase() === 'sunnyrocks' ||
    ticket.user.displayName?.toLowerCase() === 'sunny_the_indian_gambler'
);
```

## Benefits

1. **VIP/High Roller Raffles**: Create exclusive raffles for active wagerers
2. **Activity Incentive**: Encourages users to wager more to qualify for premium raffles
3. **Flexible Requirements**: Different raffles can have different wager thresholds
4. **Transparent**: Users see exactly how much they need to wager
5. **Time-Based**: Can create daily, weekly, or monthly wager requirements

## Testing

### Test Scenarios

1. ✅ User with sufficient wager can purchase tickets
2. ✅ User with insufficient wager is blocked with clear message
3. ✅ Raffles with $0 requirement allow all users
4. ✅ Sunnyrocks wins as position 1 when they have tickets
5. ✅ Both "sunnyrocks" and "sunny_the_indian_gambler" are recognized

## Deployment Status

- ✅ Database schema updated
- ✅ Prisma client regenerated
- ✅ Backend compiled successfully
- ✅ Code committed and pushed to GitHub
- 🚀 Railway auto-deployment triggered

## Notes

- Wager requirement is checked at ticket purchase time
- If a raffle has no wager requirement (`minWagerRequirement = 0`), all users can participate
- Wager data comes from the `razedDailyWager` table
- Sunnyrocks guarantee only applies if they have at least one ticket
