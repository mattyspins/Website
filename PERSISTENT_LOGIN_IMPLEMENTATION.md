# Persistent Login Implementation

## Problem

Users were being logged out every time they closed and reopened their browser window because authentication tokens were stored in `localStorage` without proper persistence and automatic refresh mechanisms.

## Solution

Implemented a comprehensive authentication persistence system that:

1. **Stores tokens with expiry tracking**
2. **Automatically refreshes tokens before they expire**
3. **Restores user sessions on browser restart**
4. **Handles token validation and refresh failures gracefully**

## Changes Made

### 1. New Authentication Persistence Module

**File:** `frontend/lib/authPersistence.ts`

This module provides:

- `storeAuthData()` - Stores access token, refresh token, user info, and expiry time
- `getAccessToken()` - Retrieves stored access token
- `getRefreshToken()` - Retrieves stored refresh token
- `getStoredUser()` - Retrieves stored user information
- `isTokenExpired()` - Checks if token needs refresh
- `refreshAccessToken()` - Automatically refreshes expired tokens
- `initializeAuth()` - Restores authentication on app load
- `clearAuthData()` - Clears all authentication data on logout
- `updateStoredUser()` - Updates user info (e.g., after points change)
- `isAuthenticated()` - Quick check if user is logged in

**Key Features:**

- Automatic token refresh 5 minutes before expiry
- Background timer that refreshes tokens automatically
- Token validation with backend on app initialization
- Graceful handling of refresh failures

### 2. Updated AuthButtons Component

**File:** `frontend/components/AuthButtons.tsx`

Changes:

- Imports the new `authPersistence` module
- Uses `initializeAuth()` on component mount to restore sessions
- Uses `clearAuthData()` on logout to properly clean up
- Uses `updateStoredUser()` to keep user info in sync

### 3. Updated Auth Callback Page

**File:** `frontend/app/auth/callback/page.tsx`

Changes:

- Imports the new `authPersistence` module
- Uses `storeAuthData()` to properly store tokens with expiry tracking
- Automatically starts token refresh timer after successful login

## How It Works

### Login Flow

1. User clicks "Login with Discord"
2. Backend redirects to callback with tokens
3. Frontend stores tokens using `storeAuthData()`
4. Expiry time is calculated and stored
5. Automatic refresh timer is scheduled

### Session Restoration (Browser Restart)

1. User opens browser and visits website
2. `AuthButtons` component mounts
3. `initializeAuth()` is called
4. Checks if tokens exist in localStorage
5. If tokens are expired or about to expire:
   - Automatically calls refresh endpoint
   - Updates tokens and reschedules refresh
6. If tokens are valid:
   - Verifies with backend
   - Restores user session
   - Schedules next refresh

### Automatic Token Refresh

1. Timer runs in background
2. Refreshes token 5 minutes before expiry
3. Updates stored tokens
4. Reschedules next refresh
5. If refresh fails:
   - Clears auth data
   - User needs to login again

## Benefits

✅ **Persistent Sessions** - Users stay logged in across browser restarts
✅ **Automatic Refresh** - Tokens refresh automatically before expiry
✅ **Seamless Experience** - No interruption to user workflow
✅ **Secure** - Tokens are validated and refreshed properly
✅ **Graceful Degradation** - Handles failures without breaking the app

## Testing

To test the persistent login:

1. **Login Test:**

   ```
   - Login with Discord
   - Close browser completely
   - Reopen browser and visit website
   - Should be automatically logged in
   ```

2. **Token Refresh Test:**

   ```
   - Login with Discord
   - Wait for token to approach expiry (check console logs)
   - Token should refresh automatically
   - User remains logged in
   ```

3. **Logout Test:**
   ```
   - Login with Discord
   - Click logout
   - All tokens should be cleared
   - Reopening browser should require login
   ```

## Configuration

The system uses these default values:

- **Token Expiry:** 1 hour (3600 seconds)
- **Refresh Buffer:** 5 minutes before expiry
- **Minimum Refresh Time:** 1 minute

These can be adjusted in `frontend/lib/authPersistence.ts` if needed.

## Backend Requirements

The backend must support:

- ✅ Refresh token endpoint (`/api/auth/refresh`)
- ✅ Token validation endpoint (`/api/auth/me`)
- ✅ Proper token expiry times in responses

All requirements are already met by the current backend implementation.

## Browser Compatibility

Works in all modern browsers that support:

- localStorage
- fetch API
- setTimeout/clearTimeout

## Security Considerations

- Tokens are stored in localStorage (not cookies) to avoid CSRF
- Refresh tokens are used to obtain new access tokens
- Tokens are validated with backend on app load
- Failed refresh attempts clear all auth data
- Automatic logout on token validation failure

## Future Enhancements

Potential improvements:

- Add "Remember Me" checkbox for optional persistence
- Implement sliding session expiry
- Add session activity tracking
- Support multiple concurrent sessions
- Add biometric authentication support
