const express = require('express');
const router = express.Router();
const { getRefreshToken, oAuth2Client } = require('../config/google_Oauth');

// Route to get refresh token
router.get('/get-refresh-token', async (req, res) => {
  try {
    const authUrl = await getRefreshToken();
    res.send(`
      <html>
        <head>
          <title>Google OAuth Authorization</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .url { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all; }
            .steps { margin-top: 20px; }
            .steps li { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Google OAuth Authorization</h2>
            <p>Click the link below to authorize the application:</p>
            <div class="url">
              <a href="${authUrl}" target="_blank">${authUrl}</a>
            </div>
            <div class="steps">
              <h3>Steps:</h3>
              <ol>
                <li>Click the link above</li>
                <li>Sign in with your Google account</li>
                <li>Grant the requested permissions</li>
                <li>You will be redirected to your callback URL</li>
                <li>Check your server console for the refresh token</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    res.status(500).send(error.message);
  }
});

// Google OAuth callback route
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('No code provided');
    }

    const { tokens } = await oAuth2Client.getToken(code);
    console.log('\n==========================================');
    console.log('REFRESH TOKEN:');
    console.log('==========================================');
    console.log(tokens.refresh_token);
    console.log('==========================================\n');
    
    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .token { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Authorization Successful!</h2>
            <p>Your refresh token has been generated. Please check your server console to get the token.</p>
            <p>Add this token to your .env file as:</p>
            <div class="token">
              GOOGLE_REFRESH_TOKEN=your_token_here
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in callback:', error);
    res.status(500).send(error.message);
  }
});

module.exports = router; 