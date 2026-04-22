# Discord OAuth Setup Guide

## Step-by-Step: Getting Discord Client ID and Secret

### Step 1: Go to Discord Developer Portal

1. Open your browser and go to: **https://discord.com/developers/applications**
2. Log in with your Discord account

### Step 2: Create a New Application

1. Click the **"New Application"** button (top right)
2. Give it a name (e.g., "MattySpins Website" or "Streaming Platform")
3. Click **"Create"**

### Step 3: Get Your Client ID

1. You're now on the "General Information" page
2. You'll see **"APPLICATION ID"** - this is your **Client ID**
3. Click the **"Copy"** button to copy it
4. Save it somewhere - you'll need this for your `.env` file

```
DISCORD_CLIENT_ID="paste_your_client_id_here"
```

### Step 4: Get Your Client Secret

1. Still on the "General Information" page
2. Scroll down to **"CLIENT SECRET"**
3. Click **"Reset Secret"** (if it's your first time, it might say "Copy")
4. **IMPORTANT:** Copy this secret immediately - you won't be able to see it again!
5. Save it securely

```
DISCORD_CLIENT_SECRET="paste_your_client_secret_here"
```

### Step 5: Set Up OAuth2 Redirect URL

1. Click on **"OAuth2"** in the left sidebar
2. Click on **"General"** under OAuth2
3. Scroll down to **"Redirects"**
4. Click **"Add Redirect"**
5. Enter: `http://localhost:3001/api/auth/discord/callback`
6. Click **"Save Changes"** at the bottom

**For production later, you'll also add:**

- `https://yourdomain.com/api/auth/discord/callback`

### Step 6: Set Up OAuth2 Scopes (Important!)

While you're in OAuth2 settings:

1. Scroll to **"OAuth2 URL Generator"**
2. Under **"SCOPES"**, select:
   - ✅ `identify` (to get user's Discord ID and username)
   - ✅ `email` (to get user's email)
   - ✅ `guilds` (to check server membership - **required for server verification feature**)
3. Under **"REDIRECT URL"**, select the one you just added
4. Copy the generated URL - you can use this to test OAuth manually

**Note:** The `guilds` scope is required if you want to enable Discord server membership verification. This allows the backend to check if users are members of your Discord server before allowing them to log in.

### Step 7: Create a Discord Bot (For Notifications)

1. Click on **"Bot"** in the left sidebar
2. Click **"Add Bot"** (or "Reset Token" if bot already exists)
3. Confirm by clicking **"Yes, do it!"**
4. Under **"TOKEN"**, click **"Copy"** to copy your bot token
5. Save this token securely

```
DISCORD_BOT_TOKEN="paste_your_bot_token_here"
```

**Bot Permissions (for later when you invite the bot):**

- ✅ Send Messages
- ✅ Embed Links
- ✅ Read Message History

### Step 8: Bot Intents (Important!)

Still on the Bot page:

1. Scroll down to **"Privileged Gateway Intents"**
2. Enable:
   - ✅ **SERVER MEMBERS INTENT** (if you want to access member info)
   - ✅ **MESSAGE CONTENT INTENT** (if bot needs to read messages)

### Step 9: Update Your `.env` File

Now update your `backend/.env` file with all the credentials:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID="your_actual_client_id_here"
DISCORD_CLIENT_SECRET="your_actual_client_secret_here"
DISCORD_REDIRECT_URI="http://localhost:3001/api/auth/discord/callback"
DISCORD_BOT_TOKEN="your_actual_bot_token_here"
```

### Step 10: Get Your Discord Server ID (For Server Membership Verification)

If you want to require users to be members of your Discord server:

1. **Enable Developer Mode in Discord:**
   - Open Discord
   - Click the ⚙️ (User Settings) at the bottom left
   - Go to **"Advanced"** (under "App Settings")
   - Toggle **"Developer Mode"** ON

2. **Get Your Server ID:**
   - Go to your Discord server
   - Right-click on the server icon (left sidebar)
   - Click **"Copy Server ID"**
   - Save this ID

```env
DISCORD_GUILD_ID="paste_your_server_id_here"
```

3. **Get Your Server Invite Link:**
   - Right-click on your server icon
   - Click **"Invite People"**
   - Click **"Edit invite link"** at the bottom
   - Set it to **"Never expire"** (or your preferred duration)
   - Copy the invite link

```env
DISCORD_INVITE_URL="https://discord.gg/your-invite-code"
```

4. **Enable Server Membership Verification:**
   - In your `.env` file, set:

```env
DISCORD_REQUIRE_SERVER_MEMBERSHIP="true"
DISCORD_GUILD_ID="your_actual_server_id"
DISCORD_INVITE_URL="https://discord.gg/your_actual_invite"
```

**How it works:**

- When enabled, users MUST be members of your Discord server to log in
- Non-members will see an error message with your invite link
- This ensures only your community members can access the platform

**To disable this feature:**

- Set `DISCORD_REQUIRE_SERVER_MEMBERSHIP="false"` or remove the line entirely

### Step 11: Invite Your Bot to Your Discord Server (Optional)

If you want the bot to send notifications to your Discord server:

1. Go back to **"OAuth2"** → **"URL Generator"**
2. Under **"SCOPES"**, select:
   - ✅ `bot`
3. Under **"BOT PERMISSIONS"**, select:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
4. Copy the generated URL at the bottom
5. Paste it in your browser
6. Select your Discord server
7. Click **"Authorize"**

---

## Complete `.env` Example

Here's what your complete `.env` should look like:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streaming_backend"
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Discord OAuth Configuration
DISCORD_CLIENT_ID="your_discord_client_id_here"
DISCORD_CLIENT_SECRET="your_discord_client_secret_here"
DISCORD_REDIRECT_URI="http://localhost:3001/api/auth/discord/callback"

# Discord Server Membership Verification (Optional)
DISCORD_REQUIRE_SERVER_MEMBERSHIP="true"
DISCORD_GUILD_ID="your_discord_server_id_here"
DISCORD_INVITE_URL="https://discord.gg/your-invite"

# Kick API Configuration
KICK_API_BASE_URL="https://kick.com/api/v2"
KICK_CLIENT_ID="your-kick-client-id"
KICK_CLIENT_SECRET="your-kick-client-secret"
KICK_CHANNEL_NAME="mattyspins"

# Server Configuration
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Points Configuration
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5

# Admin Configuration
ADMIN_DISCORD_IDS="123456789012345678,987654321098765432"

# Logging
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="your-session-secret-change-this-in-production"

# External Services
WEBHOOK_SECRET="your-webhook-secret"
```

---

## Testing Discord OAuth

Once you've set up everything:

1. **Start your backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Test the OAuth flow:**
   - Go to: `http://localhost:3001/api/auth/discord/initiate`
   - You should get a JSON response with an `authUrl`
   - Copy that URL and paste it in your browser
   - You'll be redirected to Discord to authorize
   - After authorizing, you'll be redirected back to your callback URL
   - You should receive a JWT token

3. **Or test from your frontend:**
   - Your frontend should have a "Login with Discord" button
   - It should call the `/api/auth/discord/initiate` endpoint
   - Then redirect the user to the `authUrl`
   - Handle the callback with the tokens

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit your `.env` file to Git!**
   - It's already in `.gitignore`
   - Never share your Client Secret or Bot Token publicly

2. **Use different secrets for production:**
   - Generate new, strong secrets for production
   - Use environment variables on your hosting platform

3. **Keep your Bot Token secure:**
   - If compromised, reset it immediately in Discord Developer Portal
   - Never log it or expose it in error messages

4. **Rotate secrets regularly:**
   - Change your JWT secrets periodically
   - Reset Discord secrets if you suspect compromise

---

## Troubleshooting

### "Invalid OAuth2 redirect_uri"

- Make sure the redirect URI in `.env` exactly matches what you added in Discord Developer Portal
- Check for typos, extra spaces, or wrong protocol (http vs https)

### "Invalid client_id"

- Double-check you copied the Application ID correctly
- Make sure there are no extra spaces

### "Invalid client_secret"

- The secret might have been reset - generate a new one
- Make sure you copied the entire secret

### "Bot token is invalid"

- Reset the bot token in Discord Developer Portal
- Copy the new token immediately

### "Unauthorized" errors

- Make sure your bot has the correct permissions
- Check that intents are enabled if needed

---

## Quick Reference

**Discord Developer Portal:** https://discord.com/developers/applications

**What you need:**

1. ✅ Application ID (Client ID)
2. ✅ Client Secret
3. ✅ Bot Token
4. ✅ Redirect URI configured

**Where to use them:**

- All go in your `backend/.env` file
- Never commit them to Git
- Keep them secure

---

## Next Steps

After setting up Discord OAuth:

1. ✅ Update `.env` with Discord credentials
2. ✅ Restart your backend server
3. ✅ Test the OAuth flow
4. ✅ Create your first user by logging in
5. ✅ Make yourself admin in the database
6. ✅ Start using the platform!

---

Need help? Check the Discord Developer Documentation: https://discord.com/developers/docs/topics/oauth2
