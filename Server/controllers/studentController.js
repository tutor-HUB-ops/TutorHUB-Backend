const { StudentModel } = require("../models/StudentModel");
const bcrypt = require("bcrypt");
const { TeacherModel } = require("../models/TeacherModel");
const Resource = require('../models/ResourceModel');
const { BookingModel } = require("../models/BookingModel");
const { deleteGoogleMeetEvent } = require("../services/calandarService");
const { sendEmail } = require("../services/emailService");


const searchTeachers = async (req, res) => {
  try {
    const { subject, name, verified, qualification } = req.query;
    const filter = {};

    if (subject) filter.subjects = { $regex: subject, $options: "i" };
    if (name) filter.name = { $regex: name, $options: "i" };
    if (verified !== undefined) filter.isVerified = verified === "true";
    if (qualification) filter["profile.qualifications"] = { $in: [qualification] };

    const teachers = await TeacherModel.find(filter).select("-password");
    res.status(200).send({ msg: "Filtered teachers fetched", teachers });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

// Get student profile
const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.body.userId;
    const student = await StudentModel.findById(studentId).select("-password");
    if (!student) return res.status(404).send({ msg: "Student not found" });
    res.status(200).send({ student });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.body.userId;
    const updates = req.body;

    if (!studentId) {
      return res.status(400).send({ msg: "Student ID is required" });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await StudentModel.findByIdAndUpdate(studentId, updates, { new: true });
    
    if (!updated) {
      return res.status(404).send({ msg: "Student not found" });
    }

    res.status(200).send({ msg: "Profile updated", student: updated });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

// Rate a teacher
// const rateTeacher = async (req, res) => {
//   try {
//     const { teacherId, rating, comment } = req.body;
//     const studentId = req.userId;

//     const teacher = await TeacherModel.findById(teacherId);
//     if (!teacher) return res.status(404).send({ msg: "Teacher not found" });

//     teacher.ratings = teacher.ratings || [];
//     teacher.ratings.push({
//       student: studentId,
//       rating,
//       comment,
//       date: new Date()
//     });

//     await teacher.save();
//     res.status(200).send({ msg: "Rating submitted" });
//   } catch (error) {
//     res.status(500).send({ msg: error.message });
//   }
// };



const bookTeacher = async (req, res) => {
  try {
    const { teacherId, subject, date, startTime, endTime } = req.body;
    const studentId = req.body.userId;
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });

    // Validate required fields
    if (!teacherId || !subject || !date || !startTime || !endTime) {
      return res.status(400).send({ msg: "Missing required booking information" });
    }

    // Validate date is not in the past
    if (dateObj < new Date()) {
      return res.status(400).send({ msg: "Cannot book for past dates" });
    }

    // Validate time format
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).send({ msg: "Invalid time format. Use HH:MM format (24-hour)" });
    }
    if (start >= end) {
      return res.status(400).send({ msg: "startTime must be before endTime" });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) return res.status(404).send({ msg: "Student not found" });

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) return res.status(404).send({ msg: "Teacher not found" });

    // Verify teacher teaches the subject
    if (!teacher.subjects.includes(subject)) {
      return res.status(400).send({ msg: "Teacher does not teach this subject" });
    }

    // Check for booking conflicts
    const conflict = await BookingModel.findOne({
      teacher: teacherId,
      date: dateObj,
      status: { $in: ["pending", "confirmed"] }, // Only check against active bookings
      $or: [
        {
          "timeSlot.start": { $lt: endTime, $gte: startTime }
        },
        {
          "timeSlot.end": { $gt: startTime, $lte: endTime }
        }
      ]
    });

    if (conflict) {
      return res.status(400).send({ msg: "Teacher already booked for this time slot" });
    }

    const booking = new BookingModel({
      student: studentId,
      teacher: teacherId,
      subject,
      day: dayOfWeek,
      date: dateObj,
      timeSlot: {
        start: startTime,
        end: endTime
      },
      status: "pending",
    });

    await booking.save();

    res.status(201).send({ 
      msg: "Teacher booked successfully", 
      booking: {
        id: booking._id,
        subject: booking.subject,
        day: booking.day,
        date: booking.date.toISOString(),
        timeSlot: booking.timeSlot,
        status: booking.status,
        teacherName: teacher.name,
        teacherEmail: teacher.email
      }
    });

  } catch (error) {
    console.error("Error in bookTeacher:", error);
    res.status(500).send({ msg: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const studentId = req.body.userId;
    const { bookingId } = req.params;

    const booking = await BookingModel.findOne({ 
      _id: bookingId,
      student: studentId,
      status: { $in: ["pending", "confirmed"] } 
    }).populate('student', 'name email').populate('teacher', 'name email');

    if (!booking) {
      return res.status(404).send({ 
        msg: "Booking not found or not authorized to cancel" 
      });
    }

    // If the booking was confirmed and has an event ID, delete the meeting
    if (booking.status === "confirmed" && booking.eventId) {
      try {
        await deleteGoogleMeetEvent(booking.eventId);
      } catch (error) {
        console.error("Error deleting meeting:", error);
        throw error;
      }
    }

    const cancelledBooking = await BookingModel.findByIdAndUpdate(
      bookingId,
      { 
        status: "cancelled",
        meetingLink: null,
        eventId: null
      },
      { new: true }
    ).populate("teacher", "name email").populate("student", "name email");

    // Only send emails for pending bookings
    if (booking.status === "confirmed") {
      try {
        // Send email to student
        await sendEmail({
          to: booking.student.email,
          subject: 'Booking Cancelled',
          html: `
            <h2>Booking Cancelled</h2>
            <p>You have cancelled your pending booking for <strong>${booking.subject}</strong>.</p>
            <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
            <p>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</p>
            <p>Teacher: ${booking.teacher.name}</p>
            <p>Thank you for using TutorConnect!</p>
          `
        });

        // Send email to teacher
        await sendEmail({
          to: booking.teacher.email,
          subject: 'Booking Cancelled',
          html: `
            <h2>Booking Cancelled</h2>
            <p>A student has cancelled their pending booking for <strong>${booking.subject}</strong>.</p>
            <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
            <p>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</p>
            <p>Student: ${booking.student.name}</p>
            <p>Thank you for using TutorConnect!</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Continue even if email sending fails
      }
    }

    res.status(200).send({ 
      msg: "Booking cancelled",
      booking: {
        id: cancelledBooking._id,
        subject: cancelledBooking.subject,
        date: cancelledBooking.date.toISOString(),
        timeSlot: cancelledBooking.timeSlot,
        teacherName: cancelledBooking.teacher?.name || "Unknown",
        teacherEmail: cancelledBooking.teacher?.email || "N/A",
        status: cancelledBooking.status
      }
    });
  } catch (error) {
    console.error("Error in cancelBooking:", error);
    res.status(500).send({ msg: error.message });
  }
};

const completeBooking = async (req, res) => {
  try {
    const studentId = req.body.userId;
    const { bookingId } = req.params;

    // Verify booking exists and belongs to student
    const booking = await BookingModel.findOne({ 
      _id: bookingId,
      student: studentId,
      status: "confirmed" // Can only complete confirmed bookings
    });

    if (!booking) {
      return res.status(404).send({ 
        msg: "Booking not found or not authorized to complete" 
      });
    }

    // If the booking has an event ID, delete the meeting
    if (booking.eventId) {
      try {
        await deleteGoogleMeetEvent(booking.eventId);
      } catch (error) {
        console.error("Error deleting meeting:", error);
        // Continue with completion even if meeting deletion fails
      }
    }

    const completedBooking = await BookingModel.findByIdAndUpdate(
      bookingId,
      { 
        status: "completed",
        meetingLink: null, // Clear the meeting link
        eventId: null // Clear the event ID
      },
      { new: true }
    ).populate("teacher", "name email");

    res.status(200).send({ 
      msg: "Booking marked as completed",
      booking: {
        id: completedBooking._id,
        subject: completedBooking.subject,
        date: completedBooking.date.toISOString(),
        timeSlot: completedBooking.timeSlot,
        teacherName: completedBooking.teacher?.name || "Unknown",
        teacherEmail: completedBooking.teacher?.email || "N/A",
        status: completedBooking.status
      }
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const getTeachers = async (req, res) => {
  try {
    
    const teachers = await TeacherModel.find({}, "-password")
    res.status(200).send({ msg: "Teachers fetched", teachers });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const getBookings = async (req, res) => {
  try {
    const studentId = req.body.userId;
    
    if (!studentId) {
      return res.status(400).send({ msg: "Student ID is required" });
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).send({ msg: "Student not found" });
    }

    // Get all bookings except declined ones (since they're deleted)
    const bookings = await BookingModel.find({ 
      student: studentId,
      status: { $in: ["pending", "confirmed", "completed", "cancelled"] }
    })
    .populate("teacher", "name email")
    .sort({ date: 1 });

    res.status(200).send({ 
      msg: "Student bookings fetched successfully",
      bookings: bookings.map(booking => ({
        id: booking._id,
        subject: booking.subject,
        date: booking.date.toISOString(),
        timeSlot: {
          start: booking.timeSlot.start,
          end: booking.timeSlot.end
        },
        teacherName: booking.teacher?.name || "Unknown",
        teacherEmail: booking.teacher?.email || "N/A",
        status: booking.status,
        meetingLink: booking.meetingLink
      }))
    });
  } catch (error) {
    console.error("Error in getBookings:", error);
    res.status(500).send({ 
      msg: "Error fetching bookings", 
      error: error.message 
    });
  }
};

const getResources = async (req, res) => {
  try {

    const { subject, userId } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (userId) filter.uploadedBy = userId;

    const resources = await Resource.ResourceModel.find(filter)

    res.status(200).send({msg: "Resources fetched sucessfully.", Resources: resources });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};






/****************************************************
 *  Needs a second Check
*****************************************************/
const getAvailableSlots = async (req, res) => {
  try {
    const teacherId = req.params.userId;
    const { date } = req.query;

    // 1. Fetch teacher availability
    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) return res.status(404).send({ msg: "Teacher not found" });

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out past dates and sort by date
    let availability = teacher.availability
      .filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // If date is provided, filter for that specific date
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      availability = availability.filter(slot => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === targetDate.getTime();
      });
    }

    // Get active bookings for the teacher
    const activeBookings = await BookingModel.find({
      teacher: teacherId,
      status: { $in: ["pending", "confirmed"] }
    });

    // Filter out slots that have bookings
    const availableSlots = availability.filter(slot => {
      const slotDate = new Date(slot.date);
      const slotStart = new Date(`${slot.date}T${slot.startTime}`);
      const slotEnd = new Date(`${slot.date}T${slot.endTime}`);

      // Check if there's any booking that overlaps with this slot
      return !activeBookings.some(booking => {
        const bookingDate = new Date(booking.date);
        const bookingStart = new Date(`${booking.date}T${booking.timeSlot.start}`);
        const bookingEnd = new Date(`${booking.date}T${booking.timeSlot.end}`);

        return (
          slotDate.getTime() === bookingDate.getTime() &&
          ((slotStart >= bookingStart && slotStart < bookingEnd) ||
           (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
           (slotStart <= bookingStart && slotEnd >= bookingEnd))
        );
      });
    });

    res.status(200).send({
      msg: "Available slots fetched successfully",
      availability: availableSlots,
      subjects: teacher.subjects
    });

  } catch (error) {
    console.error("Error in getAvailableSlots:", error);
    res.status(500).send({ msg: error.message });
  }
};

// Utility functions (unchanged)
function subtractTimeSlot(availableSlots, bookedSlot) {
  const result = [];

  availableSlots.forEach(slot => {
    if (bookedSlot.end <= slot.start || bookedSlot.start >= slot.end) {
      result.push(slot);
    } else {
      if (bookedSlot.start > slot.start) {
        result.push({ start: slot.start, end: bookedSlot.start });
      }
      if (bookedSlot.end < slot.end) {
        result.push({ start: bookedSlot.end, end: slot.end });
      }
    }
  });

  return result;
}

function timeIsValid(start, end) {
  return start < end;
}

// Add this function with your other controller functions
const getDashboard = async (req, res) => {
  try {
    // Get the student's data
    const student = await StudentModel.findById(req.user.userId)
      .select('-password'); // Exclude password from the response

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get recent bookings
    const recentBookings = await BookingModel.find({ student: student._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('teacher', 'name email');

    // Get available teachers
    const availableTeachers = await TeacherModel.find({ isAvailable: true })
      .select('name email subjects hourlyRate')
      .limit(5);

    res.json({
      student,
      recentBookings,
      availableTeachers,
      message: "Dashboard data retrieved successfully"
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Error retrieving dashboard data" });
  }
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  searchTeachers,
  bookTeacher,
  cancelBooking,
  completeBooking,
  getTeachers,
  getBookings,
  getResources,
  getAvailableSlots,
  getDashboard
};

