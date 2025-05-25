// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    meetingLink: { type: String },
    eventId: { type: String }, // Store the Google Calendar event ID
    day: { type: String, required: true },
    timeSlot: {
        start: { type: String, required: true },
        end: { type: String, required: true }
    },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' }
    }, 
    { timestamps: true });

const BookingModel = mongoose.model("Booking", bookingSchema)
module.exports = { BookingModel }