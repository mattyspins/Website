# Guess the Balance - Deployment Checklist

## ✅ Pre-Deployment Checklist

### Database

- [x] Schema created with Prisma migration
- [x] Test data cleaned up
- [x] Database ready for production

### Backend

- [x] All API endpoints implemented and tested
- [x] Controllers created (GuessTheBalanceController)
- [x] Services created (GuessTheBalanceService)
- [x] Routes registered in index.ts
- [x] Rate limiting configured (5 games/hour)
- [x] Error handling implemented
- [x] Validation schemas with Zod

### Frontend

- [x] API client created (guessTheBalanceApi)
- [x] Type definitions created
- [x] User-facing UI (/bonus-hunt page)
- [x] Admin dashboard (/admin/guess-the-balance page)
- [x] All components created
- [x] Error handling improved
- [x] Admin dashboard tab added

### Testing

- [x] Local testing completed
- [x] Game creation working
- [x] Game workflow tested (DRAFT → OPEN → CLOSED → COMPLETED)
- [x] Winner calculation verified
- [x] Points awarding tested

## 🚀 Deployment Steps

### Step 1: Commit Changes

```bash
git add .
git commit -m "feat: Add Guess the Balance feature

- Add database schema for GuessTheBalance and GuessSubmission
- Implement backend API with full CRUD operations
- Create admin management interface
- Add user-facing bonus hunt page
- Implement winner calculation and points system
- Add rate limiting and validation
- Improve error handling in API client
- Add Guess the Balance tab to admin dashboard"
```

### Step 2: Push to Repository

```bash
git push origin main
```

### Step 3: Deploy Backend (Railway)

The backend will auto-deploy via Railway when you push to main.

**Important**: Run database migration on Railway:

```bash
# In Railway dashboard, go to your backend service
# Open the "Deploy" tab and run:
npx prisma migrate deploy
```

Or use the Railway CLI:

```bash
railway run npx prisma migrate deploy
```

### Step 4: Deploy Frontend (Vercel/Railway)

The frontend will auto-deploy when you push to main.

**Verify environment variables are set**:

- `NEXT_PUBLIC_API_URL` should point to your production backend URL

### Step 5: Post-Deployment Verification

1. **Check Backend Health**:
   - Visit: `https://your-backend-url.railway.app/health`
   - Should return: `{"status":"ok"}`

2. **Test API Endpoints**:

   ```bash
   # Get active games (should return empty array)
   curl https://your-backend-url.railway.app/api/guess-the-balance
   ```

3. **Test Frontend**:
   - Visit: `https://your-frontend-url.vercel.app`
   - Login as admin
   - Navigate to Admin → Guess the Balance
   - Create a test game
   - Verify it appears correctly

4. **Test Complete Workflow**:
   - Create game (DRAFT)
   - Open guessing (OPEN)
   - Submit guess as user
   - Close guessing (CLOSED)
   - Complete game (COMPLETED)
   - Verify winner and points

## 📋 Production Database Migration

If you need to run the migration manually on production:

```bash
# Connect to production database
railway run npx prisma migrate deploy

# Or if using direct connection:
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

## 🔧 Environment Variables

### Backend (.env on Railway)

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
ADMIN_DISCORD_IDS=1435983820968169482,1419427173630214184
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=https://your-backend-url/api/auth/discord/callback
FRONTEND_URL=https://your-frontend-url
```

### Frontend (.env.production on Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## 🎯 Features Deployed

### Admin Features

- Create new Guess the Balance games
- Set starting balance, number of bonuses, break-even multiplier
- Open/close guessing periods
- View all submitted guesses
- Complete games and automatically calculate winners
- Award points to winners
- Delete draft games
- View game history

### User Features

- View active games (OPEN status)
- Submit guesses (requires Discord login)
- Update guesses before closing
- View completed games with winners
- See winner information and rewards

### System Features

- Rate limiting (5 games per hour per IP)
- Input validation
- Error handling
- Winner calculation (closest guess wins)
- Automatic points awarding
- Real-time status updates

## 📊 Database Schema

### GuessTheBalance Table

- id, title, description
- startingBalance, numberOfBonuses, breakEvenMultiplier
- finalBalance, status (DRAFT/OPEN/CLOSED/COMPLETED)
- winnerId, winnerGuess, winnerReward
- timestamps (createdAt, openedAt, closedAt, completedAt)

### GuessSubmission Table

- id, gameId, userId
- guessAmount
- timestamps (submittedAt, updatedAt)
- Unique constraint: (gameId, userId)

## 🔍 Monitoring

After deployment, monitor:

- Backend logs for errors
- Database for game creation
- User submissions
- Winner calculations
- Points transactions

## 🐛 Troubleshooting

### Issue: Migration fails on Railway

**Solution**: Ensure DATABASE_URL is set correctly and database is accessible

### Issue: Frontend can't connect to backend

**Solution**: Check NEXT_PUBLIC_API_URL and CORS settings

### Issue: Rate limit too restrictive

**Solution**: Adjust in `backend/src/routes/guessTheBalance.ts`

### Issue: Games not appearing

**Solution**: Check authentication and admin permissions

## 📝 Notes

- Test data has been cleaned from local database
- Production database will start empty
- First game should be created by admin after deployment
- Users must login with Discord to submit guesses
- Admin Discord IDs are configured in environment variables

## ✨ Success Criteria

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Database migration successful
- [ ] Admin can create games
- [ ] Users can submit guesses
- [ ] Winner calculation works
- [ ] Points are awarded correctly
- [ ] No errors in production logs
