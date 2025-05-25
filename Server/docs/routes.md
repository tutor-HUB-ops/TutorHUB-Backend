# Routes Documentation

## Overview
Routes define the API endpoints and their corresponding controller functions. They handle the routing of HTTP requests to the appropriate controllers.

## Files

### authRoutes.js
Authentication-related routes.

#### Endpoints:
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/verify-email` - Verify email address
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - User logout

### teacherRoutes.js
Teacher-related routes.

#### Endpoints:
- `POST /teachers/profile` - Create teacher profile
- `PUT /teachers/profile` - Update teacher profile
- `GET /teachers/profile` - Get teacher profile
- `GET /teachers` - List all teachers
- `PUT /teachers/availability` - Update availability
- `GET /teachers/bookings` - Get teacher's bookings
- `PUT /teachers/bookings/:id/accept` - Accept booking
- `PUT /teachers/bookings/:id/reject` - Reject booking

### studentRoutes.js
Student-related routes.

#### Endpoints:
- `POST /students/profile` - Create student profile
- `PUT /students/profile` - Update student profile
- `GET /students/profile` - Get student profile
- `GET /students` - List all students
- `POST /students/bookings` - Create booking
- `GET /students/bookings` - Get student's bookings
- `PUT /students/bookings/:id/cancel` - Cancel booking

### adminRoutes.js
Administrative routes.

#### Endpoints:
- `GET /admin/dashboard` - Get dashboard statistics
- `GET /admin/users` - List all users
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/reports` - Get system reports
- `PUT /admin/settings` - Update system settings

### auth.js
Additional authentication routes.

#### Endpoints:
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/facebook` - Facebook OAuth login
- `GET /auth/facebook/callback` - Facebook OAuth callback 