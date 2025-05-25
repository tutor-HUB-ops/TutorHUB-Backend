# Controllers Documentation

## Overview
Controllers handle the business logic of the application. They process requests, interact with models, and send responses back to the client.

## Files

### authController.js
Handles authentication-related operations.

#### Functions:
- `register(req, res)`
  - Input:
    - `req.body`: { email, password, firstName, lastName, role }
  - Logic:
    - Validates input data
    - Checks for existing user
    - Hashes password
    - Creates user record
    - Sends verification email
  - Returns:
    - 201: User created successfully
    - 400: Invalid input
    - 409: User already exists

- `login(req, res)`
  - Input:
    - `req.body`: { email, password }
  - Logic:
    - Validates credentials
    - Generates JWT tokens
    - Updates last login
  - Returns:
    - 200: { accessToken, refreshToken, user }
    - 401: Invalid credentials

- `verifyEmail(req, res)`
  - Input:
    - `req.params`: { token }
  - Logic:
    - Validates verification token
    - Updates user verification status
  - Returns:
    - 200: Email verified
    - 400: Invalid token

- `forgotPassword(req, res)`
  - Input:
    - `req.body`: { email }
  - Logic:
    - Generates reset token
    - Sends reset email
  - Returns:
    - 200: Reset email sent
    - 404: User not found

- `resetPassword(req, res)`
  - Input:
    - `req.body`: { token, newPassword }
  - Logic:
    - Validates reset token
    - Updates password
  - Returns:
    - 200: Password reset
    - 400: Invalid token

- `refreshToken(req, res)`
  - Input:
    - `req.body`: { refreshToken }
  - Logic:
    - Validates refresh token
    - Generates new access token
  - Returns:
    - 200: { accessToken }
    - 401: Invalid token

- `logout(req, res)`
  - Input:
    - `req.headers`: { authorization }
  - Logic:
    - Blacklists current token
    - Clears refresh token
  - Returns:
    - 200: Logged out successfully

### teacherController.js
Manages teacher-related operations.

#### Functions:
- `createProfile(req, res)`
  - Input:
    - `req.body`: { specialization, experience, qualifications, availability }
  - Logic:
    - Validates teacher data
    - Creates teacher profile
    - Links to user account
  - Returns:
    - 201: Profile created
    - 400: Invalid data

- `updateProfile(req, res)`
  - Input:
    - `req.body`: { specialization, experience, qualifications, availability }
  - Logic:
    - Updates teacher profile
    - Validates changes
  - Returns:
    - 200: Profile updated
    - 400: Invalid data

- `getProfile(req, res)`
  - Input:
    - `req.params`: { teacherId }
  - Logic:
    - Retrieves teacher profile
    - Includes ratings and reviews
  - Returns:
    - 200: Teacher profile
    - 404: Profile not found

- `getAllTeachers(req, res)`
  - Input:
    - `req.query`: { subject, availability, rating }
  - Logic:
    - Filters teachers by criteria
    - Paginates results
  - Returns:
    - 200: List of teachers
    - 400: Invalid filters

- `updateAvailability(req, res)`
  - Input:
    - `req.body`: { availability }
  - Logic:
    - Updates teaching schedule
    - Checks for booking conflicts
  - Returns:
    - 200: Availability updated
    - 400: Invalid schedule

- `getBookings(req, res)`
  - Input:
    - `req.query`: { status, date }
  - Logic:
    - Retrieves teacher's bookings
    - Filters by status/date
  - Returns:
    - 200: List of bookings
    - 400: Invalid filters

- `acceptBooking(req, res)`
  - Input:
    - `req.params`: { bookingId }
  - Logic:
    - Updates booking status
    - Sends notifications
  - Returns:
    - 200: Booking accepted
    - 400: Invalid booking

- `rejectBooking(req, res)`
  - Input:
    - `req.params`: { bookingId }
    - `req.body`: { reason }
  - Logic:
    - Updates booking status
    - Sends notifications
  - Returns:
    - 200: Booking rejected
    - 400: Invalid booking

### studentController.js
Manages student-related operations.

#### Functions:
- `createProfile(req, res)`
  - Input:
    - `req.body`: { grade, subjects }
  - Logic:
    - Validates student data
    - Creates student profile
  - Returns:
    - 201: Profile created
    - 400: Invalid data

- `updateProfile(req, res)`
  - Input:
    - `req.body`: { grade, subjects }
  - Logic:
    - Updates student profile
    - Validates changes
  - Returns:
    - 200: Profile updated
    - 400: Invalid data

- `getProfile(req, res)`
  - Input:
    - `req.params`: { studentId }
  - Logic:
    - Retrieves student profile
    - Includes booking history
  - Returns:
    - 200: Student profile
    - 404: Profile not found

- `getAllStudents(req, res)`
  - Input:
    - `req.query`: { grade, subject }
  - Logic:
    - Filters students by criteria
    - Paginates results
  - Returns:
    - 200: List of students
    - 400: Invalid filters

- `createBooking(req, res)`
  - Input:
    - `req.body`: { teacherId, subject, date, time }
  - Logic:
    - Validates availability
    - Creates booking
    - Sends notifications
  - Returns:
    - 201: Booking created
    - 400: Invalid booking

- `getBookings(req, res)`
  - Input:
    - `req.query`: { status, date }
  - Logic:
    - Retrieves student's bookings
    - Filters by status/date
  - Returns:
    - 200: List of bookings
    - 400: Invalid filters

- `cancelBooking(req, res)`
  - Input:
    - `req.params`: { bookingId }
    - `req.body`: { reason }
  - Logic:
    - Updates booking status
    - Sends notifications
  - Returns:
    - 200: Booking cancelled
    - 400: Invalid booking

### adminController.js
Handles administrative operations.

#### Functions:
- `getDashboardStats(req, res)`
  - Input:
    - `req.query`: { period }
  - Logic:
    - Aggregates system statistics
    - Calculates metrics
  - Returns:
    - 200: Dashboard statistics
    - 400: Invalid period

- `manageUsers(req, res)`
  - Input:
    - `req.query`: { role, status }
  - Logic:
    - Retrieves user list
    - Applies filters
  - Returns:
    - 200: List of users
    - 400: Invalid filters

- `manageTeachers(req, res)`
  - Input:
    - `req.query`: { status, rating }
  - Logic:
    - Retrieves teacher list
    - Applies filters
  - Returns:
    - 200: List of teachers
    - 400: Invalid filters

- `manageStudents(req, res)`
  - Input:
    - `req.query`: { status, grade }
  - Logic:
    - Retrieves student list
    - Applies filters
  - Returns:
    - 200: List of students
    - 400: Invalid filters

- `handleReports(req, res)`
  - Input:
    - `req.query`: { type, status }
  - Logic:
    - Retrieves reports
    - Applies filters
  - Returns:
    - 200: List of reports
    - 400: Invalid filters

- `systemSettings(req, res)`
  - Input:
    - `req.body`: { settings }
  - Logic:
    - Updates system settings
    - Validates changes
  - Returns:
    - 200: Settings updated
    - 400: Invalid settings 