# Configuration Summary - What to Change for New Streamer

## 🎯 Overview

This platform needs to be configured with your friend's information in **2 main places**:

1. **Backend Configuration** (`backend/.env`) - Discord, Kick, Security
2. **Frontend Branding** (Optional) - Names, Links, Images

---

## 📋 Required Changes (Must Do)

### Backend Configuration File: `backend/.env`

| Setting                 | What It Is          | Where to Get It                                | Example                       |
| ----------------------- | ------------------- | ---------------------------------------------- | ----------------------------- |
| `DISCORD_CLIENT_ID`     | Discord App ID      | Discord Developer Portal → General Information | `1234567890123456789`         |
| `DISCORD_CLIENT_SECRET` | Discord App Secret  | Discord Developer Portal → OAuth2 → General    | `AbCdEfGh123456...`           |
| `DISCORD_GUILD_ID`      | Discord Server ID   | Right-click server → Copy Server ID            | `9876543210987654321`         |
| `DISCORD_INVITE_URL`    | Discord Invite Link | Create permanent invite link                   | `https://discord.gg/AbCdEfGh` |
| `ADMIN_DISCORD_IDS`     | Admin User ID       | Right-click username → Copy User ID            | `1122334455667788990`         |
| `KICK_CHANNEL_NAME`     | Kick Username       | From kick.com/username                         | `streamername`                |
| `JWT_SECRET`            | Security Secret     | Generate with Node.js                          | `random-base64-string`        |
| `JWT_REFRESH_SECRET`    | Security Secret     | Generate with Node.js                          | `random-base64-string`        |
| `SESSION_SECRET`        | Security Secret     | Generate with Node.js                          | `random-base64-string`        |

---

## 🎨 Optional Changes (Nice to Have)

### Frontend Files to Update:

| File                                    | What to Change         | Line/Section                                           |
| --------------------------------------- | ---------------------- | ------------------------------------------------------ |
| `frontend/components/SocialLinks.tsx`   | Kick channel URL       | Line ~32: `url: "https://kick.com/..."`                |
| `frontend/components/SocialLinks.tsx`   | All social media links | Lines 23-62: Discord, YouTube, Instagram, Twitter URLs |
| `frontend/components/Hero.tsx`          | Streamer name          | Search for "MattySpins" and replace                    |
| `frontend/public/mattyspins-avatar.png` | Avatar image           | Replace file with new avatar                           |
| `frontend/public/rainbet-logo.png`      | Sponsor logo           | Replace file with new logo                             |

---

## 🔄 Step-by-Step Process

### Step 1: Get Discord Information

1. **Create Discord Application:**
   - Go to: https://discord.com/developers/applications
   - Click "New Application"
   - Name it (e.g., "StreamerName Bot")
   - Get Application ID and Client Secret

2. **Configure OAuth2:**
   - Add redirect URI: `http://localhost:3001/api/auth/discord/callback`
   - Add redirect URI: `https://your-backend-domain.com/api/auth/discord/callback`

3. **Get Server Info:**
   - Enable Developer Mode in Discord
   - Right-click server → Copy Server ID
   - Create permanent invite link

4. **Get Admin User ID:**
   - Right-click on your friend's username
   - Copy User ID

### Step 2: Get Kick Information

1. **Get Kick Username:**
   - From their Kick channel URL
   - Example: `kick.com/streamername` → username is `streamername`

### Step 3: Generate Security Secrets

Run this command **3 times** to generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Update Configuration

1. **Open:** `backend/.env`
2. **Replace all values** with the information collected above
3. **Save the file**

### Step 5: Update Branding (Optional)

1. **Update Kick link** in `frontend/components/SocialLinks.tsx`
2. **Update streamer name** in `frontend/components/Hero.tsx`
3. **Replace avatar image** in `frontend/public/`
4. **Update social links** in `frontend/components/SocialLinks.tsx`

### Step 6: Test Locally

```bash
# Terminal 1 - Backend
cd backend
docker-compose up -d
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000 and test Discord login.

---

## 🎯 What Each Configuration Does

### Discord Configuration:

- **Client ID & Secret:** Allows users to login with Discord
- **Guild ID:** Ensures only Discord server members can access
- **Invite URL:** Shown to non-members
- **Admin IDs:** Gives admin access to specific users

### Kick Configuration:

- **Channel Name:** Tracks viewing time and awards points
- **Used for:** Live status, viewer tracking, points system

### Security Secrets:

- **JWT Secret:** Encrypts user login tokens
- **Refresh Secret:** Encrypts refresh tokens
- **Session Secret:** Encrypts session data

---

## 📊 Configuration Impact

| Configuration            | Affects             | Impact if Wrong        |
| ------------------------ | ------------------- | ---------------------- |
| Discord Client ID/Secret | User login          | Login fails completely |
| Discord Guild ID         | Server verification | Wrong server checked   |
| Discord Invite URL       | Non-member message  | Wrong invite shown     |
| Admin Discord IDs        | Admin access        | Wrong person is admin  |
| Kick Channel Name        | Points system       | Points not awarded     |
| JWT Secrets              | Security            | Security vulnerability |

---

## ⚠️ Important Notes

### Security:

- ✅ **NEVER** commit `.env` file to Git
- ✅ **ALWAYS** generate new secrets for production
- ✅ **NEVER** share Discord Client Secret publicly
- ✅ Keep Bot Token private (if using bot features)

### Testing:

- ✅ Test locally before deploying
- ✅ Verify Discord login works
- ✅ Verify admin access works
- ✅ Verify server membership check works

### Deployment:

- ✅ Update `DISCORD_REDIRECT_URI` with production URL
- ✅ Update `CORS_ORIGIN` with production frontend URL
- ✅ Update `DATABASE_URL` with production database
- ✅ Set `NODE_ENV="production"`

---

## 🎁 Handover Package

When giving this to your friend, provide:

### 1. Documentation:

- [ ] `SETUP_FOR_NEW_STREAMER.md` (detailed guide)
- [ ] `QUICK_CONFIG_REFERENCE.md` (quick reference)
- [ ] `CONFIGURATION_SUMMARY.md` (this file)
- [ ] `DEPLOYMENT_READY.md` (deployment guide)

### 2. Credentials:

- [ ] Discord Application ID
- [ ] Discord Client Secret
- [ ] Discord Server ID
- [ ] Discord Invite Link
- [ ] Admin Discord User ID
- [ ] Generated JWT Secrets

### 3. Access:

- [ ] GitHub repository access
- [ ] Deployment platform credentials (if applicable)
- [ ] Database credentials (if applicable)

---

## 🚀 Quick Start for Your Friend

1. **Read:** `SETUP_FOR_NEW_STREAMER.md`
2. **Fill out:** `QUICK_CONFIG_REFERENCE.md` with their info
3. **Update:** `backend/.env` with their credentials
4. **Test:** Run locally to verify everything works
5. **Deploy:** Follow `DEPLOYMENT_READY.md` or `FREE_DEPLOYMENT_GUIDE.md`

---

## 📞 Support Resources

- **Discord Setup:** `DISCORD_SETUP_GUIDE.md`
- **Deployment:** `DEPLOYMENT_READY.md`
- **Free Hosting:** `FREE_DEPLOYMENT_GUIDE.md`
- **AWS Deployment:** `AWS_DEPLOYMENT_CHECKLIST.md`

---

## ✅ Final Checklist

Before handing over:

- [ ] All documentation files created
- [ ] Discord application created and configured
- [ ] All credentials collected
- [ ] `backend/.env.example` updated with instructions
- [ ] Tested locally with new configuration
- [ ] Removed any personal/test data from database
- [ ] Verified admin access works
- [ ] Verified Discord login works
- [ ] Verified server membership check works
- [ ] Created GitHub repository (if not already)
- [ ] Added friend as collaborator
- [ ] Provided deployment instructions

---

That's it! Your friend now has everything they need to run their own streaming platform! 🎉
