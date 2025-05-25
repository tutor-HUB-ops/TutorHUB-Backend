const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../services/tokenService');
// const { client } = require('../services/redisClient');
const { newAccessToken } = require('../controllers/authController');
require('dotenv').config();
const { StudentModel } = require("../models/StudentModel");
const { TeacherModel } = require("../models/TeacherModel");



const auth = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies;
    const access_token = req.headers.authorization?.split(' ')[1] || accessToken;

    if (!access_token) {
      console.log('No access token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided, please login!',
      });
    }

    // Use the modular verifyAccessToken function
    const payload = await verifyAccessToken(access_token);

    if (!payload) {
      console.log('Invalid or expired access token');

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found. Please login again.',
        });
      }

      try {
        // Mock response to work with newAccessToken utility
        const mockRes = {
          cookie: (name, value, options) => res.cookie(name, value, options),
          status: (code) => ({
            send: (data) => {
              if (code === 200 && data.msg === 'Token generated') {
                const newPayload = jwt.verify(
                  data.newAccessToken,
                  process.env.JWT_ACCESS_TOKEN_SECRET_KEY
                );

                req.body.userId = newPayload.userId;
                req.user = {
                  userId: newPayload.userId,
                  role: newPayload.role,
                };

                return next();
              }
              return res.status(code).json(data);
            },
          }),
        };

        await newAccessToken({ cookies: { refreshToken } }, mockRes);
      } catch (refreshError) {
        console.log('Error refreshing token:', refreshError);
        return res.status(500).json({
          success: false,
          message: 'Error refreshing token',
          error: refreshError.message,
        });
      }

      return; // Important: exit here to prevent proceeding without calling next()
    }

    // Access token is valid
    req.body.userId = payload.userId;
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};



const checkBanStatus = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(); // If no email in request, proceed (for non-login routes)
    }

    // Check both student and teacher models for banned status
    const student = await StudentModel.findOne({ email });
    const teacher = await TeacherModel.findOne({ email });

    const user = student || teacher;
    
    if (user && user.banned) {
      return res.status(403).json({
        success: false,
        message: "This account has been banned. Please contact support for more information."
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking ban status",
      error: error.message
    });
  }
};

module.exports = { auth, checkBanStatus };