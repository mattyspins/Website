# Guess the Balance - Setup Instructions

## ✅ Phase 1 Complete: Database Schema

### What's Been Done:

1. **Prisma Schema Updated** ✅
   - Added `GuessTheBalance` model
   - Added `GuessSubmission` model
   - Added `GuessTheBalanceStatus` enum
   - Updated `User` model with new relationships
   - Added proper indexes and constraints

2. **Prisma Client Generated** ✅
   - TypeScript types are now available
   - Can use in code immediately

### What You Need to Do:

#### Option 1: Local Development (Recommended for Testing)

1. **Start Local PostgreSQL Database**:

   ```bash
   # If using Docker:
   cd backend
   docker-compose up -d postgres

   # Or start your local PostgreSQL service
   ```

2. **Run Migration**:

   ```bash
   cd backend
   npx prisma migrate dev --name add_guess_the_balance
   ```

3. **Verify Migration**:
   ```bash
   npx prisma studio
   # Check that guess_the_balance and guess_submissions tables exist
   ```

#### Option 2: Skip Local DB (Use Production Later)

If you don't want to set up local database:

- Continue with backend code implementation
- Test with TypeScript types (no runtime testing)
- When ready to deploy, run migration on Railway

---

## Next Steps:

### Phase 2: Backend Implementation

Now that the database schema is ready, we can implement:

1. **Types** (`backend/src/types/guessTheBalance.ts`)
2. **Service Layer** (`backend/src/services/GuessTheBalanceService.ts`)
3. **Controller Layer** (`backend/src/controllers/GuessTheBalanceController.ts`)
4. **Routes** (`backend/src/routes/guessTheBalance.ts`)

---

## Migration File Preview

When you run the migration, it will create:

```sql
-- CreateEnum
CREATE TYPE "GuessTheBalanceStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "guess_the_balance" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "starting_balance" DECIMAL(12,2) NOT NULL,
    "number_of_bonuses" INTEGER NOT NULL,
    "break_even_multiplier" DECIMAL(6,2) NOT NULL,
    "final_balance" DECIMAL(12,2),
    "status" "GuessTheBalanceStatus" NOT NULL DEFAULT 'DRAFT',
    "winner_id" TEXT,
    "winner_guess" DECIMAL(12,2),
    "winner_reward" INTEGER DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "guess_the_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guess_submissions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guess_amount" DECIMAL(12,2) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guess_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guess_the_balance_status_idx" ON "guess_the_balance"("status");

-- CreateIndex
CREATE INDEX "guess_the_balance_created_by_idx" ON "guess_the_balance"("created_by");

-- CreateIndex
CREATE INDEX "guess_submissions_game_id_idx" ON "guess_submissions"("game_id");

-- CreateIndex
CREATE INDEX "guess_submissions_user_id_idx" ON "guess_submissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guess_submissions_game_id_user_id_key" ON "guess_submissions"("game_id", "user_id");

-- AddForeignKey
ALTER TABLE "guess_the_balance" ADD CONSTRAINT "guess_the_balance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_the_balance" ADD CONSTRAINT "guess_the_balance_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_submissions" ADD CONSTRAINT "guess_submissions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "guess_the_balance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_submissions" ADD CONSTRAINT "guess_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Database Schema Overview

### guess_the_balance Table

- Stores game information
- Tracks status (DRAFT → OPEN → CLOSED → COMPLETED)
- Records winner and their guess
- Timestamps for each status change

### guess_submissions Table

- One guess per user per game (unique constraint)
- Can be updated while game is OPEN
- Cascades delete when game is deleted

### Relationships

- Game → Creator (User)
- Game → Winner (User, nullable)
- Submission → Game
- Submission → User

---

## Ready to Continue?

**Choose one:**

1. **"Set up local database"** - I'll help you start PostgreSQL and run the migration
2. **"Continue without local DB"** - I'll implement the backend code (no runtime testing)
3. **"Show me the backend code"** - I'll start implementing Phase 2

Let me know which option you prefer!
