# Setup Guide for New Streamer

This guide explains how to configure this platform for a different streamer.

---

## 🎯 What Needs to Be Changed

### 1. **Discord Application** (Required)

### 2. **Discord Server** (Required)

### 3. **Kick Channel** (Required)

### 4. **Admin User** (Required)

### 5. **Branding & Content** (Optional)

### 6. **Social Links** (Optional)

---

## 📋 Step-by-Step Configuration

### Step 1: Create Discord Application

Your friend needs to create their own Discord application:

1. **Go to:** https://discord.com/developers/applications
2. **Click:** "New Application"
3. **Name:** Choose a name (e.g., "StreamerName Bot")
4. **Click:** "Create"

#### Get Application Credentials:

**Application ID / Client ID:**

- Go to "General Information"
- Copy the "Application ID"
- Example: `1234567890123456789`

**Client Secret:**

- Go to "OAuth2" → "General"
- Click "Reset Secret" (or copy existing)
- Copy the "Client Secret"
- Example: `AbCdEfGhIjKlMnOpQrStUvWxYz123456`

**Public Key:**

- Go to "General Information"
- Copy the "Public Key"
- Example: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f`

#### Configure OAuth2:

1. **Go to:** OAuth2 → General
2. **Add Redirect URIs:**
   ```
   http://localhost:3001/api/auth/discord/callback
   https://your-backend-domain.com/api/auth/discord/callback
   ```
3. **Click:** "Save Changes"

#### Configure Bot (Optional - for future features):

1. **Go to:** "Bot" section
2. **Click:** "Add Bot"
3. **Enable Intents:**
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. **Copy Bot Token** (keep this secret!)

---

### Step 2: Get Discord Server Information

Your friend needs to provide their Discord server details:

#### Server ID (Guild ID):

1. **Enable Developer Mode:**
   - Discord Settings → Advanced → Enable "Developer Mode"

2. **Get Server ID:**
   - Right-click on the server icon
   - Click "Copy Server ID"
   - Example: `9876543210987654321`

#### Invite Link:

1. **Create Invite Link:**
   - Right-click on any channel
   - Click "Invite People"
   - Click "Edit invite link"
   - Set "Expire after" to "Never"
   - Set "Max number of uses" to "No limit"
   - Click "Generate a New Link"
   - Copy the link
   - Example: `https://discord.gg/AbCdEfGh`

---

### Step 3: Get Admin Discord User ID

Your friend's Discord User ID (to make them admin):

1. **Enable Developer Mode** (if not already)
2. **Get User ID:**
   - Right-click on their username anywhere in Discord
   - Click "Copy User ID"
   - Example: `1122334455667788990`
---

### Step 4: Get Kick Channel Information

Your friend's Kick streaming details:

**Kick Username:**

- Their Kick channel name
- Example: If channel is `kick.com/streamername`, username is `streamername`

**Kick Channel URL:**

- Full URL to their Kick channel
- Example: `https://kick.com/streamername`

---

### Step 5: Update Backend Configuration

Update `backend/.env` with the new information:

```env
# ============================================
# DISCORD CONFIGURATION
# ============================================

# Discord Application Credentials
DISCORD_CLIENT_ID="PASTE_APPLICATION_ID_HERE"
DISCORD_CLIENT_SECRET="PASTE_CLIENT_SECRET_HERE"

# Discord OAuth Redirect URI
# For local development:
DISCORD_REDIRECT_URI="http://localhost:3001/api/auth/discord/callback"
# For production (update after deployment):
# DISCORD_REDIRECT_URI="https://your-backend-domain.com/api/auth/discord/callback"

# Discord Server Verification
DISCORD_REQUIRE_SERVER_MEMBERSHIP="true"
DISCORD_GUILD_ID="PASTE_SERVER_ID_HERE"
DISCORD_INVITE_URL="PASTE_INVITE_LINK_HERE"

# Admin User(s)
# Can add multiple IDs separated by commas
ADMIN_DISCORD_IDS="PASTE_ADMIN_USER_ID_HERE"

# ============================================
# KICK CONFIGURATION
# ============================================

KICK_API_BASE_URL="https://kick.com/api/v2"
KICK_CHANNEL_NAME="PASTE_KICK_USERNAME_HERE"

# ============================================
# DATABASE CONFIGURATION
# ============================================

# Local Development
DATABASE_URL="postgresql://postgres:password@localhost:5432/streaming_backend"

# Production (update after deployment)
# DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/database"

# ============================================
# REDIS CONFIGURATION (Optional)
# ============================================

# Local Development
REDIS_URL="redis://localhost:6379"

# Production (update after deployment or skip)
# REDIS_URL="redis://your-elasticache-endpoint:6379"

# ============================================
# JWT & SECURITY
# ============================================

# Generate new secrets for production!
# Use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

JWT_SECRET="GENERATE_NEW_SECRET_HERE"
JWT_REFRESH_SECRET="GENERATE_NEW_SECRET_HERE"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

SESSION_SECRET="GENERATE_NEW_SECRET_HERE"
BCRYPT_ROUNDS=12

# ============================================
# SERVER CONFIGURATION
# ============================================

PORT=3001
NODE_ENV="development"

# Local Development
CORS_ORIGIN="http://localhost:3000"

# Production (update after deployment)
# CORS_ORIGIN="https://your-frontend-domain.com"

# ============================================
# RATE LIMITING
# ============================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# POINTS SYSTEM
# ============================================

POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5

# ============================================
# LOGGING
# ============================================

LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# ============================================
# EXTERNAL SERVICES (Optional)
# ============================================

WEBHOOK_SECRET="your-webhook-secret"
```

---

### Step 6: Update Frontend Branding (Optional)

#### Update Streamer Name & Info:

**File:** `frontend/components/Hero.tsx`

Find and update:

```typescript
// Change streamer name
<h1>MattySpins</h1>
// To:
<h1>YourFriendName</h1>

// Change description
<p>Welcome to MattySpins' community platform...</p>
// To:
<p>Welcome to YourFriendName's community platform...</p>
```

#### Update Kick Channel Link:

**File:** `frontend/components/SocialLinks.tsx`

Find and update:

```typescript
{
  name: "Kick",
  url: "https://kick.com/mattyspinsslots",
  // Change to:
  url: "https://kick.com/yourfriendusername",
}
```

#### Update Social Media Links:

**File:** `frontend/components/SocialLinks.tsx`

Update all social links:

```typescript
const socialLinks: SocialLink[] = [
  {
    name: "Discord",
    url: "PASTE_DISCORD_INVITE_LINK_HERE",
    icon: MessageCircle,
    color: "text-[#5865F2]",
    bgColor: "bg-[#5865F2]/20 hover:bg-[#5865F2]/30",
    followers: "Update follower count",
  },
  {
    name: "Kick",
    url: "PASTE_KICK_CHANNEL_URL_HERE",
    icon: Users,
    color: "text-[#53FC18]",
    bgColor: "bg-[#53FC18]/20 hover:bg-[#53FC18]/30",
    followers: "Update follower count",
  },
  {
    name: "YouTube",
    url: "PASTE_YOUTUBE_CHANNEL_URL_HERE",
    icon: Play,
    color: "text-[#FF0000]",
    bgColor: "bg-[#FF0000]/20 hover:bg-[#FF0000]/30",
    followers: "Update subscriber count",
  },
  {
    name: "Instagram",
    url: "PASTE_INSTAGRAM_URL_HERE",
    icon: Camera,
    color: "text-[#E4405F]",
    bgColor: "bg-[#E4405F]/20 hover:bg-[#E4405F]/30",
    followers: "Update follower count",
  },
  {
    name: "Twitter",
    url: "PASTE_TWITTER_URL_HERE",
    icon: Bell,
    color: "text-[#1DA1F2]",
    bgColor: "bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30",
    followers: "Update follower count",
  },
];
```

#### Update Avatar/Logo:

**Replace these files:**

- `frontend/public/mattyspins-avatar.png` → Replace with your friend's avatar
- `frontend/public/rainbet-logo.png` → Replace with sponsor logo (if applicable)

**Update references in:**

- `frontend/components/MattySpinsAvatar.tsx`
- `frontend/components/RainbetLogo.tsx`

---

### Step 7: Update Kick Configuration

**File:** `backend/.env`

```env
KICK_CHANNEL_NAME="yourfriendusername"
```

This is used for:

- Tracking viewing time
- Checking if stream is live
- Awarding points to viewers

---

### Step 8: Generate Security Secrets

For production, generate new secure secrets:

**Using Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run this command 3 times to generate:

1. `JWT_SECRET`
2. `JWT_REFRESH_SECRET`
3. `SESSION_SECRET`

Update in `backend/.env`:

```env
JWT_SECRET="generated-secret-1"
JWT_REFRESH_SECRET="generated-secret-2"
SESSION_SECRET="generated-secret-3"
```

---

## 📝 Configuration Checklist

Use this checklist to ensure everything is configured:

### Discord Setup:

- [ ] Created Discord Application
- [ ] Copied Application ID (Client ID)
- [ ] Copied Client Secret
- [ ] Added OAuth2 Redirect URIs
- [ ] Got Discord Server ID (Guild ID)
- [ ] Created permanent Discord invite link
- [ ] Got Admin User's Discord ID
- [ ] Updated `DISCORD_CLIENT_ID` in `.env`
- [ ] Updated `DISCORD_CLIENT_SECRET` in `.env`
- [ ] Updated `DISCORD_GUILD_ID` in `.env`
- [ ] Updated `DISCORD_INVITE_URL` in `.env`
- [ ] Updated `ADMIN_DISCORD_IDS` in `.env`

### Kick Setup:

- [ ] Got Kick username
- [ ] Updated `KICK_CHANNEL_NAME` in `.env`
- [ ] Updated Kick URL in `SocialLinks.tsx`

### Security:

- [ ] Generated new `JWT_SECRET`
- [ ] Generated new `JWT_REFRESH_SECRET`
- [ ] Generated new `SESSION_SECRET`

### Branding (Optional):

- [ ] Updated streamer name in Hero component
- [ ] Updated social media links
- [ ] Replaced avatar image
- [ ] Updated follower counts

### Database:

- [ ] Set up PostgreSQL database
- [ ] Updated `DATABASE_URL` in `.env`
- [ ] Ran database migrations

---

## 🚀 Testing the Configuration

After making all changes:

1. **Start the backend:**

   ```bash
   cd backend
   docker-compose up -d  # Start PostgreSQL
   npm run dev
   ```

2. **Start the frontend:**

   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Discord Login:**
   - Visit http://localhost:3000
   - Click "Discord" login button
   - Should redirect to Discord OAuth
   - Should require Discord server membership
   - Should redirect back and log in successfully

4. **Verify Admin Access:**
   - Log in with the admin Discord account
   - Should see "Admin" button in navigation
   - Should be able to access admin dashboard

---

## 🔧 Common Issues

### Issue: "You must be a member of the Discord server"

**Solution:**

- Verify `DISCORD_GUILD_ID` is correct
- Ensure the user is actually a member of the Discord server
- Check `DISCORD_REQUIRE_SERVER_MEMBERSHIP` is set to "true"

### Issue: Discord OAuth fails

**Solution:**

- Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct
- Check OAuth2 redirect URI matches exactly
- Ensure redirect URI is added in Discord Developer Portal

### Issue: User is not admin

**Solution:**

- Verify `ADMIN_DISCORD_IDS` contains the correct Discord User ID
- Check for typos in the User ID
- Restart backend after changing `.env`

### Issue: Kick integration not working

**Solution:**

- Verify `KICK_CHANNEL_NAME` is correct (just the username, not full URL)
- Check Kick API is accessible
- Ensure channel exists and is public

---

## 📦 Files to Modify Summary

### Required Changes:

1. `backend/.env` - All Discord, Kick, and security settings
2. `frontend/components/SocialLinks.tsx` - Kick URL and social links

### Optional Changes:

3. `frontend/components/Hero.tsx` - Streamer name and description
4. `frontend/public/mattyspins-avatar.png` - Avatar image
5. `frontend/public/rainbet-logo.png` - Sponsor logo
6. `frontend/components/MattySpinsAvatar.tsx` - Avatar component
7. `frontend/components/RainbetLogo.tsx` - Logo component

---

## 🎁 Handing Over to Your Friend

When giving this to your friend, provide them with:

1. **This guide** (`SETUP_FOR_NEW_STREAMER.md`)
2. **Their Discord Application credentials** (Client ID, Secret)
3. **Their Discord Server ID and Invite Link**
4. **Their Discord User ID** (for admin access)
5. **Their Kick username**
6. **Generated JWT secrets** (keep these secure!)
7. **Access to the codebase** (GitHub repository)
8. **Deployment guide** (`DEPLOYMENT_READY.md` or `FREE_DEPLOYMENT_GUIDE.md`)

### What They Need to Do:

1. Update `backend/.env` with their information
2. (Optional) Update branding/social links
3. Deploy to their hosting platform
4. Test everything works

---

## 💡 Tips

- **Keep secrets secure:** Never commit `.env` files to Git
- **Test locally first:** Make sure everything works before deploying
- **Backup database:** Regularly backup the PostgreSQL database
- **Monitor logs:** Check backend logs for errors
- **Update regularly:** Keep dependencies up to date

---

## 📞 Support

If your friend needs help:

- Check `DISCORD_SETUP_GUIDE.md` for Discord setup details
- Check `DEPLOYMENT_READY.md` for deployment instructions
- Check `FREE_DEPLOYMENT_GUIDE.md` for free hosting options
- Check backend logs in `backend/logs/` for errors

---

## 🔐 Security Reminders

- ✅ Generate new JWT secrets (don't use examples)
- ✅ Keep Discord Client Secret private
- ✅ Keep Bot Token private (if using bot features)
- ✅ Use HTTPS in production
- ✅ Enable rate limiting
- ✅ Regularly update dependencies
- ✅ Monitor for suspicious activity
- ✅ Backup database regularly

---

Good luck with your friend's streaming platform! 🎮🎉
