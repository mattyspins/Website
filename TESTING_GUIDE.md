# Guess the Balance - Testing Guide

## Prerequisites

1. **Backend Running**: `http://localhost:3001`
2. **Frontend Running**: `http://localhost:3000`
3. **Docker Desktop**: PostgreSQL and Redis containers running
4. **Admin Access**: Login with Discord account that has admin privileges

## Quick Start Testing

### Step 1: Restart Frontend (Important!)

```bash
cd frontend
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Step 2: Clear Browser Cache

- Open DevTools (F12)
- Right-click the refresh button → "Empty Cache and Hard Reload"
- Or: Clear localStorage in Console tab: `localStorage.clear()`

### Step 3: Login as Admin

1. Go to `http://localhost:3000`
2. Click "Login with Discord"
3. Verify you see admin options in the navbar

### Step 4: Access Admin Dashboard

1. Click "Admin" in the navbar
2. You should see the dashboard with tabs:
   - Overview
   - Users
   - Leaderboards
   - **Guess the Balance** ← Click this
   - Schedule

### Step 5: Navigate to Guess the Balance Management

1. Click the "🎯 Guess the Balance" tab
2. Click "Manage Games" button
3. You should be redirected to `/admin/guess-the-balance`

### Step 6: Create a New Game

1. Click "Create New Game" button
2. Fill in the form:
   - **Title**: "Test Game" (optional)
   - **Description**: "Testing the fix" (optional)
   - **Starting Balance**: 1000
   - **Number of Bonuses**: 100
   - **Break-even Multiplier**: 0.96
3. Click "Create Game"

### Step 7: Check Console Logs

Open DevTools Console (F12) and look for:

```
[Modal] Creating game with data: {...}
[API] Creating game with data: {...}
[API] Received response: {...}
[API] Returning game: {...}
[Modal] Game created successfully: {...}
```

## Expected Results

### Success Case

- ✅ Modal closes automatically
- ✅ New game appears in the "Draft Games" section
- ✅ Console shows successful creation logs
- ✅ No errors in console

### Rate Limit Case

- ⚠️ Error message: "Rate limit reached. Please wait before creating more games."
- ⚠️ Modal stays open with error displayed
- ⚠️ Console shows rate limit error

## Troubleshooting

### Issue: "Rate limit reached"

**Solution 1**: Wait 1 hour
**Solution 2**: Delete existing DRAFT games
**Solution 3**: Temporarily increase rate limit:

```typescript
// backend/src/routes/guessTheBalance.ts
const createGameLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Change from 5 to 50
  // ...
});
```

### Issue: "Authentication required"

**Solution**:

1. Check if you're logged in
2. Check localStorage for `access_token`
3. Regenerate test token if expired:

```bash
cd backend
npx ts-node generate-test-tokens.ts
```

### Issue: "Invalid response from server"

**Solution**:

1. Check backend is running: `http://localhost:3001/api/guess-the-balance/admin`
2. Check CORS settings in backend
3. Check browser console for network errors
4. Verify API_URL in `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001`

### Issue: Game created but not showing

**Solution**:

1. Refresh the page
2. Check if game was created via API:

```bash
# PowerShell
$token = "YOUR_ADMIN_TOKEN"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3001/api/guess-the-balance/admin" -Method GET -Headers $headers | ConvertTo-Json -Depth 10
```

## Complete Workflow Test

### 1. Create Game (DRAFT)

- Click "Create New Game"
- Fill form and submit
- Verify game appears in "Draft Games" section

### 2. Open Guessing (DRAFT → OPEN)

- Find your game in "Draft Games"
- Click "Open Guessing" button
- Verify game moves to "Active Games" section
- Verify status changes to "OPEN"

### 3. Submit Guess (as User)

- Logout from admin account
- Login as regular user
- Go to `/bonus-hunt` page
- Find the active game
- Submit a guess (e.g., 1200)
- Verify "Your guess: $1200" appears

### 4. Close Guessing (OPEN → CLOSED)

- Login back as admin
- Go to `/admin/guess-the-balance`
- Find game in "Active Games"
- Click "Close Guessing"
- Verify game moves to "Closed Games" section

### 5. Complete Game (CLOSED → COMPLETED)

- Find game in "Closed Games"
- Click "Complete Game"
- Enter final balance (e.g., 1325)
- Enter winner reward (e.g., 500 points)
- Click "Complete Game"
- Verify:
  - Winner is calculated correctly
  - Points are awarded
  - Game moves to "Completed Games" section

### 6. View Completed Game

- Go to `/bonus-hunt` page
- Scroll to "Completed Games"
- Verify winner information is displayed
- Verify final balance and winner's guess

## API Testing (Alternative)

If frontend testing fails, test the API directly:

### Get All Games

```bash
$token = "YOUR_ADMIN_TOKEN"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3001/api/guess-the-balance/admin" -Method GET -Headers $headers | ConvertTo-Json -Depth 10
```

### Create Game

```bash
$token = "YOUR_ADMIN_TOKEN"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ startingBalance = 1000; numberOfBonuses = 100; breakEvenMultiplier = 0.96 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/guess-the-balance/admin" -Method POST -Headers $headers -Body $body | ConvertTo-Json -Depth 10
```

### Open Guessing

```bash
$token = "YOUR_ADMIN_TOKEN"
$gameId = "YOUR_GAME_ID"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3001/api/guess-the-balance/admin/$gameId/open" -Method PATCH -Headers $headers | ConvertTo-Json -Depth 10
```

## Test Tokens

Generate fresh tokens:

```bash
cd backend
npx ts-node generate-test-tokens.ts
```

Copy the admin token and use it in:

1. Browser: Store in localStorage as `access_token`
2. API Testing: Use in Authorization header

## Success Criteria

- [ ] Frontend compiles without errors
- [ ] Can access admin dashboard
- [ ] Can see Guess the Balance tab
- [ ] Can navigate to management page
- [ ] Can create a new game
- [ ] Game appears in UI immediately
- [ ] Console logs show successful flow
- [ ] Can complete full workflow (create → open → guess → close → complete)
- [ ] Winner is calculated correctly
- [ ] Points are awarded to winner

## Notes

- Rate limit: 5 games per hour
- Test tokens expire after 24 hours
- Admin Discord IDs: `1435983820968169482,1419427173630214184`
- Backend logs: `backend/logs/combined.log`
- Frontend runs on port 3000
- Backend runs on port 3001
