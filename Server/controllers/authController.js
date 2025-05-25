const bcrypt = require("bcrypt");
const { generateTokens, verifyRefreshToken, blacklistTokens } = require("../services/tokenService");
const { sendOtpEmail } = require("../services/emailService");
const { client } = require("../services/redisClient");
const { StudentModel } = require("../models/StudentModel");
const { TeacherModel } = require("../models/TeacherModel");
const { AdminModel } = require("../models/AdminModel");
const { FileModel } = require('../models/FileModel')
const fs = require('fs');


const registerUser = async (req, res) => {
  try {
    const { email, password, name, availability, subjects, hourlyRate } = req.body;
    const { role } = req.params;
    const isTeacherDataRoute = req.path === '/register/teacher/data';

    if (!email || !password || !name) {
      return res.status(400).send({ msg: "Email, password, and name are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ msg: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).send({ msg: "Password must be at least 8 characters long" });
    }

    const existingStudent = await StudentModel.findOne({ email });
    const existingTeacher = await TeacherModel.findOne({ email });
    const existingAdmin = await AdminModel.findOne({ email });

    if (existingStudent || existingTeacher || existingAdmin) {
      return res.status(400).send({ msg: "User already exists" });
    }

    if (isTeacherDataRoute) {
      if (!availability || !subjects || !hourlyRate) {
        return res.status(400).send({ 
          msg: "Teacher registration requires availability, subjects, and hourlyRate" 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const teacher = new TeacherModel({
        email,
        password: hashedPassword,
        name,
        role: "teacher",
        availability: availability,
        subjects: subjects,
        hourlyRate: Number(hourlyRate)
      });

      await teacher.save();


      const { accessToken, refreshToken } = generateTokens(teacher._id, teacher.role, teacher.email);

      // Set tokens
      res.cookie("accessToken", accessToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 
      });
      res.cookie("refreshToken", refreshToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict",
        maxAge: 4 * 24 * 60 * 60 * 1000 
      });

      return res.status(201).send({
        msg: "Teacher registration successful",
        user: { ...teacher._doc, password: undefined },
        token: accessToken
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user = null;

    if (role === "student") {
      user = new StudentModel({ 
        email, 
        password: hashedPassword, 
        name, 
        role 
      });
    } else if (role === "admin") {
      user = new AdminModel({ 
        email, 
        password: hashedPassword, 
        name, 
        role 
      });
    } else {
      return res.status(400).send({ msg: "Invalid role specified" });
    }

    if (!user) {
      return res.status(400).send({ msg: "Failed to create user" });
    }

    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.email);

    // Set tokens
    res.cookie("accessToken", accessToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 
    });
    res.cookie("refreshToken", refreshToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 4 * 24 * 60 * 60 * 1000 
    });

    res.status(201).send({
      msg: `${role.charAt(0).toUpperCase() + role.slice(1)} registration successful`,
      user: { ...user._doc, password: undefined },
      token: accessToken
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send({ msg: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check all user types
    const student = await StudentModel.findOne({ email });
    const teacher = await TeacherModel.findOne({ email });
    const admin = await AdminModel.findOne({ email });
    
    const user = student || teacher || admin;

    if (!user) return res.status(400).send({ msg: "Not an existing user, please register" });
    if (user.banned) return res.status(403).send({ msg: "Account is banned" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(401).send({ msg: "Wrong credentials" });
    

    const { accessToken, refreshToken } = generateTokens(user._id, user.role, user.email);

    // Set tokens in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    // Set Bearer token in Authorization header
    res.setHeader('Authorization', `Bearer ${accessToken}`);

    res.status(200).send({ 
      msg: "Login successful", 
      user: { ...user._doc, password: undefined },
      token: accessToken // Include token in response for client-side storage if needed
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const logoutUser = async (req, res) => {
  try {
    // Get tokens from both cookies and authorization header
    const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken) {
      return res.status(400).send({ 
        msg: "No tokens found. You might already be logged out." 
      });
    }

    // Blacklist the tokens
    await blacklistTokens(accessToken, refreshToken);

    // Clear the cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    
    res.status(200).send({ msg: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).send({ msg: "Error during logout" });
  }
};

const newAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    const newAccessToken = await verifyRefreshToken(refreshToken);
    if (!newAccessToken) return res.status(401).send({ msg: "Invalid or expired refresh token" });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    res.status(200).send({ msg: "Token generated", newAccessToken });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = await sendOtpEmail(email);
    await client.setex(`otp:${email}`, 300, otp);
    res.send({ msg: "OTP sent to email" });
  } catch (error) {
    res.status(500).send({ msg: "Error sending OTP" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const storedOtp = await client.get(`otp:${email}`);
    
    if (!storedOtp || otp !== storedOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Store verification status with 15-minute expiry
    await client.setex(`verified:${email}`, 900, email);
    
    // Clear OTP after successful verification
    await client.del(`otp:${email}`);

    res.json({
      success: true,
      message: "OTP verification successful"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    
    // 1. Verify that OTP was recently verified
    const verifiedEmail = await client.get(`verified:${email}`);
    if (!verifiedEmail) {
      return res.status(400).json({
        success: false,
        message: "Please verify your OTP first"
      });
    }

    // 2. Check both models for the user
    const student = await StudentModel.findOne({ email });
    const teacher = await TeacherModel.findOne({ email });
    const admin = await AdminModel.findOne({ email});

    const user = student || teacher || admin;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 3. Update password
    const newHashedPassword = await bcrypt.hash(password, 10);
    const Model = student ? StudentModel : teacher ? TeacherModel : admin ? AdminModel : null;
    
    await Model.findByIdAndUpdate(user._id, { password: newHashedPassword });

    // 4. Clear verification data from Redis
    await client.del(`verified:${email}`);
    await client.del(`otp:${email}`);

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message
    });
  }
};

const handleGoogleCallback = async (req, res) => {
  try {
    // Log the entire request for debugging
    console.log("Google callback request:", req.user);

    // Extract user data from the transformed Google profile
    const { email, full_name: name, avatar } = req.user;

    if (!email || !name) {
      throw new Error("Missing required user data from Google");
    }
    
    // Check all user types
    let user = await StudentModel.findOne({ email }) || 
               await TeacherModel.findOne({ email }) || 
               await AdminModel.findOne({ email });
    
    let role = "student"; // default role
    let Model = StudentModel; // default model
    
    if (!user) {
      // Generate a random password for Google-authenticated users
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      // Create new user if doesn't exist
      user = new Model({
        email,
        name,
        password: hashedPassword,
        avatar,
        role,
        isGoogleAuth: true
      });

      try {
        await user.save();
        console.log("New user created:", { email, name, role });
      } catch (saveError) {
        console.error("Error saving new user:", saveError);
        throw saveError;
      }
    } else {
      // If user exists, determine their role
      if (user instanceof StudentModel) {
        role = "student";
        Model = StudentModel;
      } else if (user instanceof TeacherModel) {
        role = "teacher";
        Model = TeacherModel;
      } else if (user instanceof AdminModel) {
        role = "admin";
        Model = AdminModel;
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, role, user.email);

    // Return the tokens and user info
    res.json({
      success: true,
      message: "Google authentication successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: role
        }
      }
    });
  } catch (error) {
    console.error("Google OAuth Error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: error.message
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  newAccessToken,
  sendOtp,
  verifyOtp,
  resetPassword,
  handleGoogleCallback,
  registerUser
};
