# Middlewares Documentation

## Overview
Middlewares are functions that have access to the request and response objects, and the next middleware function in the application's request-response cycle.

## Files

### authMiddleware.js
Authentication middleware functions.

#### Functions:
- `authenticateToken(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Extracts token from header
    - Verifies token validity
    - Attaches user to request
  - Returns:
    - Calls next() if authenticated
    - 401 if invalid token

- `authenticateRefreshToken(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Extracts refresh token
    - Verifies refresh token
    - Attaches user to request
  - Returns:
    - Calls next() if valid
    - 401 if invalid token

- `checkTokenBlacklist(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks if token is blacklisted
    - Verifies token status
  - Returns:
    - Calls next() if not blacklisted
    - 401 if blacklisted

- `validateTokenExpiry(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks token expiration
    - Validates token time
  - Returns:
    - Calls next() if valid
    - 401 if expired

### roleMiddleware.js
Role-based access control middleware.

#### Functions:
- `isAdmin(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks user role
    - Verifies admin status
  - Returns:
    - Calls next() if admin
    - 403 if not admin

- `isTeacher(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks user role
    - Verifies teacher status
  - Returns:
    - Calls next() if teacher
    - 403 if not teacher

- `isStudent(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks user role
    - Verifies student status
  - Returns:
    - Calls next() if student
    - 403 if not student

- `hasPermission(permission)`
  - Arguments:
    - `permission`: Required permission
  - Logic:
    - Checks user permissions
    - Verifies access rights
  - Returns:
    - Middleware function
    - 403 if unauthorized

### errorMiddleware.js
Error handling middleware.

#### Functions:
- `errorHandler(err, req, res, next)`
  - Arguments:
    - `err`: Error object
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Logs error details
    - Formats error response
  - Returns:
    - Error response with status

- `notFound(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Creates 404 error
    - Passes to error handler
  - Returns:
    - 404 response

- `validationError(err, req, res, next)`
  - Arguments:
    - `err`: Validation error
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Formats validation errors
    - Creates error response
  - Returns:
    - 400 response with errors

- `asyncHandler(fn)`
  - Arguments:
    - `fn`: Async function to wrap
  - Logic:
    - Wraps async function
    - Catches errors
  - Returns:
    - Middleware function

### uploadMiddleware.js
File upload middleware.

#### Functions:
- `uploadFile(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Configures multer
    - Handles file upload
  - Returns:
    - Calls next() if successful
    - 400 if upload fails

- `validateFileType(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks file type
    - Validates mime type
  - Returns:
    - Calls next() if valid
    - 400 if invalid type

- `validateFileSize(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Checks file size
    - Validates limits
  - Returns:
    - Calls next() if valid
    - 400 if too large

- `processUpload(req, res, next)`
  - Arguments:
    - `req`: Request object
    - `res`: Response object
    - `next`: Next middleware function
  - Logic:
    - Processes uploaded file
    - Generates file URL
  - Returns:
    - Calls next() if successful
    - 400 if processing fails 