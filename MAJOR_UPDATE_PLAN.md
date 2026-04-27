# Major Update Plan - Kick OAuth & Manual Leaderboards

## 🎯 Changes Required

### 1. Kick OAuth Implementation

- [ ] Remove Kick link button
- [ ] Add Kick OAuth flow (after Discord)
- [ ] Store Kick OAuth tokens
- [ ] Update user model with Kick auth data
- [ ] Create Kick OAuth endpoints

### 2. Admin Search Enhancement

- [ ] Search by Discord username
- [ ] Search by Kick username
- [ ] Update search API endpoint
- [ ] Update admin UI

### 3. Manual Leaderboard System

- [ ] Create leaderboard model (prize, time limit, winners)
- [ ] Admin can create leaderboards
- [ ] Admin sets prize pool (e.g., $200, $500)
- [ ] Admin sets time limit/expiry
- [ ] Admin sets prize distribution for top N winners
- [ ] Running countdown clock on frontend
- [ ] Users manually enter wager amounts
- [ ] Leaderboard ranks by total wagers
- [ ] Auto-expire when time runs out

### 4. Database Schema Changes

- [ ] Add Kick OAuth fields to User model
- [ ] Create Leaderboard model
- [ ] Create LeaderboardEntry model (user wagers)
- [ ] Create LeaderboardPrize model (prize distribution)

---

## 📋 Implementation Steps

### Phase 1: Database Schema (Backend)

1. Update Prisma schema
2. Create migrations
3. Update TypeScript types

### Phase 2: Kick OAuth (Backend + Frontend)

1. Create Kick OAuth service
2. Create Kick OAuth endpoints
3. Update auth flow
4. Update frontend auth buttons

### Phase 3: Admin Search (Backend + Frontend)

1. Update search endpoint
2. Update admin UI

### Phase 4: Manual Leaderboards (Backend + Frontend)

1. Create leaderboard CRUD endpoints
2. Create wager entry endpoints
3. Create admin leaderboard management UI
4. Create user leaderboard view with countdown
5. Create wager entry UI

---

## ⚠️ Important Notes

- Kick OAuth API documentation may be limited
- Need Kick OAuth credentials (Client ID, Secret)
- Leaderboard system is now manual (no automatic tracking)
- Users self-report wagers (honor system or admin verification)

---

Let's start implementation!
