# Models Documentation

## Overview
Models define the data structure and schema for the application. They represent the database collections and their relationships.

## Files

### AdminModel.js
Defines the schema for admin users.

#### Schema Fields:
- `email` - Admin's email address
- `password` - Hashed password
- `role` - User role (admin)
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

### TeacherModel.js
Defines the schema for teacher profiles.

#### Schema Fields:
- `userId` - Reference to user account
- `firstName` - Teacher's first name
- `lastName` - Teacher's last name
- `specialization` - Teaching subjects
- `experience` - Years of experience
- `qualifications` - Educational qualifications
- `availability` - Teaching schedule
- `rating` - Average rating
- `createdAt` - Profile creation timestamp
- `updatedAt` - Last update timestamp

### StudentModel.js
Defines the schema for student profiles.

#### Schema Fields:
- `userId` - Reference to user account
- `firstName` - Student's first name
- `lastName` - Student's last name
- `grade` - Current grade level
- `subjects` - Subjects of interest
- `createdAt` - Profile creation timestamp
- `updatedAt` - Last update timestamp

### BookingModel.js
Defines the schema for tutoring sessions.

#### Schema Fields:
- `teacherId` - Reference to teacher
- `studentId` - Reference to student
- `subject` - Subject of tutoring
- `date` - Session date
- `time` - Session time
- `status` - Booking status
- `createdAt` - Booking creation timestamp
- `updatedAt` - Last update timestamp

### ResourceModel.js
Defines the schema for teaching resources.

#### Schema Fields:
- `title` - Resource title
- `description` - Resource description
- `type` - Resource type
- `url` - Resource location
- `createdAt` - Resource creation timestamp
- `updatedAt` - Last update timestamp

### FileModel.js
Defines the schema for uploaded files.

#### Schema Fields:
- `filename` - Original filename
- `path` - File storage path
- `mimetype` - File type
- `size` - File size
- `createdAt` - Upload timestamp 