# Guess the Balance - Technical Design

## Architecture Overview

### System Components

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  PostgreSQL  │
│  (Next.js)  │◀─────│  (Express)   │◀─────│   Database   │
└─────────────┘      └──────────────┘      └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Socket.IO  │
                     │ (Real-time)  │
                     └──────────────┘
```

### Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: Next.js 14 + React + TypeScript
- **Real-time**: Socket.IO (optional for live updates)
- **Authentication**: Existing JWT system

---

## Database Schema

### Prisma Schema Addition

```prisma
model GuessTheBalance {
  id                   String   @id @default(uuid())
  title                String?
  description          String?
  startingBalance      Float
  numberOfBonuses      Int
  breakEvenMultiplier  Float
  finalBalance         Float?
  status               GuessTheBalanceStatus @default(DRAFT)
  winnerId             String?
  winnerGuess          Float?
  winnerReward         Int?      @default(0)

  // Relationships
  createdBy            String
  creator              User     @relation("GuessTheBalanceCreator", fields: [createdBy], references: [id])
  winner               User?    @relation("GuessTheBalanceWinner", fields: [winnerId], references: [id])
  guesses              GuessSubmission[]

  // Timestamps
  createdAt            DateTime @default(now())
  openedAt             DateTime?
  closedAt             DateTime?
  completedAt          DateTime?

  @@index([status])
  @@index([createdBy])
  @@map("guess_the_balance")
}

model GuessSubmission {
  id           String   @id @default(uuid())
  gameId       String
  userId       String
  guessAmount  Float

  // Relationships
  game         GuessTheBalance @relation(fields: [gameId], references: [id], onDelete: Cascade)
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Timestamps
  submittedAt  DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
  @@map("guess_submissions")
}

enum GuessTheBalanceStatus {
  DRAFT
  OPEN
  CLOSED
  COMPLETED
}
```

### User Model Updates

```prisma
model User {
  // ... existing fields ...

  // New relationships
  createdGames         GuessTheBalance[] @relation("GuessTheBalanceCreator")
  wonGames             GuessTheBalance[] @relation("GuessTheBalanceWinner")
  guessSubmissions     GuessSubmission[]
}
```

---

## API Design

### Admin Endpoints

#### 1. Create Game

```
POST /api/admin/guess-the-balance
Authorization: Bearer <admin_token>

Request Body:
{
  "title": "Epic Bonus Hunt #42",
  "description": "100 bonuses on Pragmatic Play slots",
  "startingBalance": 1000.00,
  "numberOfBonuses": 100,
  "breakEvenMultiplier": 0.96
}

Response: 201 Created
{
  "success": true,
  "game": {
    "id": "uuid",
    "title": "Epic Bonus Hunt #42",
    "startingBalance": 1000.00,
    "numberOfBonuses": 100,
    "breakEvenMultiplier": 0.96,
    "status": "DRAFT",
    "createdAt": "2026-05-05T10:00:00Z"
  }
}
```

#### 2. Open Guessing

```
PATCH /api/admin/guess-the-balance/:id/open
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "success": true,
  "game": {
    "id": "uuid",
    "status": "OPEN",
    "openedAt": "2026-05-05T10:05:00Z"
  }
}
```

#### 3. Close Guessing

```
PATCH /api/admin/guess-the-balance/:id/close
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "success": true,
  "game": {
    "id": "uuid",
    "status": "CLOSED",
    "closedAt": "2026-05-05T12:00:00Z",
    "totalGuesses": 45
  }
}
```

#### 4. Complete Game (Enter Final Balance & Draw Winner)

```
POST /api/admin/guess-the-balance/:id/complete
Authorization: Bearer <admin_token>

Request Body:
{
  "finalBalance": 1250.75,
  "winnerReward": 500
}

Response: 200 OK
{
  "success": true,
  "game": {
    "id": "uuid",
    "status": "COMPLETED",
    "finalBalance": 1250.75,
    "completedAt": "2026-05-05T14:00:00Z",
    "winner": {
      "id": "user-uuid",
      "displayName": "JohnDoe",
      "avatar": "https://...",
      "guessAmount": 1248.00,
      "difference": 2.75,
      "reward": 500
    }
  }
}
```

#### 5. View All Guesses

```
GET /api/admin/guess-the-balance/:id/guesses
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "success": true,
  "gameId": "uuid",
  "totalGuesses": 45,
  "guesses": [
    {
      "id": "guess-uuid",
      "user": {
        "id": "user-uuid",
        "displayName": "JohnDoe",
        "avatar": "https://..."
      },
      "guessAmount": 1248.00,
      "submittedAt": "2026-05-05T10:30:00Z",
      "updatedAt": "2026-05-05T11:00:00Z"
    }
  ]
}
```

#### 6. List All Games

```
GET /api/admin/guess-the-balance
Authorization: Bearer <admin_token>
Query: ?status=OPEN&limit=20&offset=0

Response: 200 OK
{
  "success": true,
  "games": [...],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

#### 7. Delete Game

```
DELETE /api/admin/guess-the-balance/:id
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "success": true,
  "message": "Game deleted successfully"
}
```

### User Endpoints

#### 1. List Active Games

```
GET /api/guess-the-balance
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "success": true,
  "games": [
    {
      "id": "uuid",
      "title": "Epic Bonus Hunt #42",
      "startingBalance": 1000.00,
      "numberOfBonuses": 100,
      "breakEvenMultiplier": 0.96,
      "status": "OPEN",
      "totalGuesses": 45,
      "userHasGuessed": true,
      "openedAt": "2026-05-05T10:05:00Z"
    }
  ]
}
```

#### 2. Get Game Details

```
GET /api/guess-the-balance/:id
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "success": true,
  "game": {
    "id": "uuid",
    "title": "Epic Bonus Hunt #42",
    "description": "100 bonuses on Pragmatic Play slots",
    "startingBalance": 1000.00,
    "numberOfBonuses": 100,
    "breakEvenMultiplier": 0.96,
    "status": "OPEN",
    "totalGuesses": 45,
    "userHasGuessed": true,
    "openedAt": "2026-05-05T10:05:00Z"
  }
}
```

#### 3. Submit/Update Guess

```
POST /api/guess-the-balance/:id/guess
Authorization: Bearer <token>

Request Body:
{
  "guessAmount": 1248.00
}

Response: 200 OK
{
  "success": true,
  "guess": {
    "id": "guess-uuid",
    "gameId": "uuid",
    "guessAmount": 1248.00,
    "submittedAt": "2026-05-05T10:30:00Z",
    "updatedAt": "2026-05-05T10:30:00Z"
  }
}
```

#### 4. Get My Guess

```
GET /api/guess-the-balance/:id/my-guess
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "guess": {
    "id": "guess-uuid",
    "guessAmount": 1248.00,
    "submittedAt": "2026-05-05T10:30:00Z",
    "updatedAt": "2026-05-05T11:00:00Z"
  }
}

// If no guess:
{
  "success": true,
  "guess": null
}
```

#### 5. List Completed Games

```
GET /api/guess-the-balance/completed
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "success": true,
  "games": [
    {
      "id": "uuid",
      "title": "Epic Bonus Hunt #42",
      "startingBalance": 1000.00,
      "finalBalance": 1250.75,
      "status": "COMPLETED",
      "winner": {
        "displayName": "JohnDoe",
        "avatar": "https://...",
        "guessAmount": 1248.00
      },
      "completedAt": "2026-05-05T14:00:00Z"
    }
  ]
}
```

---

## Backend Implementation

### File Structure

```
backend/src/
├── controllers/
│   └── GuessTheBalanceController.ts
├── services/
│   └── GuessTheBalanceService.ts
├── routes/
│   └── guessTheBalance.ts
├── middleware/
│   └── auth.ts (existing)
└── types/
    └── guessTheBalance.ts
```

### Service Layer (GuessTheBalanceService.ts)

```typescript
export class GuessTheBalanceService {
  // Admin methods
  static async createGame(data: CreateGameDTO, adminId: string): Promise<Game>;
  static async openGuessing(gameId: string): Promise<Game>;
  static async closeGuessing(gameId: string): Promise<Game>;
  static async completeGame(
    gameId: string,
    finalBalance: number,
    reward: number,
  ): Promise<GameWithWinner>;
  static async getAllGuesses(gameId: string): Promise<GuessWithUser[]>;
  static async deleteGame(gameId: string): Promise<void>;

  // User methods
  static async getActiveGames(userId?: string): Promise<Game[]>;
  static async getGameDetails(
    gameId: string,
    userId?: string,
  ): Promise<GameDetails>;
  static async submitGuess(
    gameId: string,
    userId: string,
    amount: number,
  ): Promise<Guess>;
  static async getUserGuess(
    gameId: string,
    userId: string,
  ): Promise<Guess | null>;
  static async getCompletedGames(): Promise<CompletedGame[]>;

  // Helper methods
  private static async calculateWinner(
    gameId: string,
    finalBalance: number,
  ): Promise<Winner>;
  private static async validateGameStatus(
    gameId: string,
    expectedStatus: Status,
  ): Promise<void>;
  private static async awardPoints(
    userId: string,
    points: number,
    reason: string,
  ): Promise<void>;
}
```

### Winner Calculation Algorithm

```typescript
private static async calculateWinner(
  gameId: string,
  finalBalance: number
): Promise<Winner | null> {
  // Get all guesses for the game
  const guesses = await prisma.guessSubmission.findMany({
    where: { gameId },
    include: { user: true },
    orderBy: { submittedAt: 'asc' } // First submission wins in case of tie
  });

  if (guesses.length === 0) {
    return null; // No winner
  }

  // Find closest guess
  let closestGuess = guesses[0];
  let smallestDifference = Math.abs(guesses[0].guessAmount - finalBalance);

  for (const guess of guesses) {
    const difference = Math.abs(guess.guessAmount - finalBalance);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestGuess = guess;
    }
  }

  return {
    userId: closestGuess.userId,
    user: closestGuess.user,
    guessAmount: closestGuess.guessAmount,
    difference: smallestDifference,
    isPerfect: smallestDifference === 0
  };
}
```

### Controller Layer (GuessTheBalanceController.ts)

```typescript
export class GuessTheBalanceController {
  // Admin endpoints
  static createGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Validate input
      // Call service
      // Return response
    },
  );

  static openGuessing = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Call service
      // Emit socket event (optional)
      // Return response
    },
  );

  static closeGuessing = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Call service
      // Emit socket event (optional)
      // Return response
    },
  );

  static completeGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Validate final balance
      // Call service (calculates winner, awards points)
      // Emit socket event (optional)
      // Return response
    },
  );

  static getAllGuesses = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Call service
      // Return response
    },
  );

  static deleteGame = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate admin
      // Check game status (only DRAFT can be deleted)
      // Call service
      // Return response
    },
  );

  // User endpoints
  static getActiveGames = asyncHandler(async (req: Request, res: Response) => {
    // Optional auth
    // Call service
    // Return response
  });

  static getGameDetails = asyncHandler(async (req: Request, res: Response) => {
    // Optional auth
    // Call service
    // Return response
  });

  static submitGuess = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate auth
      // Validate game is OPEN
      // Validate guess amount
      // Call service (upsert guess)
      // Return response
    },
  );

  static getUserGuess = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      // Validate auth
      // Call service
      // Return response
    },
  );

  static getCompletedGames = asyncHandler(
    async (req: Request, res: Response) => {
      // Optional auth
      // Call service
      // Return response
    },
  );
}
```

### Routes (guessTheBalance.ts)

```typescript
import { Router } from "express";
import { GuessTheBalanceController } from "@/controllers/GuessTheBalanceController";
import { authMiddleware, adminMiddleware } from "@/middleware/auth";

const router = Router();

// Admin routes
router.post(
  "/admin/guess-the-balance",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.createGame,
);

router.patch(
  "/admin/guess-the-balance/:id/open",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.openGuessing,
);

router.patch(
  "/admin/guess-the-balance/:id/close",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.closeGuessing,
);

router.post(
  "/admin/guess-the-balance/:id/complete",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.completeGame,
);

router.get(
  "/admin/guess-the-balance/:id/guesses",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.getAllGuesses,
);

router.delete(
  "/admin/guess-the-balance/:id",
  authMiddleware,
  adminMiddleware,
  GuessTheBalanceController.deleteGame,
);

// User routes
router.get("/guess-the-balance", GuessTheBalanceController.getActiveGames);

router.get(
  "/guess-the-balance/completed",
  GuessTheBalanceController.getCompletedGames,
);

router.get("/guess-the-balance/:id", GuessTheBalanceController.getGameDetails);

router.post(
  "/guess-the-balance/:id/guess",
  authMiddleware,
  GuessTheBalanceController.submitGuess,
);

router.get(
  "/guess-the-balance/:id/my-guess",
  authMiddleware,
  GuessTheBalanceController.getUserGuess,
);

export default router;
```

---

## Frontend Implementation

### File Structure

```
frontend/
├── app/
│   ├── bonus-hunt/
│   │   └── page.tsx (User view)
│   └── admin/
│       └── guess-the-balance/
│           └── page.tsx (Admin view)
├── components/
│   ├── GuessTheBalanceCard.tsx
│   ├── GuessSubmissionForm.tsx
│   ├── CompletedGameCard.tsx
│   └── admin/
│       ├── CreateGameModal.tsx
│       ├── GameManagementCard.tsx
│       └── ViewGuessesModal.tsx
└── lib/
    └── api/
        └── guessTheBalance.ts
```

### API Client (guessTheBalance.ts)

```typescript
export const guessTheBalanceAPI = {
  // Admin
  createGame: (data: CreateGameDTO) =>
    api.post("/admin/guess-the-balance", data),
  openGuessing: (gameId: string) =>
    api.patch(`/admin/guess-the-balance/${gameId}/open`),
  closeGuessing: (gameId: string) =>
    api.patch(`/admin/guess-the-balance/${gameId}/close`),
  completeGame: (gameId: string, data: CompleteGameDTO) =>
    api.post(`/admin/guess-the-balance/${gameId}/complete`, data),
  getAllGuesses: (gameId: string) =>
    api.get(`/admin/guess-the-balance/${gameId}/guesses`),
  deleteGame: (gameId: string) =>
    api.delete(`/admin/guess-the-balance/${gameId}`),

  // User
  getActiveGames: () => api.get("/guess-the-balance"),
  getGameDetails: (gameId: string) => api.get(`/guess-the-balance/${gameId}`),
  submitGuess: (gameId: string, amount: number) =>
    api.post(`/guess-the-balance/${gameId}/guess`, { guessAmount: amount }),
  getMyGuess: (gameId: string) =>
    api.get(`/guess-the-balance/${gameId}/my-guess`),
  getCompletedGames: () => api.get("/guess-the-balance/completed"),
};
```

### User View Component Structure

```typescript
// app/bonus-hunt/page.tsx
export default function BonusHuntPage() {
  return (
    <div>
      <h1>Bonus Hunt</h1>

      {/* Active Games Section */}
      <section>
        <h2>Active Guess the Balance</h2>
        <ActiveGamesGrid />
      </section>

      {/* Completed Games Section */}
      <section>
        <h2>Past Winners</h2>
        <CompletedGamesGrid />
      </section>
    </div>
  );
}

// components/GuessTheBalanceCard.tsx
export function GuessTheBalanceCard({ game }) {
  return (
    <Card>
      <CardHeader>
        <h3>{game.title}</h3>
        <StatusBadge status={game.status} />
      </CardHeader>

      <CardBody>
        <GameInfo
          startingBalance={game.startingBalance}
          numberOfBonuses={game.numberOfBonuses}
          breakEvenMultiplier={game.breakEvenMultiplier}
        />

        {game.status === 'OPEN' && (
          <GuessSubmissionForm gameId={game.id} />
        )}

        {game.status === 'CLOSED' && (
          <p>Guessing is closed. Waiting for results...</p>
        )}

        {game.status === 'COMPLETED' && (
          <WinnerDisplay winner={game.winner} finalBalance={game.finalBalance} />
        )}
      </CardBody>
    </Card>
  );
}
```

### Admin View Component Structure

```typescript
// app/admin/guess-the-balance/page.tsx
export default function AdminGuessTheBalancePage() {
  return (
    <div>
      <h1>Manage Guess the Balance</h1>

      <Button onClick={openCreateModal}>Create New Game</Button>

      <GamesList>
        {games.map(game => (
          <GameManagementCard key={game.id} game={game} />
        ))}
      </GamesList>

      <CreateGameModal />
    </div>
  );
}

// components/admin/GameManagementCard.tsx
export function GameManagementCard({ game }) {
  return (
    <Card>
      <CardHeader>
        <h3>{game.title}</h3>
        <StatusBadge status={game.status} />
      </CardHeader>

      <CardBody>
        <GameStats game={game} />

        <ActionButtons>
          {game.status === 'DRAFT' && (
            <>
              <Button onClick={openGuessing}>Open Guessing</Button>
              <Button onClick={deleteGame} variant="danger">Delete</Button>
            </>
          )}

          {game.status === 'OPEN' && (
            <>
              <Button onClick={closeGuessing}>Close Guessing</Button>
              <Button onClick={viewGuesses}>View Guesses ({game.totalGuesses})</Button>
            </>
          )}

          {game.status === 'CLOSED' && (
            <>
              <Input
                type="number"
                placeholder="Final Balance"
                value={finalBalance}
                onChange={setFinalBalance}
              />
              <Button onClick={completeGame}>Draw Winner</Button>
              <Button onClick={viewGuesses}>View Guesses ({game.totalGuesses})</Button>
            </>
          )}

          {game.status === 'COMPLETED' && (
            <>
              <WinnerDisplay winner={game.winner} />
              <Button onClick={viewGuesses}>View All Guesses</Button>
            </>
          )}
        </ActionButtons>
      </CardBody>
    </Card>
  );
}
```

---

## Real-time Updates (Optional)

### Socket.IO Events

```typescript
// Server-side events
io.to("guess-the-balance").emit("game:opened", { gameId, game });
io.to("guess-the-balance").emit("game:closed", { gameId, totalGuesses });
io.to("guess-the-balance").emit("game:completed", {
  gameId,
  winner,
  finalBalance,
});
io.to(`game:${gameId}`).emit("guess:submitted", { totalGuesses });

// Client-side listeners
socket.on("game:opened", (data) => {
  // Refresh active games list
});

socket.on("game:completed", (data) => {
  // Show winner announcement
  // Move game to completed section
});
```

---

## Validation Rules

### Backend Validation

```typescript
// Create Game
const createGameSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  startingBalance: z.number().positive().min(1),
  numberOfBonuses: z.number().int().positive().min(1).max(1000),
  breakEvenMultiplier: z.number().positive().min(0.01).max(10),
});

// Submit Guess
const submitGuessSchema = z.object({
  guessAmount: z.number().positive().min(0.01),
});

// Complete Game
const completeGameSchema = z.object({
  finalBalance: z.number().positive().min(0),
  winnerReward: z.number().int().min(0).optional(),
});
```

### Frontend Validation

```typescript
// Guess amount validation
- Must be positive number
- Must have max 2 decimal places
- Must be greater than 0
- Show error if invalid

// Admin form validation
- All required fields must be filled
- Numbers must be in valid ranges
- Show inline errors
```

---

## Error Handling

### Common Errors

```typescript
// Game not found
404: { error: 'Game not found' }

// Game not in correct status
400: { error: 'Game is not open for guessing' }

// User already guessed (when trying to create new)
409: { error: 'You have already submitted a guess' }

// Unauthorized
401: { error: 'Authentication required' }

// Forbidden (not admin)
403: { error: 'Admin access required' }

// Invalid input
400: { error: 'Invalid guess amount', details: [...] }
```

---

## Performance Considerations

### Database Indexes

- Index on `status` for filtering active games
- Index on `gameId` in GuessSubmission for fetching guesses
- Unique constraint on `(gameId, userId)` to prevent duplicate guesses

### Caching Strategy

- Cache active games list (5 minute TTL)
- Cache completed games list (1 hour TTL)
- Invalidate cache on status changes

### Query Optimization

- Use `select` to fetch only needed fields
- Use `include` judiciously
- Paginate admin game list
- Limit completed games to last 10

---

## Security Considerations

### Authorization

- Only admins can create/manage games
- Users can only see their own guesses
- Admins can see all guesses
- Validate user owns the guess before updating

### Input Sanitization

- Validate all numeric inputs
- Sanitize text inputs (title, description)
- Prevent SQL injection (Prisma handles this)
- Prevent XSS (React handles this)

### Rate Limiting

- Limit guess submissions (1 per 5 seconds per user)
- Limit game creation (5 per hour per admin)

---

## Testing Strategy

### Unit Tests

- Winner calculation algorithm
- Status transition validation
- Guess validation
- Points awarding

### Integration Tests

- Complete game flow
- Multiple users guessing
- Edge cases (no guesses, ties, etc.)
- Admin operations

### E2E Tests

- User submits and edits guess
- Admin creates and manages game
- Winner is correctly determined and displayed

---

## Deployment Strategy

### Local Development

1. Run Prisma migration
2. Seed test data
3. Test all endpoints
4. Test UI flows

### Production Deployment

1. Create migration file
2. Test migration on staging
3. Deploy backend code
4. Run migration on production
5. Deploy frontend code
6. Verify functionality

---

## Monitoring & Logging

### Metrics to Track

- Number of active games
- Average guesses per game
- Winner calculation time
- API response times

### Logs to Capture

- Game status changes
- Winner calculations
- Points awarded
- Errors and exceptions

---

## Future Enhancements

### Phase 2

- Multiple winners (top 3)
- Leaderboard for most accurate guessers
- Guess distribution chart (admin view)
- Email/Discord notifications

### Phase 3

- Betting with points
- Live updates during bonus hunt
- Chat integration
- Time-limited guessing windows

---

## Dependencies

### Backend

- Prisma (ORM)
- Zod (validation)
- Express (routing)
- Socket.IO (real-time, optional)

### Frontend

- React Query (data fetching)
- Framer Motion (animations)
- Tailwind CSS (styling)
- React Hook Form (forms)

---

## Rollback Plan

If issues arise:

1. Disable feature flag (if implemented)
2. Revert database migration
3. Revert code changes
4. Notify users of temporary unavailability

---

## Success Criteria

- ✅ Admin can create and manage games
- ✅ Users can submit and edit guesses
- ✅ Winner is correctly calculated
- ✅ Points are awarded to winner
- ✅ All edge cases handled
- ✅ No performance degradation
- ✅ All tests passing

---

**Status**: Ready for implementation
