const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  newAccessToken,
  sendOtp,
  verifyOtp,
  resetPassword,
  handleGoogleCallback
} = require("../controllers/authController");
const { auth, checkBanStatus } = require("../middlewares/authMiddleware");
const { handleFileUpload } = require('../middlewares/uploadMiddleware');
const { passport, getRefreshToken } = require("../config/google_Oauth");

const AuthRouter = express.Router();

// Regular registration for students and admins
AuthRouter.post("/register/:role", registerUser);

// Two-step registration for teachers
AuthRouter.post("/register/teacher/data", registerUser); // First step: Send teacher data
AuthRouter.post("/register/teacher/files", handleFileUpload, registerUser); // Second step: Upload files

AuthRouter.post("/login", checkBanStatus, loginUser);
AuthRouter.post("/logout", auth, logoutUser);
AuthRouter.get("/refresh-token", auth, newAccessToken);

AuthRouter.post("/otp/send", checkBanStatus, sendOtp);
AuthRouter.post("/otp/verify", verifyOtp);
AuthRouter.post("/reset-password", checkBanStatus, resetPassword);

// Route to get Google refresh token
AuthRouter.get("/google/get-refresh-token", async (req, res) => {
  try {
    const authUrl = await getRefreshToken();
    res.json({ authUrl });
  } catch (error) {
    console.error("Error getting refresh token URL:", error);
    res.status(500).json({ error: "Failed to get refresh token URL" });
  }
});

AuthRouter.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["profile", "email", "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
    prompt: "select_account",
    accessType: "offline"
  })
);

AuthRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?error=google_auth_failed",
    session: false,
  }),
  (req, res, next) => {
    // Log the user data for debugging
    console.log("Google user data:", req.user);
    next();
  },
  handleGoogleCallback
);

module.exports = { AuthRouter }; 