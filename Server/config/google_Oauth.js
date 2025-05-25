const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const { google } = require("googleapis");

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Define Google OAuth scopes
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'profile',
  'email'
];

// Get the redirect URI from environment variables
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: REDIRECT_URI,
      scope: GOOGLE_SCOPES,
    },
    async function (accessToken, refreshToken, profile, cb) {
      try {
        if (!profile || !profile._json) {
          return cb(new Error("Invalid profile data received from Google"));
        }

        let user = {
          full_name: profile._json.name,
          email: profile._json.email,
          password: uuidv4(),
          avatar: profile._json.picture,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken
        };

        return cb(null, user);
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return cb(error);
      }
    }
  )
);

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Function to get refresh token
const getRefreshToken = async () => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent' // Force to get refresh token
  });

  return url;
};

// Initialize OAuth2 client with refresh token if available
const initializeOAuth2Client = async () => {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      // Test the credentials by making a simple API call
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      await calendar.calendarList.list();
      console.log('OAuth2 client initialized successfully');
    } catch (error) {
      console.error('Error initializing OAuth2 client:', error);
      throw error;
    }
  } else {
    console.warn('No refresh token found. Please run getRefreshToken() to obtain one.');
  }
};

// Initialize the client when the module is loaded
initializeOAuth2Client().catch(console.error);

module.exports = { 
  passport, 
  oAuth2Client, 
  getRefreshToken,
  GOOGLE_SCOPES 
};
