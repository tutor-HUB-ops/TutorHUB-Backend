# Configuration Documentation

## Overview
Configuration files contain settings and environment variables for the application. They manage database connections, external service integrations, and application settings.

## Files

### db.js
Database configuration and connection setup.

#### Functions:
- `connectDB()`
  - Input: None
  - Logic:
    - Loads environment variables
    - Establishes MongoDB connection
    - Sets up connection pool
  - Returns:
    - Promise: Connection status

- `disconnectDB()`
  - Input: None
  - Logic:
    - Closes database connection
    - Cleans up resources
  - Returns:
    - Promise: Disconnection status

- `getConnection()`
  - Input: None
  - Logic:
    - Returns active connection
    - Checks connection health
  - Returns:
    - Object: Database connection

#### Configuration:
- Database URL: MongoDB connection string
- Connection options:
  - Pool size: Maximum connections
  - Timeout: Connection timeout
  - Retry attempts: Reconnection tries
  - SSL: Secure connection settings

### google_Oauth.js
Google OAuth configuration and setup.

#### Functions:
- `initializeGoogleAuth()`
  - Input: None
  - Logic:
    - Loads OAuth credentials
    - Configures OAuth client
    - Sets up redirect URIs
  - Returns:
    - Object: OAuth client

- `getAuthUrl()`
  - Input: None
  - Logic:
    - Generates authorization URL
    - Sets required scopes
    - Configures state parameter
  - Returns:
    - String: Authorization URL

- `handleCallback(code)`
  - Input:
    - `code`: Authorization code
  - Logic:
    - Exchanges code for tokens
    - Validates tokens
    - Stores refresh token
  - Returns:
    - Object: User profile and tokens

- `getUserProfile(accessToken)`
  - Input:
    - `accessToken`: OAuth access token
  - Logic:
    - Fetches user profile
    - Validates token
    - Formats user data
  - Returns:
    - Object: User profile

#### Configuration:
- Client ID: Google OAuth client identifier
- Client Secret: OAuth client secret
- Redirect URI: OAuth callback URL
- Scopes:
  - profile: Basic profile info
  - email: Email access
  - calendar: Calendar access
- Token settings:
  - Access token expiry
  - Refresh token storage
  - Token validation 