const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const cors = require("cors");
const urlencoded = require("body-parser").urlencoded;
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const { Connection } = require("./config/db");

const { AuthRouter } = require("./routes/authRoutes");
const { StudentRouter } = require("./routes/studentRoutes");
const { TeacherRouter } = require("./routes/teacherRoutes");
const { adminRouter } = require("./routes/adminRoutes");
const googleAuthRouter = require("./routes/auth");


const { errorHandler } = require("./middlewares/errorMiddleware");

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(
  expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, 
    },
  })
);

// API Routes
app.use("/auth", AuthRouter);  // Authentication routes
app.use("/auth/google", googleAuthRouter);  // Google OAuth routes
app.use("/student", StudentRouter);  // Student routes
app.use("/teacher", TeacherRouter);  // Teacher routes
app.use("/admin", adminRouter);  // Admin routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this after the static middleware
app.use('/uploads', (req, res, next) => {
  console.log('Accessing file:', req.path);
  next();
});

// Health check route
app.get("/", (req, res) => {
  res.json({ 
    status: "success", 
    message: "Server is running", 
    timestamp: new Date().toISOString() 
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server and connect to database
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await Connection();
    console.log(`Server is running on port ${PORT}`);
    console.log("Connection established to database");
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1); // Exit if database connection fails
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});