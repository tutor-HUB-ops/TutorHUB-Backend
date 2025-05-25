# Services Documentation

## Overview
Services contain reusable business logic and external service integrations. They provide functionality that can be used across different parts of the application.

## Files

### tokenService.js
Handles JWT token operations.

#### Functions:
- `generateAccessToken(userId, role)`
  - Input:
    - `userId`: User's unique identifier
    - `role`: User's role (admin/teacher/student)
  - Logic:
    - Creates JWT payload
    - Signs with secret key
    - Sets expiration time
  - Returns:
    - String: JWT access token

- `generateRefreshToken(userId)`
  - Input:
    - `userId`: User's unique identifier
  - Logic:
    - Creates refresh token payload
    - Signs with refresh secret
    - Sets longer expiration
  - Returns:
    - String: JWT refresh token

- `verifyToken(token)`
  - Input:
    - `token`: JWT token to verify
  - Logic:
    - Verifies token signature
    - Checks expiration
    - Validates payload
  - Returns:
    - Object: Decoded token payload
    - Error: If invalid

- `decodeToken(token)`
  - Input:
    - `token`: JWT token to decode
  - Logic:
    - Decodes token without verification
  - Returns:
    - Object: Token payload

- `blacklistToken(token)`
  - Input:
    - `token`: Token to blacklist
  - Logic:
    - Stores token in Redis
    - Sets expiration
  - Returns:
    - Boolean: Success status

- `isTokenBlacklisted(token)`
  - Input:
    - `token`: Token to check
  - Logic:
    - Checks Redis for token
  - Returns:
    - Boolean: True if blacklisted

### emailService.js
Handles email sending operations.

#### Functions:
- `sendVerificationEmail(email, token)`
  - Input:
    - `email`: Recipient email
    - `token`: Verification token
  - Logic:
    - Generates email template
    - Sends via SMTP
  - Returns:
    - Promise: Email send status

- `sendPasswordResetEmail(email, token)`
  - Input:
    - `email`: Recipient email
    - `token`: Reset token
  - Logic:
    - Generates reset template
    - Sends via SMTP
  - Returns:
    - Promise: Email send status

- `sendBookingConfirmation(booking)`
  - Input:
    - `booking`: Booking object
  - Logic:
    - Generates confirmation template
    - Sends to both parties
  - Returns:
    - Promise: Email send status

- `sendBookingReminder(booking)`
  - Input:
    - `booking`: Booking object
  - Logic:
    - Generates reminder template
    - Sends to both parties
  - Returns:
    - Promise: Email send status

### calandarService.js
Manages calendar and scheduling operations.

#### Functions:
- `createEvent(eventData)`
  - Input:
    - `eventData`: { title, start, end, attendees }
  - Logic:
    - Validates time slot
    - Creates calendar event
    - Sends invites
  - Returns:
    - Object: Created event

- `updateEvent(eventId, updates)`
  - Input:
    - `eventId`: Event identifier
    - `updates`: Event changes
  - Logic:
    - Validates changes
    - Updates event
    - Notifies attendees
  - Returns:
    - Object: Updated event

- `deleteEvent(eventId)`
  - Input:
    - `eventId`: Event identifier
  - Logic:
    - Removes event
    - Notifies attendees
  - Returns:
    - Boolean: Success status

- `getEvents(filters)`
  - Input:
    - `filters`: { start, end, attendees }
  - Logic:
    - Queries calendar
    - Applies filters
  - Returns:
    - Array: List of events

- `checkAvailability(timeSlot)`
  - Input:
    - `timeSlot`: { start, end, attendees }
  - Logic:
    - Checks conflicts
    - Validates duration
  - Returns:
    - Boolean: Availability status

- `generateSchedule(requirements)`
  - Input:
    - `requirements`: { duration, frequency, attendees }
  - Logic:
    - Finds available slots
    - Creates recurring events
  - Returns:
    - Array: Schedule of events

### redisClient.js
Manages Redis cache operations.

#### Functions:
- `setCache(key, value, expiry)`
  - Input:
    - `key`: Cache key
    - `value`: Data to cache
    - `expiry`: TTL in seconds
  - Logic:
    - Serializes value
    - Stores in Redis
  - Returns:
    - Boolean: Success status

- `getCache(key)`
  - Input:
    - `key`: Cache key
  - Logic:
    - Retrieves from Redis
    - Deserializes value
  - Returns:
    - Any: Cached value

- `deleteCache(key)`
  - Input:
    - `key`: Cache key
  - Logic:
    - Removes from Redis
  - Returns:
    - Boolean: Success status

- `clearCache()`
  - Input: None
  - Logic:
    - Flushes Redis database
  - Returns:
    - Boolean: Success status 