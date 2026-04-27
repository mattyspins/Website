# Quick Configuration Reference Card

## 🎯 Essential Information Needed

### From Discord Developer Portal:

```
Application ID (Client ID):    _______________________________
Client Secret:                  _______________________________
Public Key:                     _______________________________
```

### From Discord Server:

```
Server ID (Guild ID):           _______________________________
Invite Link:                    _______________________________
```

### From Discord User:

```
Admin User ID:                  _______________________________
```

### From Kick:

```
Kick Username:                  _______________________________
Kick Channel URL:               _______________________________
```

---

## 📝 Configuration Files to Update

### 1. Backend Environment (`backend/.env`)

```env
# Discord
DISCORD_CLIENT_ID="_______________"
DISCORD_CLIENT_SECRET="_______________"
DISCORD_REDIRECT_URI="http://localhost:3001/api/auth/discord/callback"
DISCORD_GUILD_ID="_______________"
DISCORD_INVITE_URL="_______________"
ADMIN_DISCORD_IDS="_______________"

# Kick
KICK_CHANNEL_NAME="_______________"

# Security (Generate new!)
JWT_SECRET="_______________"
JWT_REFRESH_SECRET="_______________"
SESSION_SECRET="_______________"
```

### 2. Frontend Social Links (`frontend/components/SocialLinks.tsx`)

Line ~32:

```typescript
url: "https://kick.com/_______________",
```

---

## 🔑 Generate Security Secrets

Run this command 3 times:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

1. First output → `JWT_SECRET`
2. Second output → `JWT_REFRESH_SECRET`
3. Third output → `SESSION_SECRET`

---

## ✅ Quick Test Checklist

After configuration:

1. [ ] Backend starts without errors
2. [ ] Frontend starts without errors
3. [ ] Discord login button works
4. [ ] Redirects to Discord OAuth
5. [ ] Requires Discord server membership
6. [ ] Successfully logs in
7. [ ] Admin user sees "Admin" button
8. [ ] Admin dashboard accessible

---

## 🚨 Common Mistakes

❌ **Wrong:** `KICK_CHANNEL_NAME="https://kick.com/username"`
✅ **Right:** `KICK_CHANNEL_NAME="username"`

❌ **Wrong:** `DISCORD_REDIRECT_URI="https://backend.com/auth/discord/callback"`
✅ **Right:** `DISCORD_REDIRECT_URI="https://backend.com/api/auth/discord/callback"`

❌ **Wrong:** Using example secrets in production
✅ **Right:** Generate new random secrets

❌ **Wrong:** Committing `.env` file to Git
✅ **Right:** Keep `.env` in `.gitignore`

---

## 📞 Quick Links

- Discord Developer Portal: https://discord.com/developers/applications
- Full Setup Guide: `SETUP_FOR_NEW_STREAMER.md`
- Deployment Guide: `DEPLOYMENT_READY.md`
- Discord Setup: `DISCORD_SETUP_GUIDE.md`
