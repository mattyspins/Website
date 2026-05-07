# Guess the Balance - Phase 3 Complete

## Phase 3: Frontend API Client ✅

### Date: May 5, 2026

## Files Created

### 1. Types Definition

**File**: `frontend/types/guessTheBalance.ts`

**Contents**:

- `GuessTheBalanceStatus` enum (DRAFT, OPEN, CLOSED, COMPLETED)
- `GuessTheBalanceGame` interface
- `WinnerInfo` interface
- `GuessSubmission` interface
- DTOs: `CreateGameDTO`, `CompleteGameDTO`, `SubmitGuessDTO`
- API Response types: `GameResponse`, `GamesResponse`, `GuessResponse`, `GuessesResponse`, `DeleteGameResponse`

### 2. API Client

**File**: `frontend/lib/api/guessTheBalance.ts`

**Admin Methods**:

- `createGame(data)` - Create a new game
- `getAllGames(status?)` - Get all games with optional status filter
- `openGuessing(gameId)` - Open guessing for a game
- `closeGuessing(gameId)` - Close guessing for a game
- `completeGame(gameId, data)` - Complete game and draw winner
- `getAllGuesses(gameId)` - Get all guesses for a game
- `deleteGame(gameId)` - Delete a game

**User Methods**:

- `getActiveGames()` - Get active games (OPEN status)
- `getCompletedGames()` - Get completed games with winner info
- `getGameDetails(gameId)` - Get game details
- `submitGuess(gameId, data)` - Submit or update a guess
- `getUserGuess(gameId)` - Get current user's guess (returns null if not found)

### 3. Core API Update

**File**: `frontend/lib/api.ts`

**Added**:

- `patch()` method for PATCH HTTP requests (needed for open/close guessing endpoints)

## API Client Features

### Type Safety

- Full TypeScript support with proper types for all requests and responses
- Enum for game status to prevent invalid values
- Proper error handling with typed responses

### Error Handling

- `getUserGuess()` returns `null` for 404 errors (no guess found)
- Other errors are propagated for proper handling in components

### Consistent API Pattern

- Follows existing API client pattern in the project
- Uses the same `api` helper functions
- Consistent naming conventions
- Proper endpoint paths with `/api` prefix

## Usage Examples

### Admin Usage

```typescript
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";

// Create a game
const game = await guessTheBalanceApi.createGame({
  title: "Epic Bonus Hunt",
  description: "100 bonuses on Gates of Olympus",
  startingBalance: 1000,
  numberOfBonuses: 100,
  breakEvenMultiplier: 0.96,
});

// Open guessing
await guessTheBalanceApi.openGuessing(game.id);

// View all guesses
const { guesses, totalGuesses } = await guessTheBalanceApi.getAllGuesses(
  game.id,
);

// Close guessing
await guessTheBalanceApi.closeGuessing(game.id);

// Complete and draw winner
const completedGame = await guessTheBalanceApi.completeGame(game.id, {
  finalBalance: 1250.5,
  winnerReward: 500,
});
```

### User Usage

```typescript
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";

// Get active games
const activeGames = await guessTheBalanceApi.getActiveGames();

// Submit a guess
const guess = await guessTheBalanceApi.submitGuess(gameId, {
  guessAmount: 1200.5,
});

// Update guess
const updatedGuess = await guessTheBalanceApi.submitGuess(gameId, {
  guessAmount: 1300.75,
});

// Get my guess
const myGuess = await guessTheBalanceApi.getUserGuess(gameId);
if (myGuess) {
  console.log("My guess:", myGuess.guessAmount);
} else {
  console.log("No guess submitted yet");
}

// Get completed games
const completedGames = await guessTheBalanceApi.getCompletedGames();
```

## Next Steps

### Phase 4: Frontend - User View

1. Update Bonus Hunt page (`frontend/app/bonus-hunt/page.tsx`)
2. Create `GuessTheBalanceCard` component
3. Create `GuessSubmissionForm` component
4. Create `CompletedGameCard` component
5. Add real-time updates (optional)

### Phase 5: Frontend - Admin View

1. Create admin page (`frontend/app/admin/guess-the-balance/page.tsx`)
2. Create `CreateGameModal` component
3. Create `GameManagementCard` component
4. Create `ViewGuessesModal` component
5. Add confirmation dialogs

## Status

✅ **Phase 3 Complete!**

The frontend API client is fully implemented with:

- Complete type definitions
- All admin and user methods
- Proper error handling
- Consistent with existing codebase patterns

Ready to proceed with UI component development.
