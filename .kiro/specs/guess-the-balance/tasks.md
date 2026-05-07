# Guess the Balance - Implementation Tasks

## Phase 1: Database Setup

### Task 1.1: Create Prisma Schema

- [ ] Add `GuessTheBalance` model to schema.prisma
- [ ] Add `GuessSubmission` model to schema.prisma
- [ ] Add `GuessTheBalanceStatus` enum
- [ ] Update `User` model with new relationships
- [ ] Add indexes and constraints
- **Estimated Time**: 30 minutes

### Task 1.2: Create Migration

- [ ] Run `npx prisma migrate dev --name add_guess_the_balance`
- [ ] Verify migration file
- [ ] Test migration on local database
- [ ] Verify tables created correctly
- **Estimated Time**: 15 minutes

### Task 1.3: Update Prisma Client

- [ ] Run `npx prisma generate`
- [ ] Verify types are generated
- [ ] Test in TypeScript (no errors)
- **Estimated Time**: 5 minutes

---

## Phase 2: Backend Implementation

### Task 2.1: Create Types

- [ ] Create `backend/src/types/guessTheBalance.ts`
- [ ] Define DTOs (CreateGameDTO, CompleteGameDTO, etc.)
- [ ] Define response types
- [ ] Export all types
- **Estimated Time**: 20 minutes

### Task 2.2: Create Service Layer

- [ ] Create `backend/src/services/GuessTheBalanceService.ts`
- [ ] Implement `createGame()`
- [ ] Implement `openGuessing()`
- [ ] Implement `closeGuessing()`
- [ ] Implement `completeGame()` with winner calculation
- [ ] Implement `getAllGuesses()`
- [ ] Implement `deleteGame()`
- [ ] Implement `getActiveGames()`
- [ ] Implement `getGameDetails()`
- [ ] Implement `submitGuess()` (upsert logic)
- [ ] Implement `getUserGuess()`
- [ ] Implement `getCompletedGames()`
- [ ] Implement `calculateWinner()` helper
- [ ] Implement `awardPoints()` helper
- [ ] Add error handling
- [ ] Add logging
- **Estimated Time**: 2 hours

### Task 2.3: Create Controller Layer

- [ ] Create `backend/src/controllers/GuessTheBalanceController.ts`
- [ ] Implement admin endpoints (7 methods)
- [ ] Implement user endpoints (5 methods)
- [ ] Add input validation (Zod schemas)
- [ ] Add authorization checks
- [ ] Add error handling
- [ ] Add response formatting
- **Estimated Time**: 1.5 hours

### Task 2.4: Create Routes

- [ ] Create `backend/src/routes/guessTheBalance.ts`
- [ ] Define admin routes with middleware
- [ ] Define user routes with middleware
- [ ] Add rate limiting
- [ ] Export router
- **Estimated Time**: 30 minutes

### Task 2.5: Register Routes

- [ ] Import routes in `backend/src/index.ts`
- [ ] Add `app.use('/api/guess-the-balance', guessTheBalanceRoutes)`
- [ ] Add `app.use('/api/admin/guess-the-balance', guessTheBalanceRoutes)`
- [ ] Test routes are registered
- **Estimated Time**: 10 minutes

### Task 2.6: Test Backend APIs

- [ ] Create `backend/test-guess-the-balance.http`
- [ ] Test create game (admin)
- [ ] Test open guessing (admin)
- [ ] Test submit guess (user)
- [ ] Test edit guess (user)
- [ ] Test close guessing (admin)
- [ ] Test view guesses (admin)
- [ ] Test complete game (admin)
- [ ] Test get active games (user)
- [ ] Test get completed games (user)
- [ ] Test error cases
- **Estimated Time**: 1 hour

---

## Phase 3: Frontend - API Client

### Task 3.1: Create API Client

- [ ] Create `frontend/lib/api/guessTheBalance.ts`
- [ ] Implement admin API methods
- [ ] Implement user API methods
- [ ] Add TypeScript types
- [ ] Add error handling
- [ ] Export API client
- **Estimated Time**: 30 minutes

### Task 3.2: Create Types

- [ ] Create `frontend/types/guessTheBalance.ts`
- [ ] Define Game type
- [ ] Define Guess type
- [ ] Define Winner type
- [ ] Define DTOs
- [ ] Export all types
- **Estimated Time**: 15 minutes

---

## Phase 4: Frontend - User View

### Task 4.1: Update Bonus Hunt Page

- [ ] Open `frontend/app/bonus-hunt/page.tsx`
- [ ] Add "Guess the Balance" section
- [ ] Fetch active games
- [ ] Fetch completed games
- [ ] Add loading states
- [ ] Add error handling
- **Estimated Time**: 30 minutes

### Task 4.2: Create GuessTheBalanceCard Component

- [ ] Create `frontend/components/GuessTheBalanceCard.tsx`
- [ ] Display game info (starting balance, bonuses, multiplier)
- [ ] Show status badge
- [ ] Show total guesses count
- [ ] Conditional rendering based on status
- [ ] Add styling (Tailwind)
- **Estimated Time**: 45 minutes

### Task 4.3: Create GuessSubmissionForm Component

- [ ] Create `frontend/components/GuessSubmissionForm.tsx`
- [ ] Add number input for guess amount
- [ ] Fetch user's existing guess
- [ ] Pre-fill if user already guessed
- [ ] Add submit/update button
- [ ] Add validation
- [ ] Show success/error messages
- [ ] Disable when status is not OPEN
- [ ] Add loading state
- **Estimated Time**: 45 minutes

### Task 4.4: Create CompletedGameCard Component

- [ ] Create `frontend/components/CompletedGameCard.tsx`
- [ ] Display game info
- [ ] Display final balance
- [ ] Display winner info (name, avatar, guess)
- [ ] Display difference from final balance
- [ ] Show "Perfect Guess!" badge if exact match
- [ ] Add styling
- **Estimated Time**: 30 minutes

### Task 4.5: Add Real-time Updates (Optional)

- [ ] Connect to Socket.IO
- [ ] Listen for `game:opened` event
- [ ] Listen for `game:closed` event
- [ ] Listen for `game:completed` event
- [ ] Update UI when events received
- [ ] Show toast notifications
- **Estimated Time**: 45 minutes

---

## Phase 5: Frontend - Admin View

### Task 5.1: Create Admin Page

- [ ] Create `frontend/app/admin/guess-the-balance/page.tsx`
- [ ] Add page title and description
- [ ] Add "Create New Game" button
- [ ] Fetch all games
- [ ] Display games list
- [ ] Add loading states
- [ ] Add error handling
- **Estimated Time**: 30 minutes

### Task 5.2: Create CreateGameModal Component

- [ ] Create `frontend/components/admin/CreateGameModal.tsx`
- [ ] Add form fields (title, description, starting balance, etc.)
- [ ] Add validation
- [ ] Handle form submission
- [ ] Show success/error messages
- [ ] Close modal on success
- [ ] Refresh games list
- **Estimated Time**: 45 minutes

### Task 5.3: Create GameManagementCard Component

- [ ] Create `frontend/components/admin/GameManagementCard.tsx`
- [ ] Display game info
- [ ] Show status badge
- [ ] Show total guesses count
- [ ] Add action buttons based on status:
  - [ ] DRAFT: Open Guessing, Delete
  - [ ] OPEN: Close Guessing, View Guesses
  - [ ] CLOSED: Enter Final Balance, Draw Winner, View Guesses
  - [ ] COMPLETED: View Guesses, Winner Info
- [ ] Handle button clicks
- [ ] Add confirmation dialogs
- [ ] Show loading states
- **Estimated Time**: 1 hour

### Task 5.4: Create ViewGuessesModal Component

- [ ] Create `frontend/components/admin/ViewGuessesModal.tsx`
- [ ] Fetch all guesses for game
- [ ] Display in table format
- [ ] Show user info (name, avatar)
- [ ] Show guess amount
- [ ] Show submission/update time
- [ ] Sort by guess amount or time
- [ ] Add search/filter
- [ ] Add pagination if needed
- [ ] Export to CSV (optional)
- **Estimated Time**: 1 hour

### Task 5.5: Add Confirmation Dialogs

- [ ] Create reusable ConfirmDialog component
- [ ] Add confirmation for "Close Guessing"
- [ ] Add confirmation for "Delete Game"
- [ ] Add confirmation for "Draw Winner"
- [ ] Show relevant warnings
- **Estimated Time**: 30 minutes

---

## Phase 6: Testing

### Task 6.1: Backend Unit Tests

- [ ] Test winner calculation algorithm
- [ ] Test status transitions
- [ ] Test guess validation
- [ ] Test points awarding
- [ ] Test edge cases (no guesses, ties)
- **Estimated Time**: 1 hour

### Task 6.2: Backend Integration Tests

- [ ] Test complete game flow
- [ ] Test multiple users guessing
- [ ] Test concurrent guess submissions
- [ ] Test authorization
- [ ] Test error handling
- **Estimated Time**: 1 hour

### Task 6.3: Frontend Component Tests

- [ ] Test GuessSubmissionForm
- [ ] Test GameManagementCard
- [ ] Test winner display
- [ ] Test form validation
- **Estimated Time**: 1 hour

### Task 6.4: E2E Tests

- [ ] Test user flow (view, guess, edit, see winner)
- [ ] Test admin flow (create, open, close, complete)
- [ ] Test edge cases
- **Estimated Time**: 1 hour

### Task 6.5: Manual Testing

- [ ] Test on local development
- [ ] Test all user scenarios
- [ ] Test all admin scenarios
- [ ] Test on different browsers
- [ ] Test responsive design
- [ ] Test error states
- [ ] Test loading states
- **Estimated Time**: 1 hour

---

## Phase 7: Documentation

### Task 7.1: API Documentation

- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Add authentication requirements
- **Estimated Time**: 30 minutes

### Task 7.2: User Guide

- [ ] Write user guide for guessing
- [ ] Add screenshots
- [ ] Explain rules
- **Estimated Time**: 20 minutes

### Task 7.3: Admin Guide

- [ ] Write admin guide for managing games
- [ ] Add screenshots
- [ ] Explain workflow
- [ ] Document best practices
- **Estimated Time**: 30 minutes

---

## Phase 8: Deployment

### Task 8.1: Local Testing

- [ ] Run full test suite
- [ ] Fix any failing tests
- [ ] Test all features manually
- [ ] Verify no console errors
- [ ] Check performance
- **Estimated Time**: 1 hour

### Task 8.2: Code Review

- [ ] Review all code changes
- [ ] Check for security issues
- [ ] Check for performance issues
- [ ] Ensure code quality
- [ ] Get approval
- **Estimated Time**: 30 minutes

### Task 8.3: Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run migration on staging database
- [ ] Test all features on staging
- [ ] Fix any issues
- **Estimated Time**: 1 hour

### Task 8.4: Production Deployment

- [ ] Create backup of production database
- [ ] Deploy backend code
- [ ] Run migration on production
- [ ] Deploy frontend code
- [ ] Verify deployment
- [ ] Monitor for errors
- **Estimated Time**: 1 hour

### Task 8.5: Post-Deployment Verification

- [ ] Test all features on production
- [ ] Check logs for errors
- [ ] Monitor performance
- [ ] Verify database integrity
- [ ] Announce feature to users
- **Estimated Time**: 30 minutes

---

## Summary

### Total Estimated Time: ~20 hours

### Breakdown by Phase:

- Phase 1 (Database): 50 minutes
- Phase 2 (Backend): 5 hours 10 minutes
- Phase 3 (API Client): 45 minutes
- Phase 4 (User View): 3 hours 15 minutes
- Phase 5 (Admin View): 3 hours 45 minutes
- Phase 6 (Testing): 5 hours
- Phase 7 (Documentation): 1 hour 20 minutes
- Phase 8 (Deployment): 4 hours

### Priority Order:

1. **High Priority**: Phase 1, 2, 3 (Core functionality)
2. **Medium Priority**: Phase 4, 5 (UI implementation)
3. **Low Priority**: Phase 6, 7, 8 (Testing & deployment)

### Dependencies:

- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
- Phase 5 depends on Phase 3
- Phase 6 depends on Phase 4 & 5
- Phase 8 depends on Phase 6

---

## Next Steps

1. Review requirements and design documents
2. Get approval from stakeholders
3. Start with Phase 1 (Database Setup)
4. Work through phases sequentially
5. Test thoroughly before deployment

---

**Status**: Ready to start implementation
