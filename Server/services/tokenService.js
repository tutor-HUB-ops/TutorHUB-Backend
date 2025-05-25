const jwt = require("jsonwebtoken");
const { client } = require("./redisClient");
require("dotenv").config();

const requiredEnvVars = [
  'JWT_ACCESS_TOKEN_SECRET_KEY',
  'JWT_REFRESH_TOKEN_SECRET_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Common token options
const tokenOptions = {
  algorithm: 'HS256',
  issuer: 'tutor-connect-api',
  audience: 'tutor-connect-client'
};

const generateTokens = (userId, role, email) => {

  const accessTokenPayload = { 
    userId, 
    role, 
    email,
    type: 'access'
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
    { 
      ...tokenOptions,
      expiresIn: "24h"
    }
  );


  const refreshTokenPayload = { 
    userId, 
    role, 
    email,
    type: 'refresh'
  };


  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
    { 
      ...tokenOptions,
      expiresIn: "4d"
    }
  );


  return { accessToken, refreshToken };
};

const verifyAccessToken = async (token) => {
  try {

    
    // Check blacklist
    const isBlacklisted = await client.get(token);
    if (isBlacklisted) {

      return null;
    }


    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      tokenOptions
    );


    if (payload.type !== 'access') {

      return null;
    }
    
    return payload;
  } catch (error) {

    return null;
  }
};

const verifyRefreshToken = async (refreshToken) => {
  try {
    const isBlacklisted = await client.get(refreshToken);
    if (isBlacklisted) {
      throw new Error('Token has been invalidated');
    }

    // Verify refresh token with consistent options
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
      tokenOptions
    );

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }



    // Generate new access token using refresh token's data
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
        type: 'access'
      },
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      { 
        ...tokenOptions,
        expiresIn: '24h'
      }
    );

    // Verify the new access token
    const decodedNewAccessToken = jwt.verify(
      newAccessToken,
      process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      tokenOptions
    );

    return newAccessToken;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    throw error;
  }
};

const blacklistTokens = async (accessToken, refreshToken) => {
  try {
    // Decode tokens
    const accessTokenPayload = jwt.decode(accessToken);
    const refreshTokenPayload = jwt.decode(refreshToken);

    // Minimum expiration time (5 minutes)
    const MIN_EXPIRATION = 300;

    // Check if tokens were successfully decoded
    if (!accessTokenPayload || !accessTokenPayload.exp) {
    } else {
      const accessTokenExp = accessTokenPayload.exp - Math.floor(Date.now() / 1000);
      if (accessTokenExp > MIN_EXPIRATION) {
        await client.setex(accessToken, accessTokenExp, "blacklisted")
          .catch(err => console.error('Redis error blacklisting access token:', err));
      }
    }

    if (!refreshTokenPayload || !refreshTokenPayload.exp) {
      console.warn("Invalid or missing refresh token");
    } else {
      const refreshTokenExp = refreshTokenPayload.exp - Math.floor(Date.now() / 1000);
      if (refreshTokenExp > MIN_EXPIRATION) {
        await client.setex(refreshToken, refreshTokenExp, "blacklisted")
          .catch(err => console.error('Redis error blacklisting refresh token:', err));
      }
    }
  } catch (error) {
    throw new Error('Failed to blacklist tokens: ' + error.message);
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistTokens
};
