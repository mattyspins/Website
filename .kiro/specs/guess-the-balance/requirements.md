# Guess the Balance - Requirements

## Overview

A bonus hunt feature where users guess the final balance after a series of slot bonuses. The closest guess wins.

## User Stories

### Admin Stories

1. As an admin, I want to create a "Guess the Balance" game with starting amount, number of bonuses, and break-even multiplier
2. As an admin, I want to open guessing so users can submit their predictions
3. As an admin, I want to close guessing at any time to lock all submissions
4. As an admin, I want to view all user guesses in the admin dashboard
5. As an admin, I want to enter the final balance and draw a winner (closest guess)
6. As an admin, I want to see the winner and their guess amount

### User Stories

1. As a user, I want to see active "Guess the Balance" games
2. As a user, I want to submit my balance guess when guessing is open
3. As a user, I want to edit my guess as long as guessing is open
4. As a user, I want to see game details (starting amount, number of bonuses, break-even multiplier)
5. As a user, I want to see when guessing is closed
6. As a user, I want to see the winner and final balance after the game ends

## Functional Requirements

### Game Creation (Admin)

- **FR-1**: Admin can create a new game with:
  - Starting balance (required, positive number)
  - Number of bonuses (required, positive integer)
  - Average multiplier to break even (required, positive number)
  - Title/description (optional)
- **FR-2**: Game starts in "draft" status (not visible to users)
- **FR-3**: Admin can open guessing (status: "open")
- **FR-4**: Admin can close guessing (status: "closed")
- **FR-5**: Admin can enter final balance and draw winner (status: "completed")

### User Guessing

- **FR-6**: Users can only guess when status is "open"
- **FR-7**: Each user gets ONE guess per game
- **FR-8**: Users can edit their guess while status is "open"
- **FR-9**: Users cannot guess or edit when status is "closed" or "completed"
- **FR-10**: Guess must be a positive number

### Winner Selection

- **FR-11**: Winner is the user whose guess is closest to the final balance
- **FR-12**: If tie (same distance), first submission wins
- **FR-13**: Winner is automatically calculated when admin enters final balance
- **FR-14**: Winner receives points/reward (configurable)

### Viewing

- **FR-15**: Users can see active games (status: "open")
- **FR-16**: Users can see their own guess
- **FR-17**: Users can see completed games with winner and final balance
- **FR-18**: Admin can see all guesses for any game
- **FR-19**: Admin can see real-time guess count

## Non-Functional Requirements

### Performance

- **NFR-1**: Game list should load in < 1 second
- **NFR-2**: Guess submission should complete in < 500ms
- **NFR-3**: Winner calculation should complete in < 2 seconds

### Security

- **NFR-4**: Only admins can create/manage games
- **NFR-5**: Users can only see their own guesses (not others')
- **NFR-6**: Admins can see all guesses
- **NFR-7**: Validate all inputs server-side

### Usability

- **NFR-8**: Clear visual indication of game status
- **NFR-9**: Confirmation before closing guessing
- **NFR-10**: Show countdown or time remaining (optional)

## Data Model

### GuessTheBalance Table

```
id: string (UUID)
title: string (optional)
description: string (optional)
startingBalance: number
numberOfBonuses: number
breakEvenMultiplier: number
finalBalance: number (nullable, set when completed)
status: enum ('draft', 'open', 'closed', 'completed')
winnerId: string (nullable, foreign key to User)
winnerGuess: number (nullable)
winnerReward: number (nullable)
createdBy: string (foreign key to User)
createdAt: datetime
openedAt: datetime (nullable)
closedAt: datetime (nullable)
completedAt: datetime (nullable)
```

### GuessSubmission Table

```
id: string (UUID)
gameId: string (foreign key to GuessTheBalance)
userId: string (foreign key to User)
guessAmount: number
submittedAt: datetime
updatedAt: datetime
```

### Indexes

- `gameId` on GuessSubmission (for fetching all guesses)
- `userId, gameId` unique constraint (one guess per user per game)
- `status` on GuessTheBalance (for filtering active games)

## API Endpoints

### Admin Endpoints

- `POST /api/admin/guess-the-balance` - Create game
- `PATCH /api/admin/guess-the-balance/:id/open` - Open guessing
- `PATCH /api/admin/guess-the-balance/:id/close` - Close guessing
- `POST /api/admin/guess-the-balance/:id/complete` - Enter final balance and draw winner
- `GET /api/admin/guess-the-balance/:id/guesses` - View all guesses
- `GET /api/admin/guess-the-balance` - List all games

### User Endpoints

- `GET /api/guess-the-balance` - List active games
- `GET /api/guess-the-balance/:id` - Get game details
- `POST /api/guess-the-balance/:id/guess` - Submit/update guess
- `GET /api/guess-the-balance/:id/my-guess` - Get user's guess
- `GET /api/guess-the-balance/completed` - List completed games with winners

## Business Rules

### BR-1: Game Status Flow

```
draft → open → closed → completed
```

- Cannot skip statuses
- Cannot go backwards

### BR-2: Guess Validation

- Must be positive number
- Must be submitted while status is "open"
- One guess per user per game

### BR-3: Winner Calculation

```
winner = user with min(abs(guess - finalBalance))
```

### BR-4: Rewards

- Winner receives configurable points
- Points are added to user's account
- Logged in audit trail

## UI Requirements

### User View - Bonus Hunt Page

- Card showing active game
- Display: starting balance, number of bonuses, break-even multiplier
- Input field for guess amount
- Submit/Update button (disabled when closed)
- Status indicator (Open/Closed/Completed)
- Show user's current guess if submitted
- Show winner and final balance when completed

### Admin View - Dashboard

- List of all games with status
- Create new game button
- For each game:
  - Open/Close guessing buttons
  - View guesses button (shows modal with all submissions)
  - Enter final balance input (when closed)
  - Draw winner button
  - Delete game button (only if draft)

## Edge Cases

### EC-1: No Guesses Submitted

- If no users guessed, show "No winner" message
- Admin can still complete the game

### EC-2: Exact Match

- If user guesses exact final balance, they win
- Show special "Perfect Guess!" message

### EC-3: Multiple Games

- Users can participate in multiple games simultaneously
- Each game is independent

### EC-4: User Deleted

- If winner's account is deleted, show "Winner account deleted"
- Points are not awarded

### EC-5: Game Deletion

- Only draft games can be deleted
- Cannot delete games with guesses

## Success Metrics

### SM-1: Engagement

- Track number of users participating per game
- Track average time to submit guess

### SM-2: Completion Rate

- Track percentage of users who guess vs. just view

### SM-3: Admin Usage

- Track number of games created per week
- Track average time from open to close

## Future Enhancements (Out of Scope)

- Multiple winners (top 3)
- Leaderboard for most accurate guessers
- Betting with points
- Live updates during bonus hunt
- Chat integration
- Notifications when guessing opens/closes
- Time-limited guessing windows
- Guess distribution chart (admin view)

## Dependencies

- Existing user authentication system
- Existing admin role system
- Existing points system
- PostgreSQL database
- Prisma ORM

## Testing Requirements

### Unit Tests

- Winner calculation algorithm
- Guess validation
- Status transitions

### Integration Tests

- Complete game flow (create → open → close → complete)
- Multiple users guessing
- Edge cases (no guesses, ties, etc.)

### E2E Tests

- Admin creates game and manages it
- User submits and edits guess
- Winner is correctly determined

## Acceptance Criteria

### AC-1: Admin Can Manage Games

- ✅ Create game with all required fields
- ✅ Open guessing
- ✅ Close guessing
- ✅ View all guesses
- ✅ Enter final balance and draw winner

### AC-2: Users Can Participate

- ✅ See active games
- ✅ Submit guess when open
- ✅ Edit guess when open
- ✅ Cannot guess when closed
- ✅ See winner when completed

### AC-3: Winner Determination

- ✅ Closest guess wins
- ✅ Ties handled correctly
- ✅ Winner receives points
- ✅ Winner displayed to all users

## Timeline Estimate

- Database schema: 1 hour
- Backend API: 4 hours
- Frontend UI: 4 hours
- Testing: 2 hours
- **Total: ~11 hours**

## Priority

**High** - Core feature for bonus hunt engagement

## Status

**Draft** - Awaiting approval
