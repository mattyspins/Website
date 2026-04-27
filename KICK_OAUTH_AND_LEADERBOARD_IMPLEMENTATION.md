# Kick OAuth & Manual Leaderboard Implementation Guide

## ⚠️ Important Notice

These are **major changes** that will require:

- Database migration (data may be lost if not careful)
- Kick OAuth credentials (may not be publicly available)
- Significant code changes across backend and frontend
- Testing and debugging time

**Estimated Implementation Time:** 8-12 hours

---

## 🎯 Changes Overview

### 1. Kick OAuth (Instead of Link)

- Users must authorize with Kick after Discord
- Store Kick OAuth tokens
- Use Kick API for user data

### 2. Admin Search Enhancement

- Search users by Discord username OR Kick username
- Update search API and UI

### 3. Manual Leaderboard System

- Admin creates leaderboards with prize pools
- Admin sets time limits and prize distribution
- Users manually enter wager amounts
- Running countdown clock on frontend
- Leaderboard ranks by total wagers

---

## 📊 Database Schema Changes

### Updated User Model:

```prisma
model User {
  // ... existing fields ...
  kickId               String?   @unique @map("kick_id") // NEW
  kickAccessToken      String?   @map("kick_access_token") // NEW
  kickRefreshToken     String?   @map("kick_refresh_token") // NEW
  kickTokenExpiresAt   DateTime? @map("kick_token_expires_at") // NEW
}
```

### New Leaderboard Models:

```prisma
model Leaderboard {
  id              String    @id @default(uuid())
  title           String
  description     String?
  prizePool       String    // e.g., "$200", "$500"
  status          String    @default("active")
  startDate       DateTime
  endDate         DateTime
  createdBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  prizes  LeaderboardPrize[]
  wagers  LeaderboardWager[]
}

model LeaderboardPrize {
  id              String   @id @default(uuid())
  leaderboardId   String
  position        Int // 1st, 2nd, 3rd
  prizeAmount     String // e.g., "$100"
  prizeDescription String?
}

model LeaderboardWager {
  id              String   @id @default(uuid())
  leaderboardId   String
  userId          String
  wagerAmount     Decimal  @db.Decimal(12, 2)
  submittedAt     DateTime @default(now())
  verifiedBy      String? // Admin who verified
  verifiedAt      DateTime?
}
```

---

## 🚧 Implementation Challenges

### 1. Kick OAuth API

**Problem:** Kick's OAuth API may not be publicly documented or available.

**Solutions:**

- **Option A:** Contact Kick support for OAuth credentials
- **Option B:** Use Kick's public API (if available) without OAuth
- **Option C:** Keep manual Kick username entry (current system)

**Recommendation:** Start with Option C (manual entry) until Kick OAuth is confirmed available.

---

### 2. Wager Verification

**Problem:** Users self-report wagers (honor system).

**Solutions:**

- **Option A:** Trust system (users enter, admin can verify later)
- **Option B:** Require screenshot upload
- **Option C:** Admin manually enters all wagers

**Recommendation:** Option A with admin verification feature.

---

## 📝 Implementation Steps

### Phase 1: Database Migration (1-2 hours)

1. **Update Prisma Schema:**

   ```bash
   # Already done in schema.prisma
   ```

2. **Create Migration:**

   ```bash
   cd backend
   npx prisma migrate dev --name add_kick_oauth_and_manual_leaderboards
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

---

### Phase 2: Backend - Kick OAuth (2-3 hours)

**IF Kick OAuth is available:**

1. **Create Kick OAuth Service** (`backend/src/services/KickOAuthService.ts`):

   ```typescript
   export class KickOAuthService {
     static getAuthUrl(): string {
       // Generate Kick OAuth URL
     }

     static async exchangeCode(code: string) {
       // Exchange code for tokens
     }

     static async refreshToken(refreshToken: string) {
       // Refresh access token
     }

     static async getUserInfo(accessToken: string) {
       // Get Kick user info
     }
   }
   ```

2. **Create Kick OAuth Routes** (`backend/src/routes/kickAuth.ts`):

   ```typescript
   router.get("/kick/initiate", kickAuthController.initiate);
   router.get("/kick/callback", kickAuthController.callback);
   ```

3. **Update Auth Flow:**
   - After Discord auth, redirect to Kick OAuth
   - Store Kick tokens in database
   - Update user with Kick ID and username

**IF Kick OAuth is NOT available:**

- Keep current manual Kick username entry system
- Skip this phase

---

### Phase 3: Backend - Manual Leaderboards (3-4 hours)

1. **Create Leaderboard Service** (`backend/src/services/LeaderboardService.ts`):

   ```typescript
   export class LeaderboardService {
     // Admin creates leaderboard
     static async createLeaderboard(data) {}

     // Admin sets prizes
     static async setPrizes(leaderboardId, prizes) {}

     // User submits wager
     static async submitWager(leaderboardId, userId, amount) {}

     // Get leaderboard rankings
     static async getRankings(leaderboardId) {}

     // Admin verifies wager
     static async verifyWager(wagerId, adminId) {}

     // End leaderboard
     static async endLeaderboard(leaderboardId) {}
   }
   ```

2. **Create Leaderboard Controller** (`backend/src/controllers/LeaderboardController.ts`)

3. **Create Leaderboard Routes** (`backend/src/routes/leaderboard.ts`):

   ```typescript
   // Admin routes
   router.post("/leaderboards", auth, adminOnly, create);
   router.put("/leaderboards/:id", auth, adminOnly, update);
   router.post("/leaderboards/:id/prizes", auth, adminOnly, setPrizes);
   router.post("/leaderboards/:id/end", auth, adminOnly, end);
   router.post("/wagers/:id/verify", auth, adminOnly, verifyWager);

   // User routes
   router.get("/leaderboards", getActive);
   router.get("/leaderboards/:id", getById);
   router.get("/leaderboards/:id/rankings", getRankings);
   router.post("/leaderboards/:id/wagers", auth, submitWager);
   ```

---

### Phase 4: Backend - Enhanced Search (30 minutes)

1. **Update Admin Service** (`backend/src/services/AdminService.ts`):
   ```typescript
   static async searchUsers(query: string) {
     return prisma.user.findMany({
       where: {
         OR: [
           { displayName: { contains: query, mode: 'insensitive' } },
           { discordId: { contains: query } },
           { kickUsername: { contains: query, mode: 'insensitive' } },
         ],
       },
     });
   }
   ```

---

### Phase 5: Frontend - Kick OAuth Button (1 hour)

**IF Kick OAuth is available:**

1. **Update AuthButtons Component:**

   ```typescript
   const handleKickLogin = async () => {
     const response = await fetch(`${API_URL}/api/auth/kick/initiate`);
     const { authUrl } = await response.json();
     window.location.href = authUrl;
   };
   ```

2. **Create Kick Callback Page** (`frontend/app/auth/kick-callback/page.tsx`)

**IF Kick OAuth is NOT available:**

- Keep current system (manual username entry)

---

### Phase 6: Frontend - Manual Leaderboards (3-4 hours)

1. **Create Admin Leaderboard Management** (`frontend/components/admin/AdminLeaderboards.tsx`):
   - Create leaderboard form
   - Set prize distribution
   - View active leaderboards
   - End leaderboards
   - Verify wagers

2. **Create User Leaderboard View** (`frontend/app/leaderboard/page.tsx`):
   - Show active leaderboards
   - Display countdown timer
   - Show rankings table
   - Submit wager form
   - Show user's current rank

3. **Create Countdown Timer Component** (`frontend/components/CountdownTimer.tsx`):
   ```typescript
   export function CountdownTimer({ endDate }: { endDate: Date }) {
     const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endDate));

     useEffect(() => {
       const timer = setInterval(() => {
         setTimeLeft(calculateTimeLeft(endDate));
       }, 1000);
       return () => clearInterval(timer);
     }, [endDate]);

     return (
       <div className="countdown">
         <span>{timeLeft.days}d</span>
         <span>{timeLeft.hours}h</span>
         <span>{timeLeft.minutes}m</span>
         <span>{timeLeft.seconds}s</span>
       </div>
     );
   }
   ```

---

## 🧪 Testing Checklist

### Leaderboard System:

- [ ] Admin can create leaderboard
- [ ] Admin can set multiple prizes
- [ ] Admin can set time limit
- [ ] Countdown timer displays correctly
- [ ] Users can submit wagers
- [ ] Rankings update correctly
- [ ] Admin can verify wagers
- [ ] Leaderboard auto-expires
- [ ] Winners are determined correctly

### Search:

- [ ] Search by Discord username works
- [ ] Search by Kick username works
- [ ] Search is case-insensitive

### Kick OAuth (if implemented):

- [ ] Kick OAuth flow works
- [ ] Tokens are stored securely
- [ ] Tokens refresh automatically
- [ ] User data syncs correctly

---

## 🚀 Deployment Considerations

1. **Database Migration:**

   ```bash
   npx prisma migrate deploy
   ```

2. **Environment Variables:**

   ```env
   # If Kick OAuth is implemented
   KICK_CLIENT_ID="your-kick-client-id"
   KICK_CLIENT_SECRET="your-kick-client-secret"
   KICK_REDIRECT_URI="https://your-backend.com/api/auth/kick/callback"
   ```

3. **Data Migration:**
   - Existing users won't have Kick OAuth data
   - They'll need to re-authorize with Kick

---

## ⚠️ Risks & Considerations

1. **Kick OAuth Availability:**
   - May not be publicly available
   - May require partnership with Kick
   - Fallback: Keep manual username entry

2. **Wager Verification:**
   - Honor system can be abused
   - Consider requiring proof (screenshots)
   - Admin verification adds workload

3. **Database Migration:**
   - Backup database before migrating
   - Test migration on staging first
   - Existing data may need manual updates

4. **User Experience:**
   - Two-step auth (Discord + Kick) may be friction
   - Consider making Kick optional initially
   - Clear instructions needed

---

## 💡 Recommendations

### Immediate Actions:

1. ✅ **Database schema is updated** (already done)
2. ⏸️ **Hold on Kick OAuth** until confirmed available
3. ✅ **Proceed with Manual Leaderboards** (can implement now)
4. ✅ **Implement Enhanced Search** (quick win)

### Phased Approach:

**Phase 1 (Now):**

- Implement manual leaderboards
- Implement enhanced search
- Keep manual Kick username entry

**Phase 2 (Later):**

- Add Kick OAuth when/if available
- Add wager verification features
- Add screenshot upload for wagers

---

## 🤔 Decision Required

Before proceeding, please confirm:

1. **Kick OAuth:**
   - [ ] Do you have Kick OAuth credentials?
   - [ ] Should we proceed without Kick OAuth for now?

2. **Wager System:**
   - [ ] Trust-based (users enter, admin verifies later)?
   - [ ] Screenshot required?
   - [ ] Admin-only entry?

3. **Timeline:**
   - [ ] Implement everything now (8-12 hours)?
   - [ ] Implement in phases?
   - [ ] Start with leaderboards only?

**Please let me know how you'd like to proceed!**
