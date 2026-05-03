# Requirements Document

## Introduction

This document specifies the requirements for implementing Kick OAuth integration and a Manual Leaderboard system for the streaming backend platform. The system already has Discord OAuth authentication, a points system, and various user engagement features. These new features will add Kick platform integration for channel points and a separate manual leaderboard system for tracking gambling wagers.

## Glossary

- **System**: The streaming backend platform (Express.js/TypeScript backend + Next.js frontend)
- **User**: A person who has authenticated with Discord and optionally with Kick
- **Admin**: A user with administrative privileges (Discord IDs: 1435983820968169482, 1419427173630214184)
- **Kick**: A streaming platform (kick.com) with OAuth and API capabilities
- **Discord**: A communication platform used for primary authentication
- **Kick_OAuth_Service**: The backend service handling Kick OAuth authentication flow
- **Kick_API_Client**: The backend service for fetching data from Kick's API
- **Channel_Points**: Points earned by users on the Kick platform for watching streams
- **Leaderboard**: A time-bound competition tracking user gambling wagers
- **Wager**: A gambling bet amount manually entered by an admin for a user
- **Prize_Pool**: The total monetary value available for distribution in a leaderboard
- **Leaderboard_Service**: The backend service managing leaderboard operations
- **Admin_Dashboard**: The web interface for administrative operations
- **User_Profile**: The web interface displaying user information and points
- **OAuth_Token**: Access and refresh tokens obtained from Kick OAuth flow
- **Background_Job**: A scheduled task that runs periodically without user interaction

## Requirements

### Requirement 1: Kick OAuth Authentication

**User Story:** As a user, I want to authenticate with my Kick account after Discord login, so that I can link my Kick channel points to my profile.

#### Acceptance Criteria

1. WHEN a user clicks the "Login with Kick" button, THE System SHALL redirect the user to Kick's OAuth authorization page
2. WHEN Kick OAuth authorization succeeds, THE System SHALL receive an authorization code from Kick
3. WHEN the System receives an authorization code, THE Kick_OAuth_Service SHALL exchange it for access and refresh tokens
4. WHEN OAuth tokens are obtained, THE System SHALL store the Kick user ID, username, access token, refresh token, and token expiration timestamp in the database
5. WHEN storing OAuth tokens, THE System SHALL encrypt the access token and refresh token before database storage
6. WHEN a Kick account is linked, THE System SHALL display the Kick username on the User_Profile
7. IF a Kick username is already linked to another user account, THEN THE System SHALL return an error message indicating the Kick account is already in use

### Requirement 2: Kick Token Management

**User Story:** As a user, I want my Kick authentication to remain valid, so that I don't have to re-authenticate frequently.

#### Acceptance Criteria

1. WHEN a Kick access token expires, THE Kick_OAuth_Service SHALL use the refresh token to obtain a new access token
2. WHEN a refresh token request succeeds, THE System SHALL update the stored access token and expiration timestamp
3. IF a refresh token request fails, THEN THE System SHALL mark the Kick authentication as invalid and prompt the user to re-authenticate
4. WHEN a user logs out, THE System SHALL delete all stored Kick OAuth tokens for that user

### Requirement 3: Kick Channel Points Fetching

**User Story:** As a user, I want my Kick channel points to be fetched from Kick, so that I can use them for store purchases, raffles, and predictions.

#### Acceptance Criteria

1. WHEN a user successfully links their Kick account, THE Kick_API_Client SHALL fetch the user's channel points from the Kick API
2. WHEN channel points are fetched, THE System SHALL store the channel points value in the user's profile
3. IF the Kick API request fails, THEN THE System SHALL log the error and retry after 5 minutes
4. WHEN channel points are displayed on the User_Profile, THE System SHALL show both the local points balance and the Kick channel points balance separately

### Requirement 4: Kick Channel Points Synchronization

**User Story:** As a user, I want my Kick channel points to be synchronized periodically, so that my balance stays up-to-date.

#### Acceptance Criteria

1. THE Background_Job SHALL run every 5 minutes to synchronize Kick channel points for all users with linked Kick accounts
2. WHEN the Background_Job runs, THE Kick_API_Client SHALL fetch updated channel points for each user from the Kick API
3. WHEN updated channel points are fetched, THE System SHALL update the stored channel points value in the database
4. IF a user's Kick access token is expired, THEN THE Background_Job SHALL attempt to refresh the token before fetching channel points
5. IF token refresh fails for a user, THEN THE Background_Job SHALL skip that user and continue with the next user

### Requirement 5: Kick Channel Points Usage

**User Story:** As a user, I want to use my Kick channel points for store purchases, raffles, and bonus hunt predictions, so that I can participate in platform activities.

#### Acceptance Criteria

1. WHEN a user makes a store purchase, THE System SHALL allow the user to choose between local points and Kick channel points as payment
2. WHEN a user purchases raffle tickets, THE System SHALL allow the user to choose between local points and Kick channel points as payment
3. WHEN a user makes a bonus hunt prediction, THE System SHALL allow the user to choose between local points and Kick channel points as payment
4. WHEN Kick channel points are used for a transaction, THE System SHALL deduct the amount from the user's Kick channel points balance
5. IF a user has insufficient Kick channel points for a transaction, THEN THE System SHALL return an error message indicating insufficient balance

### Requirement 6: Admin Leaderboard Creation

**User Story:** As an admin, I want to create leaderboards with custom prizes and time limits, so that I can run gambling wager competitions.

#### Acceptance Criteria

1. WHEN an admin accesses the Admin_Dashboard, THE System SHALL display a leaderboard management interface
2. WHEN an admin creates a leaderboard, THE System SHALL require a title, description, prize pool amount, start date, and end date
3. WHEN a leaderboard is created, THE System SHALL store the leaderboard with status "active" in the database
4. WHEN an admin creates a leaderboard, THE System SHALL allow the admin to define prize distribution for top N positions
5. WHEN prize distribution is defined, THE System SHALL store each position's prize amount and optional description
6. THE System SHALL validate that the start date is before the end date when creating a leaderboard
7. IF validation fails, THEN THE System SHALL return an error message describing the validation failure

### Requirement 7: Admin Wager Entry

**User Story:** As an admin, I want to manually enter wager amounts for users, so that I can track their gambling activity in leaderboards.

#### Acceptance Criteria

1. WHEN an admin views an active leaderboard, THE System SHALL display a form to enter wagers for users
2. WHEN an admin enters a wager, THE System SHALL require a user selection, wager amount, and optional notes
3. WHEN a wager is submitted, THE Leaderboard_Service SHALL store the wager with the admin's ID as the verifier
4. WHEN a wager is stored, THE System SHALL record the submission timestamp and verification timestamp
5. WHEN multiple wagers exist for the same user in the same leaderboard, THE System SHALL sum all wager amounts for ranking calculation
6. THE System SHALL validate that the wager amount is a positive number greater than zero
7. IF the wager amount is invalid, THEN THE System SHALL return an error message

### Requirement 8: Leaderboard Rankings Display

**User Story:** As a user, I want to view leaderboard rankings, so that I can see my position and other participants.

#### Acceptance Criteria

1. WHEN a user views a leaderboard, THE System SHALL display all participants ranked by total wager amount in descending order
2. WHEN rankings are displayed, THE System SHALL show each participant's username, total wager amount, and rank position
3. WHEN a user is logged in, THE System SHALL highlight the user's own entry in the leaderboard
4. WHEN prize distribution is defined, THE System SHALL display the prize amount next to each winning position
5. THE System SHALL update rankings in real-time when new wagers are entered
6. WHEN a leaderboard has no wagers, THE System SHALL display a message indicating no participants yet

### Requirement 9: Leaderboard Countdown Timer

**User Story:** As a user, I want to see a countdown timer on leaderboards, so that I know how much time remains.

#### Acceptance Criteria

1. WHEN a user views an active leaderboard, THE System SHALL display a countdown timer showing time remaining until the end date
2. THE System SHALL update the countdown timer every second
3. WHEN the countdown reaches zero, THE System SHALL display "Ended" instead of the countdown timer
4. THE System SHALL format the countdown as "X days Y hours Z minutes W seconds" when more than 1 day remains
5. THE System SHALL format the countdown as "X hours Y minutes Z seconds" when less than 1 day remains
6. THE System SHALL format the countdown as "X minutes Y seconds" when less than 1 hour remains

### Requirement 10: Leaderboard Auto-Expiration

**User Story:** As an admin, I want leaderboards to automatically expire when the end date is reached, so that I don't have to manually close them.

#### Acceptance Criteria

1. THE Background_Job SHALL check for expired leaderboards every 1 minute
2. WHEN the current time exceeds a leaderboard's end date, THE Leaderboard_Service SHALL update the leaderboard status to "ended"
3. WHEN a leaderboard status changes to "ended", THE System SHALL prevent new wagers from being entered
4. WHEN a user views an ended leaderboard, THE System SHALL display final rankings with a clear "Ended" indicator
5. WHEN an admin views an ended leaderboard, THE System SHALL allow the admin to view final results but not modify wagers

### Requirement 11: Enhanced Admin User Search

**User Story:** As an admin, I want to search for users by Discord username or Kick username, so that I can quickly find users for wager entry.

#### Acceptance Criteria

1. WHEN an admin enters a search query in the Admin_Dashboard, THE System SHALL search for users matching the query in both Discord display names and Kick usernames
2. THE System SHALL perform case-insensitive matching for search queries
3. WHEN search results are returned, THE System SHALL display the user's Discord username, Kick username (if linked), and points balance
4. WHEN a search query matches multiple users, THE System SHALL return all matching users sorted alphabetically by Discord username
5. WHEN a search query matches no users, THE System SHALL display a message indicating no results found

### Requirement 12: Leaderboard and Channel Points Separation

**User Story:** As a user, I want to understand that leaderboard wagers and Kick channel points are separate systems, so that I don't confuse them.

#### Acceptance Criteria

1. WHEN displaying Kick channel points on the User_Profile, THE System SHALL label them as "Kick Channel Points" with a distinct visual indicator
2. WHEN displaying leaderboard wagers, THE System SHALL label them as "Wager Amount" or "Total Wagered" with a distinct visual indicator
3. THE System SHALL NOT allow users to convert between Kick channel points and leaderboard wagers
4. WHEN a user views a leaderboard, THE System SHALL display a help text explaining that wagers are manually entered by admins based on actual gambling activity
5. WHEN a user views their profile, THE System SHALL display Kick channel points and local points in separate sections with clear labels

### Requirement 13: Kick OAuth Callback Handling

**User Story:** As a user, I want to be redirected back to the application after Kick authorization, so that I can continue using the platform.

#### Acceptance Criteria

1. WHEN Kick redirects the user back to the callback URL, THE System SHALL extract the authorization code from the query parameters
2. WHEN the authorization code is extracted, THE Kick_OAuth_Service SHALL exchange it for OAuth tokens
3. WHEN OAuth tokens are obtained, THE System SHALL redirect the user to their profile page with a success message
4. IF the authorization code is missing or invalid, THEN THE System SHALL redirect the user to the home page with an error message
5. IF the Kick OAuth flow is cancelled by the user, THEN THE System SHALL redirect the user to the home page with an informational message

### Requirement 14: Kick API Error Handling

**User Story:** As a developer, I want robust error handling for Kick API requests, so that temporary failures don't break the user experience.

#### Acceptance Criteria

1. WHEN a Kick API request fails with a network error, THE Kick_API_Client SHALL retry the request up to 3 times with exponential backoff
2. WHEN a Kick API request fails with a 401 Unauthorized error, THE Kick_OAuth_Service SHALL attempt to refresh the access token once
3. IF token refresh succeeds, THEN THE Kick_API_Client SHALL retry the original request with the new access token
4. IF token refresh fails, THEN THE System SHALL mark the Kick authentication as invalid and log the error
5. WHEN a Kick API request fails with a 429 Rate Limit error, THE Kick_API_Client SHALL wait for the retry-after duration before retrying
6. WHEN a Kick API request fails with a 500 Server Error, THE Kick_API_Client SHALL log the error and return a user-friendly error message
7. THE System SHALL log all Kick API errors with sufficient detail for debugging

### Requirement 15: Security and Data Protection

**User Story:** As a user, I want my Kick OAuth tokens to be stored securely, so that my account cannot be compromised.

#### Acceptance Criteria

1. WHEN storing Kick OAuth tokens, THE System SHALL encrypt the access token and refresh token using AES-256 encryption
2. THE System SHALL store the encryption key in environment variables separate from the database
3. WHEN retrieving Kick OAuth tokens, THE System SHALL decrypt the tokens before use
4. THE System SHALL NOT expose Kick OAuth tokens in API responses or logs
5. WHEN a user deletes their account, THE System SHALL delete all stored Kick OAuth tokens
6. THE System SHALL use HTTPS for all communication with the Kick OAuth and API endpoints
7. THE System SHALL validate the state parameter in the OAuth callback to prevent CSRF attacks

### Requirement 16: Kick Channel Points Integration

**User Story:** As a user, I want to use my Kick channel points for platform activities, so that I can participate using points I've earned on Kick.

#### Acceptance Criteria

1. WHEN a user has linked their Kick account, THE System SHALL display their Kick channel points balance on their profile
2. WHEN making store purchases, THE System SHALL allow users to select Kick channel points as a payment method
3. WHEN purchasing raffle tickets, THE System SHALL allow users to select Kick channel points as a payment method
4. WHEN making bonus hunt predictions, THE System SHALL allow users to select Kick channel points as a payment method
5. WHEN Kick channel points are used for a transaction, THE System SHALL deduct the amount from the user's Kick channel points balance
6. IF a user has insufficient Kick channel points for a transaction, THEN THE System SHALL display an error message and prevent the transaction
7. THE System SHALL NOT allow conversion between local points and Kick channel points

### Requirement 17: Leaderboard Prize Distribution Management

**User Story:** As an admin, I want to define and manage prize distributions for leaderboards, so that winners know what they can earn.

#### Acceptance Criteria

1. WHEN creating a leaderboard, THE Admin_Dashboard SHALL allow admins to define prizes for specific positions
2. WHEN defining prizes, THE System SHALL require a position number, prize amount, and optional prize description
3. WHEN displaying leaderboards, THE System SHALL show the prize amount next to each winning position
4. WHEN a leaderboard ends, THE System SHALL display the final winners with their corresponding prizes
5. THE System SHALL validate that prize positions are unique within a leaderboard
6. WHEN the total of individual prizes exceeds the prize pool, THE System SHALL display a warning to the admin
7. THE System SHALL allow admins to modify prize distributions for active leaderboards

### Requirement 18: Leaderboard Audit Trail

**User Story:** As an admin, I want to track all wager entries and modifications, so that I can maintain transparency and resolve disputes.

#### Acceptance Criteria

1. WHEN a wager is entered, THE System SHALL record the admin who entered it, timestamp, and original values
2. WHEN a wager is modified, THE System SHALL record the admin who modified it, timestamp, old values, and new values
3. WHEN a wager is deleted, THE System SHALL record the admin who deleted it, timestamp, and reason
4. WHEN viewing a leaderboard, THE System SHALL allow admins to view the audit trail for all wagers
5. THE System SHALL store audit trail entries in the audit_logs table with appropriate metadata
6. THE System SHALL display audit information including admin username, action type, and timestamp
7. THE System SHALL retain audit trail data for at least 1 year

### Requirement 19: Kick OAuth Token Refresh Automation

**User Story:** As a user, I want my Kick authentication to be maintained automatically, so that I don't experience service interruptions.

#### Acceptance Criteria

1. THE Background_Job SHALL check for expiring Kick access tokens every 30 minutes
2. WHEN an access token expires within 1 hour, THE Kick_OAuth_Service SHALL attempt to refresh it using the refresh token
3. WHEN token refresh succeeds, THE System SHALL update the stored access token and expiration timestamp
4. WHEN token refresh fails due to invalid refresh token, THE System SHALL mark the Kick authentication as expired
5. WHEN Kick authentication is marked as expired, THE System SHALL notify the user via in-app notification
6. THE System SHALL log all token refresh attempts with success/failure status
7. THE System SHALL NOT attempt to refresh tokens more than once per hour per user

### Requirement 20: Leaderboard Data Validation

**User Story:** As an admin, I want the system to validate leaderboard data, so that I can prevent errors and maintain data integrity.

#### Acceptance Criteria

1. WHEN entering a wager amount, THE System SHALL validate that it is a positive decimal number
2. WHEN creating a leaderboard, THE System SHALL validate that the end date is at least 1 hour after the start date
3. WHEN selecting a user for wager entry, THE System SHALL validate that the user exists and is not suspended
4. WHEN entering multiple wagers for the same user, THE System SHALL calculate and display the running total
5. THE System SHALL prevent wager entry for leaderboards with status "ended" or "cancelled"
6. WHEN a leaderboard prize pool is defined, THE System SHALL validate that it contains only valid currency formats
7. IF validation fails for any field, THEN THE System SHALL display specific error messages indicating what needs to be corrected

### Requirement 21: Kick Account Unlinking

**User Story:** As a user, I want to unlink my Kick account from my profile, so that I can disconnect the integration if needed.

#### Acceptance Criteria

1. WHEN a user views their profile, THE System SHALL display an "Unlink Kick Account" option if a Kick account is linked
2. WHEN a user clicks "Unlink Kick Account", THE System SHALL display a confirmation dialog explaining the consequences
3. WHEN unlinking is confirmed, THE System SHALL delete all stored Kick OAuth tokens for that user
4. WHEN unlinking is confirmed, THE System SHALL set the kickUsername, kickId, and token fields to null
5. WHEN unlinking is completed, THE System SHALL display a success message and update the profile display
6. WHEN a Kick account is unlinked, THE System SHALL retain any Kick channel points balance as read-only historical data
7. WHEN a Kick account is unlinked, THE System SHALL prevent further Kick channel points synchronization

### Requirement 22: Leaderboard Notification System

**User Story:** As a user, I want to receive notifications about leaderboard events, so that I stay informed about competitions I'm participating in.

#### Acceptance Criteria

1. WHEN a new leaderboard is created, THE System SHALL send notifications to all users about the new competition
2. WHEN a user's wager is entered by an admin, THE System SHALL send a notification to that user
3. WHEN a leaderboard is ending within 24 hours, THE System SHALL send reminder notifications to all participants
4. WHEN a leaderboard ends, THE System SHALL send notifications to winners with their prize information
5. WHEN a leaderboard ends, THE System SHALL send notifications to all participants with final rankings
6. THE System SHALL allow users to configure which leaderboard notifications they want to receive
7. THE System SHALL support both in-app and Discord notifications for leaderboard events

### Requirement 23: Kick API Rate Limit Handling

**User Story:** As a developer, I want robust rate limit handling for Kick API requests, so that the system remains stable under high load.

#### Acceptance Criteria

1. WHEN the Kick API returns a 429 Rate Limit error, THE Kick_API_Client SHALL parse the retry-after header
2. WHEN a rate limit is encountered, THE System SHALL wait for the specified retry-after duration before making new requests
3. WHEN rate limits are active, THE System SHALL queue pending requests and process them after the rate limit expires
4. THE System SHALL implement exponential backoff for repeated rate limit errors
5. WHEN rate limits persist for more than 10 minutes, THE System SHALL log a warning and continue with cached data
6. THE System SHALL track rate limit metrics and display them in admin monitoring dashboards
7. THE System SHALL prioritize critical requests (token refresh) over non-critical requests (channel points sync) during rate limits

### Requirement 24: Leaderboard Export and Reporting

**User Story:** As an admin, I want to export leaderboard data and generate reports, so that I can analyze competition results and share them with stakeholders.

#### Acceptance Criteria

1. WHEN viewing a leaderboard, THE Admin_Dashboard SHALL provide an "Export" button for admins
2. WHEN exporting leaderboard data, THE System SHALL generate a CSV file with all participant data, wagers, and rankings
3. WHEN exporting, THE System SHALL include metadata such as leaderboard title, dates, prize pool, and export timestamp
4. THE System SHALL allow admins to export data for active, ended, or all leaderboards
5. WHEN generating reports, THE System SHALL calculate statistics such as total participants, average wager, and participation trends
6. THE System SHALL provide downloadable PDF reports with formatted leaderboard results and winner information
7. THE System SHALL log all export activities in the audit trail with admin identification and timestamp
