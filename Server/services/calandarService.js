const { google } = require("googleapis");
const { oAuth2Client } = require("../config/google_Oauth");

// Initialize calendar API with authenticated client
const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

// Function to create a Google Meet meeting
async function createGoogleMeet({ summary, description, startTime, endTime, attendees }) {
  try {
    if (!summary || !startTime || !endTime || !attendees) {
      throw new Error("Missing required fields for meeting creation");
    }

    // Check if OAuth2 client is properly initialized
    if (!oAuth2Client.credentials || !oAuth2Client.credentials.refresh_token) {
      console.error("OAuth2 client not properly initialized. Missing refresh token.");
      throw new Error("Google Calendar authentication not properly configured");
    }

    // Convert time strings to full ISO timestamps
    const startDateTime = new Date(startTime).toISOString();
    const endDateTime = new Date(endTime).toISOString();

    console.log("Creating Google Meet with parameters:", {
      summary,
      startDateTime,
      endDateTime,
      attendees
    });

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "UTC",
      },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    console.log("Attempting to create calendar event...");
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    console.log("Calendar API response:", response.data);

    if (!response.data || !response.data.hangoutLink) {
      throw new Error("Failed to create Google Meet meeting: No hangout link in response");
    }

    return {
      id: response.data.id,
      hangoutLink: response.data.hangoutLink,
      startTime: response.data.start.dateTime,
      endTime: response.data.end.dateTime,
      attendees: response.data.attendees
    };
  } catch (error) {
    console.error("Error creating Google Meet meeting:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Check for specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
      throw new Error("Network error: Unable to connect to Google Calendar API. Please check your internet connection.");
    } else if (error.code === 401) {
      throw new Error("Authentication error: Google Calendar credentials are invalid or expired.");
    } else if (error.code === 403) {
      throw new Error("Permission error: Insufficient permissions to create Google Meet meetings.");
    }
    
    throw new Error(`Failed to create Google Meet meeting: ${error.message}`);
  }
}

// Function to delete a Google Meet meeting
const deleteGoogleMeetEvent = async (eventId) => {
  try {
    if (!eventId) {
      throw new Error("Event ID is required for deletion");
    }

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    return true;
  } catch (error) {
    console.error("Error deleting Google Meet meeting:", error);
    throw new Error(`Failed to delete Google Meet meeting: ${error.message}`);
  }
};

// Function to get calendar events for a time range
const getCalendarEvents = async (timeMin, timeMax) => {
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }
};

// Function to update a calendar event
const updateCalendarEvent = async (eventId, updates) => {
  try {
    if (!eventId) {
      throw new Error("Event ID is required for update");
    }

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      resource: updates,
    });

    return response.data;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
};

module.exports = {
  createGoogleMeet,
  deleteGoogleMeetEvent,
  getCalendarEvents,
  updateCalendarEvent
};
