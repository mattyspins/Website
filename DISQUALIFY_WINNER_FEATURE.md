# Disqualify Winner Feature - Guess the Balance

## Overview

Added functionality for admins to disqualify a winner (e.g., bot accounts, rule violations) and automatically select the next closest guess as the new winner.

## Feature Description

When an admin suspects a winner is a bot or doesn't qualify for the prize, they can disqualify that winner. The system will:

1. Refund points from the disqualified winner (if awarded)
2. Track the disqualification with reason and timestamp
3. Automatically select the next closest guess as the new winner
4. Award points to the new winner
5. Send notification to the new winner
6. Prevent the disqualified user from winning this game again

## Backend Implementation

### GuessTheBalanceService Updates

#### New Method: `disqualifyWinner(gameId, reason)`

Located in `backend/src/services/GuessTheBalanceService.ts`

**Functionality:**

- Validates game is COMPLETED and has a winner
- Adds previous winner to disqualified list in game metadata
- Refunds points from previous winner
- Calculates new winner (excluding all disqualified users)
- Awards points to new winner
- Sends win notification to new winner
- Logs the disqualification

**Disqualified User Tracking:**
Stored in game metadata as:

```json
{
  "disqualifiedUsers": [
    {
      "userId": "user-id",
      "reason": "Bot account",
      "disqualifiedAt": "2026-05-09T12:00:00.000Z"
    }
  ]
}
```

#### Updated Method: `calculateWinner(gameId, finalBalance, excludedUserIds)`

- Now accepts optional `excludedUserIds` parameter
- Filters out disqualified users when finding closest guess
- Returns next eligible winner

#### New Method: `refundPoints(userId, points, reason)`

- Deducts points from user
- Creates REFUND transaction record
- Logs the refund operation

### API Endpoint

**Route:** `POST /api/admin/guess-the-balance/:id/disqualify-winner`

**Authentication:** Admin only

**Request Body:**

```json
{
  "reason": "Bot account detected"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Winner disqualified and new winner selected",
  "game": {
    // Updated game object with new winner
  }
}
```

**Validation:**

- Game must be COMPLETED
- Game must have a winner
- Reason is required (non-empty string)
- At least one eligible guess must remain after disqualification

### Controller

Added `disqualifyWinner` method in `backend/src/controllers/GuessTheBalanceController.ts`

- Validates admin access
- Validates game ID and reason
- Calls service method
- Returns updated game

## Frontend Implementation

### DisqualifyWinnerModal Component

New component: `frontend/components/admin/DisqualifyWinnerModal.tsx`

**Features:**

- Shows current winner information
- Displays warning about consequences
- Requires reason for disqualification
- Shows what will happen:
  - Current winner disqualified
  - Points refunded
  - Next closest guess selected
  - Points awarded to new winner
  - Action cannot be undone

**UI Elements:**

- Current winner display with guess and reward info
- Warning box with action consequences
- Reason textarea (required)
- Cancel and Confirm buttons
- Loading state during processing
- Error handling

### GameManagementCard Updates

Updated `frontend/components/admin/GameManagementCard.tsx`

**Changes:**

- Added "Disqualify Winner" button for COMPLETED games
- Button only shows if game has a winner
- Opens DisqualifyWinnerModal on click
- Refreshes game data after successful disqualification

**Button Placement:**
For COMPLETED games, shows three buttons:

1. View Guesses (blue)
2. Disqualify Winner (orange) - only if winner exists
3. Delete (red)

### API Client

Added method to `frontend/lib/api/guessTheBalance.ts`:

```typescript
async disqualifyWinner(gameId: string, reason: string): Promise<GuessTheBalanceGame>
```

## User Flow

### Admin Workflow

1. Admin views completed game in admin panel
2. Notices winner might be a bot or rule violator
3. Clicks "Disqualify Winner" button
4. Modal opens showing current winner and warnings
5. Admin enters reason (e.g., "Bot account", "Terms violation")
6. Clicks "Disqualify & Select New Winner"
7. System processes:
   - Refunds points from disqualified winner
   - Selects next closest guess
   - Awards points to new winner
   - Sends notification to new winner
8. Game card updates to show new winner
9. Disqualified user cannot win this game again

### What Happens to Disqualified User

- Points are refunded (if they were awarded)
- Point transaction created with type "REFUND"
- User is added to game's disqualified list
- User cannot be selected as winner for this game again
- User can still participate in other games

### What Happens to New Winner

- Automatically selected as next closest guess
- Points awarded (same amount as original winner)
- Win notification sent
- Displayed as winner in game card
- Can be disqualified if also found to be ineligible

## Edge Cases Handled

1. **No Eligible Guesses Remaining**
   - Error: "No eligible winner found after disqualification"
   - Game remains in COMPLETED state with no winner

2. **Multiple Disqualifications**
   - Can disqualify multiple times
   - Each disqualification tracked in metadata
   - System keeps selecting next closest eligible guess

3. **Zero Points Reward**
   - No refund needed
   - No points awarded to new winner
   - Disqualification still tracked

4. **Game Not Completed**
   - Error: "Can only disqualify winner from completed games"
   - Must complete game first

5. **No Winner**
   - Error: "Game has no winner to disqualify"
   - Cannot disqualify if no winner was selected

## Database Changes

No schema changes required. Uses existing `metadata` JSON field in `GuessTheBalance` table to store disqualified users.

## Security Considerations

- Admin-only endpoint (requires `isAdmin` flag)
- Reason is required and logged
- All disqualifications tracked with timestamp
- Audit trail maintained in game metadata
- Point transactions recorded for accountability

## Testing Checklist

### Backend

- [ ] Disqualify winner from completed game
- [ ] Verify points refunded from disqualified winner
- [ ] Verify new winner selected (next closest guess)
- [ ] Verify points awarded to new winner
- [ ] Verify notification sent to new winner
- [ ] Verify disqualified user tracked in metadata
- [ ] Test multiple disqualifications
- [ ] Test error: game not completed
- [ ] Test error: no winner to disqualify
- [ ] Test error: no eligible guesses remaining
- [ ] Test error: missing reason

### Frontend

- [ ] "Disqualify Winner" button shows for completed games with winner
- [ ] Button doesn't show for games without winner
- [ ] Modal opens with correct winner information
- [ ] Reason field is required
- [ ] Submit disabled without reason
- [ ] Loading state shows during processing
- [ ] Error messages display correctly
- [ ] Success refreshes game data
- [ ] New winner displayed in game card
- [ ] Modal closes after success

### Integration

- [ ] Complete game → disqualify winner → verify new winner
- [ ] Disqualify multiple times → verify each new winner
- [ ] Check disqualified user's point balance
- [ ] Check new winner's point balance
- [ ] Verify notifications sent
- [ ] Check point transaction records
- [ ] Verify game metadata contains disqualification history

## Files Changed

### Backend

- `backend/src/services/GuessTheBalanceService.ts` - Added disqualifyWinner, refundPoints methods; updated calculateWinner
- `backend/src/controllers/GuessTheBalanceController.ts` - Added disqualifyWinner controller
- `backend/src/routes/guessTheBalance.ts` - Added disqualify-winner route

### Frontend

- `frontend/components/admin/DisqualifyWinnerModal.tsx` - New modal component
- `frontend/components/admin/GameManagementCard.tsx` - Added disqualify button and modal
- `frontend/lib/api/guessTheBalance.ts` - Added disqualifyWinner API method

## Example Use Cases

### Case 1: Bot Account

```
Admin notices winner has suspicious activity patterns
→ Clicks "Disqualify Winner"
→ Enters reason: "Bot account detected - automated guessing pattern"
→ System refunds 1000 points from bot
→ Selects next closest guess as winner
→ Awards 1000 points to legitimate user
→ Sends notification to new winner
```

### Case 2: Terms Violation

```
Winner violated terms (e.g., multiple accounts)
→ Admin disqualifies with reason: "Multiple account violation"
→ Points refunded
→ Next eligible user becomes winner
→ Original violator cannot win this game again
```

### Case 3: Mistake in Verification

```
Admin realizes winner doesn't meet eligibility criteria
→ Disqualifies with reason: "Does not meet eligibility requirements"
→ System automatically handles point transfers
→ New winner selected and notified
```

## Future Enhancements (Optional)

1. **Disqualification History Page**
   - View all disqualifications across all games
   - Filter by reason, date, admin

2. **User Ban List**
   - Permanently ban users from all future games
   - Separate from per-game disqualification

3. **Appeal System**
   - Allow disqualified users to appeal
   - Admin review and reinstatement

4. **Automated Detection**
   - Flag suspicious patterns automatically
   - Suggest potential disqualifications to admin

5. **Notification to Disqualified User**
   - Inform user they were disqualified
   - Explain reason and appeal process

## Notes

- Disqualification is permanent for that specific game
- User can still participate in other games
- All actions are logged for audit purposes
- Admin discretion is required - no automated disqualification
- System maintains complete audit trail in game metadata
