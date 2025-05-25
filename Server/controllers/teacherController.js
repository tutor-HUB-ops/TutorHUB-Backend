const { TeacherModel } = require("../models/TeacherModel");
const { BookingModel } = require("../models/BookingModel");
const {ResourceModel} = require('../models/ResourceModel');
const { FileModel } = require("../models/FileModel");
const { createGoogleMeet, deleteGoogleMeetEvent } = require("../services/calandarService");
const { sendEmail } = require("../services/emailService");
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const addAttachments = async (req, res) => {
  try {
    const teacherId = req.body.userId;

    if (!req.files || req.files.length === 0) {
      console.log("No files uploaded");
      return res.status(400).json({ msg: "No files uploaded" });
    }

    const savedFiles = await Promise.all(
      
      req.files.map(file => {
        const newFile = new FileModel({
          uploadedBy: teacherId,
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimeType: file.mimetype,
          size: file.size
        });
        return newFile.save();
      })
    );

    console.log("Files saved:", savedFiles);

    const attachmentIds = savedFiles.map(file => file._id);

    console.log("Attachment IDs:", attachmentIds);

    const updatedTeacher = await TeacherModel.findByIdAndUpdate(
      teacherId,
      { $push: { attachments: { $each: attachmentIds } } },
      { new: true }
    ).populate('attachments');

    console.log("Updated teacher:", updatedTeacher);

    res.status(200).json({ msg: 'Attachments added successfully'});
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};


const removeAttachment = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const teacherId = req.body.userId;

    if (!fileId || !teacherId) {
      return res.status(400).json({ msg: "File ID and Teacher ID are required" });
    }

    // Remove file reference from teacher
    const teacher = await TeacherModel.findByIdAndUpdate(
      teacherId,
      { $pull: { attachments: fileId } },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ msg: "Teacher not found" });
    }

    // Delete the file document from DB
    const file = await FileModel.findByIdAndDelete(fileId);

    if (file) {
      // Delete file from disk with proper error handling
      const filePath = path.resolve(file.path);
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error("Failed to delete file from disk:", err);
        // Continue with the response even if file deletion fails
      }
    }

    res.status(200).json({ msg: "Attachment removed successfully" });
  } catch (error) {
    console.error("Error in removeAttachment:", error);
    res.status(500).json({ msg: error.message });
  }
};



const addAvailability = async (req, res) => {
    try {
        const teacherId = req.body.userId;
        const { date, startTime, endTime } = req.body;

        // Validate required fields
        if (!date || !startTime || !endTime) {
            return res.status(400).send({ 
                msg: "date, startTime, and endTime are required" 
            });
        }

        // Validate time format and logic
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).send({ 
                msg: "Invalid time format. Use HH:MM format (24-hour)" 
            });
        }

        if (start >= end) {
            return res.status(400).send({ 
                msg: "startTime must be before endTime" 
            });
        }

        // Convert date to day of week
        const dateObj = new Date(date);
        const day = dateObj.toLocaleDateString("en-US", { weekday: "long" });

        // Find teacher and update availability
        const teacher = await TeacherModel.findById(teacherId);
        if (!teacher) {
            return res.status(404).send({ msg: "Teacher not found" });
        }

        // Check for overlapping slots
        const hasOverlap = teacher.availability.some(slot => {
            if (slot.day !== day) return false;
            
            const existingStart = new Date(`1970-01-01T${slot.startTime}`);
            const existingEnd = new Date(`1970-01-01T${slot.endTime}`);
            
            return (start < existingEnd && end > existingStart);
        });

        if (hasOverlap) {
            return res.status(400).send({ 
                msg: "This time slot overlaps with existing availability" 
            });
        }

        // Add new availability slot
        const newSlot = { day, date, startTime, endTime };
        
        // Use $addToSet to prevent duplicates
        const updatedTeacher = await TeacherModel.findByIdAndUpdate(
            teacherId,
            { $addToSet: { availability: newSlot } },
            { new: true }
        );

        res.status(200).send({ 
            msg: "Availability added successfully", 
            availability: updatedTeacher.availability 
        });
    } catch (error) {
        console.error("Add availability error:", error);
        res.status(500).send({ msg: error.message });
    }
};


const removeAvailability = async (req, res) => {
    try {
        const teacherId = req.body.userId;
        const { date, startTime, endTime } = req.body;

        const day = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
        

        // Validate required fields
        if (!teacherId || !day || !startTime || !endTime) {
            return res.status(400).send({ 
                msg: "Missing required fields. Please provide userId, day, startTime, and endTime"
            });
        }

        const teacher = await TeacherModel.findById(teacherId);
        if (!teacher) {
            return res.status(404).send({ msg: "Teacher not found" });
        }

        console.log("Current availability:", teacher.availability);

        // Convert times to same format for comparison, with null checks
        const normalizeTime = (time) => {
            if (time === null || time === undefined) return '';
            return String(time).trim();
        };
        
        const originalLength = teacher.availability.length;
        
        teacher.availability = teacher.availability.filter(slot => {
            if (!slot || typeof slot !== 'object') {
                console.log("Invalid slot found:", slot);
                return true; // Keep other slots, remove invalid ones
            }

            const matches = normalizeTime(slot.day) === normalizeTime(day) &&
                          normalizeTime(slot.startTime) === normalizeTime(startTime) &&
                          normalizeTime(slot.endTime) === normalizeTime(endTime);
            
            console.log("Comparing slot:", slot, "with input:", { day, startTime, endTime }, "matches:", matches);
            return !matches;
        });

        if (teacher.availability.length === originalLength) {
            return res.status(404).send({ 
                msg: "No matching availability slot found",
                searchedFor: { day, startTime, endTime },
                currentAvailability: teacher.availability
            });
        }

        await teacher.save();
        console.log("Updated availability:", teacher.availability);
        
        res.status(200).send({ 
            msg: "Availability removed successfully", 
            availability: teacher.availability 
        });
    } catch (error) {
        console.error("Error in removeAvailability:", error);
        res.status(500).send({ 
            msg: "Error removing availability",
            error: error.message,
            details: "Please ensure all required fields (userId, day, startTime, endTime) are provided"
        });
    }
};


const addSubject = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      const { subjects } = req.body; // Accept an array
  
      const updated = await TeacherModel.findByIdAndUpdate(
        teacherId,
        { $addToSet: { subjects: { $each: subjects } } },
        { new: true }
      );
  
      res.status(200).send({ msg: "Subjects added", teacher: updated });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
};

const removeSubject = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      const { subject } = req.body;

      // Validate input
      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }
      if (!subject) {
        return res.status(400).send({ msg: "Subject is required" });
      }

      // Find teacher first to check if they exist and if they have the subject
      const teacher = await TeacherModel.findById(teacherId);
      if (!teacher) {
        return res.status(404).send({ msg: "Teacher not found" });
      }

      console.log("Current subjects:", teacher.subjects);
      console.log("Attempting to remove subject:", subject);

      // Check if subject exists in teacher's list
      if (!teacher.subjects.includes(subject)) {
        return res.status(400).send({ 
          msg: "Subject not found in teacher's list",
          currentSubjects: teacher.subjects,
          attemptedToRemove: subject
        });
      }

      const updated = await TeacherModel.findByIdAndUpdate(
        teacherId,
        { $pull: { subjects: subject } },
        { new: true }
      );

      console.log("Updated subjects:", updated.subjects);
  
      res.status(200).send({ 
        msg: "Subject removed successfully", 
        removedSubject: subject,
        currentSubjects: updated.subjects 
      });
    } catch (error) {
      console.error("Error in removeSubject:", error);
      res.status(500).send({ 
        msg: "Error removing subject", 
        error: error.message,
        details: "Please ensure the subject exists in the teacher's list"
      });
    }
};
  


const calculateVerificationDaysRemaining = (createdAt) => {
    const verificationPeriod = 7; // 7 days verification period
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    
    // Calculate days passed
    const daysPassed = Math.floor((currentDate - createdDate) / (1000 * 60 * 60 * 24));
    
    // Calculate days remaining
    const daysRemaining = Math.max(0, verificationPeriod - daysPassed);
    
    return {
        daysRemaining,
        isExpired: daysRemaining === 0
    };
};

const transformFileData = (file) => {
  // Create a URL-friendly path for the file
  const fileUrl = `/uploads/${file.filename}`;
  
  return {
    id: file._id,
    name: file.originalName,
    type: file.mimeType,
    size: file.size,
    url: fileUrl,
    uploadedAt: file.createdAt
  };
};

const getProfile = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }
      const teacher = await TeacherModel.findById(teacherId)
        .populate('attachments'); // Populate the attachments

      if (!teacher) {
        return res.status(404).send({ msg: "Teacher not found" });
      }

      // Calculate verification status
      const verificationStatus = calculateVerificationDaysRemaining(teacher.createdAt);

      // Transform attachments data
      const transformedAttachments = teacher.attachments.map(transformFileData);

      res.status(200).send({
        msg: "Profile fetched successfully",
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          subjects: teacher.subjects,
          availability: teacher.availability,
          attachments: transformedAttachments,
          isVerified: teacher.isVerified,
          verificationStatus: {
            daysRemaining: verificationStatus.daysRemaining,
            isExpired: verificationStatus.isExpired
          }
        }
      });
    } catch (error) {   
      console.error("Error in getProfile:", error);
      res.status(500).send({
        msg: "Error fetching profile",
        error: error.message,
        details: "Please ensure the teacher ID is valid and exists in the database"
      });
    }
};


const updateProfile = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      const updates = { ...req.body };
  

      delete updates.attachments;
      delete updates.availability;
      delete updates.bookings;
      delete updates.subjects

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
  

      const updatedTeacher = await TeacherModel.findByIdAndUpdate(
        teacherId,
        { $set: updates },
        { new: true },
        "-password, -createdAt, -updatedAt"
      );
  
      res.status(200).send({ msg: "Profile updated", teacher: updatedTeacher });
  
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };
  

const getBookings = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      
      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }

      const teacher = await TeacherModel.findById(teacherId);
      if (!teacher) {
        return res.status(404).send({ msg: "Teacher not found" });
      }

      const bookings = await BookingModel.find({ 
        teacher: teacherId,
        status: "confirmed"
      }).populate("student", "name email")
        .sort({ date: 1 }); // Sort by date ascending
  
      res.status(200).send({ 
        msg: "Bookings fetched successfully", 
        bookings: bookings.map(booking => ({
          id: booking._id,
          subject: booking.subject,
          date: booking.date.toISOString(),
          timeSlot: {
            start: booking.timeSlot.start,
            end: booking.timeSlot.end
          },
          studentName: booking.student?.name || "Unknown",
          studentEmail: booking.student?.email || "N/A",
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
  

const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    // Find the booking
    const booking = await BookingModel.findOne({
      _id: bookingId,
      teacher: userId,
      status: 'pending'
    }).populate('student', 'name email').populate('teacher', 'name email');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found or already confirmed' });
    }

    const maxRetries = 3;
    let retryCount = 0;
    let meetingLink = null;

    while (retryCount < maxRetries) {
      try {
        const bookingDate = new Date(booking.date);
        const [startHours, startMinutes] = booking.timeSlot.start.split(':');
        const [endHours, endMinutes] = booking.timeSlot.end.split(':');

        const startDateTime = new Date(bookingDate);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endDateTime = new Date(bookingDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        const meeting = await createGoogleMeet({
          summary: `Tutoring Session: ${booking.subject}`,
          description: `Tutoring session for ${booking.subject} with ${booking.student.name}`,
          startTime: startDateTime,
          endTime: endDateTime,
          attendees: [booking.teacher.email, booking.student.email]
        });

        if (meeting && meeting.hangoutLink) {
          meetingLink = meeting.hangoutLink;
          break;
        }
      } catch (error) {
        retryCount++;
        console.error(`Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount === maxRetries) {
          console.error('Failed to create Google Meet meeting after all retries');
          meetingLink = null;
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (meetingLink) {
      booking.status = 'confirmed';
      booking.meetingLink = meetingLink;
      await booking.save();
    }

    try {
      // Send email to student with HTML content
      await sendEmail({
        to: booking.student.email,
        subject: 'Booking Confirmed',
        html: `
          <h2>Booking Confirmed!</h2>
          <p>Your booking for <strong>${booking.subject}</strong> has been confirmed.</p>
          ${meetingLink ? `
            <p>Join the meeting at: <a href="${meetingLink}">${meetingLink}</a></p>
          ` : ''}
          <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
          <p>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</p>
          <p>Thank you for using TutorConnect!</p>
        `
      });

      // Send email to teacher with HTML content
      await sendEmail({
        to: booking.teacher.email,
        subject: 'Booking Confirmed',
        html: `
          <h2>Booking Confirmed!</h2>
          <p>You have confirmed a booking for <strong>${booking.subject}</strong>.</p>
          ${meetingLink ? `
            <p>Join the meeting at: <a href="${meetingLink}">${meetingLink}</a></p>
          ` : ''}
          <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
          <p>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</p>
          <p>Student: ${booking.student.name}</p>
          <p>Thank you for using TutorConnect!</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
      // Continue even if email sending fails
    }

    // Return updated booking
    res.json({
      msg: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        subject: booking.subject,
        date: booking.date.toISOString(),
        timeSlot: booking.timeSlot,
        studentName: booking.student?.name || "Unknown",
        studentEmail: booking.student?.email || "N/A",
        status: booking.status,
        meetingLink: booking.meetingLink
      }
    });

  } catch (error) {
    console.error('Error in confirmBooking:', error);
    res.status(500).json({ msg: 'Error confirming booking' });
  }
};

const declineBooking = async (req, res) => {
  try {
    const teacherId = req.body.userId;
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).send({ 
        msg: "Booking ID is required" 
      });
    }

    // Verify booking exists and belongs to teacher
    const booking = await BookingModel.findOne({ 
      _id: bookingId,
      teacher: teacherId,
      status: "pending" // Can only decline pending bookings
    });

    if (!booking) {
      return res.status(404).send({ 
        msg: "Booking not found or not authorized to decline" 
      });
    }

    // Delete the booking instead of updating status
    const deletedBooking = await BookingModel.findByIdAndDelete(bookingId);

    res.status(200).send({ 
      msg: "Booking declined and removed",
      booking: {
        id: deletedBooking._id,
        subject: deletedBooking.subject,
        date: deletedBooking.date.toISOString(),
        timeSlot: deletedBooking.timeSlot,
        status: "declined"
      }
    });
  } catch (error) {
    console.error("Error in declineBooking:", error);
    if (error.name === 'CastError') {
      return res.status(400).send({ 
        msg: "Invalid booking ID format" 
      });
    }
    res.status(500).send({ msg: error.message });
  }
};


const cancelBooking = async (req, res) => {
  try {
    const teacherId = req.body.userId;
    const { bookingId } = req.params;

    // Verify booking exists and belongs to teacher
    const booking = await BookingModel.findOne({ 
      _id: bookingId,
      teacher: teacherId,
      status: "confirmed"
    }).populate('student', 'name email').populate('teacher', 'name email');

    if (!booking) {
      return res.status(404).send({ 
        msg: "Booking not found or not authorized to cancel" 
      });
    }

    if (booking.eventId) {
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
    ).populate("student", "name email").populate("teacher", "name email");

    try {
      // Send email to student
      await sendEmail({
        to: booking.student.email,
        subject: 'Booking Cancelled',
        html: `
          <h2>Booking Cancelled</h2>
          <p>Your booking for <strong>${booking.subject}</strong> has been cancelled by the teacher.</p>
          <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
          <p>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</p>
          <p>Teacher: ${booking.teacher.name}</p>
          <p>If you have any questions, please contact your teacher.</p>
          <p>Thank you for using TutorConnect!</p>
        `
      });

      // Send email to teacher
      await sendEmail({
        to: booking.teacher.email,
        subject: 'Booking Cancelled',
        html: `
          <h2>Booking Cancelled</h2>
          <p>You have cancelled the booking for <strong>${booking.subject}</strong>.</p>
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

    

    res.status(200).send({ 
      msg: "Booking cancelled",
      booking: {
        id: cancelledBooking._id,
        subject: cancelledBooking.subject,
        date: cancelledBooking.date.toISOString(),
        timeSlot: cancelledBooking.timeSlot,
        studentName: cancelledBooking.student?.name || "Unknown",
        studentEmail: cancelledBooking.student?.email || "N/A",
        status: cancelledBooking.status
      }
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const completeBooking = async (req, res) => {
  try {
    const teacherId = req.body.userId;
    const { bookingId } = req.params;

    // Verify booking exists and belongs to teacher
    const booking = await BookingModel.findOne({ 
      _id: bookingId,
      teacher: teacherId,
      status: "confirmed" 
    });

    if (!booking) {
      return res.status(404).send({ 
        msg: "Booking not found or not authorized to complete" 
      });
    }
    
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
        meetingLink: null,
        eventId: null
      },
      { new: true }
    ).populate("student", "name email");

    res.status(200).send({ 
      msg: "Booking marked as completed",
      booking: {
        id: completedBooking._id,
        subject: completedBooking.subject,
        date: completedBooking.date.toISOString(),
        timeSlot: completedBooking.timeSlot,
        studentName: completedBooking.student?.name || "Unknown",
        studentEmail: completedBooking.student?.email || "N/A",
        status: completedBooking.status
      }
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const pendingBookings = async (req, res) => {
  try {
    const teacherId = req.body.userId;
    
    if (!teacherId) {
      return res.status(400).send({ msg: "Teacher ID is required" });
    }

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return res.status(404).send({ msg: "Teacher not found" });
    }

    const bookings = await BookingModel.find({ 
      teacher: teacherId, 
      status: "pending" 
    })
    .populate("student", "name email")
    .sort({ date: 1 }); // Sort by date ascending

    if (!bookings.length) {
      return res.status(404).send({ msg: "No pending bookings found" });
    }

    const formatted = bookings.map((booking) => ({
      _id: booking._id.toString(), // Ensure _id is a string
      id: booking._id.toString(), // Add id field for consistency
      subject: booking.subject,
      date: booking.date.toISOString(),
      timeSlot: {
        start: booking.timeSlot.start,
        end: booking.timeSlot.end
      },
      studentName: booking.student?.name || "Unknown",
      studentEmail: booking.student?.email || "N/A",
      status: booking.status
    }));

    res.status(200).send({ 
      msg: "Pending bookings fetched successfully", 
      bookings: formatted 
    });
  } catch (error) {
    console.error("Error in pendingBookings:", error);
    res.status(500).send({ msg: error.message });
  }
};


const addResource = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      const { title, description, subject, link } = req.body;

      // Validate required fields
      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }
      if (!title || !link) {
        return res.status(400).send({ msg: "Title and link are required" });
      }

      // Verify teacher exists
      const teacher = await TeacherModel.findById(teacherId);
      if (!teacher) {
        return res.status(404).send({ msg: "Teacher not found" });
      }

      const newResource = new ResourceModel({
        title,
        description,
        subject,
        link,
        uploadedBy: teacherId
      });

      await newResource.save();
      console.log("Resource added:", newResource);

      res.status(201).send({ 
        msg: "Resource added successfully", 
        resource: {
          id: newResource._id,
          title: newResource.title,
          description: newResource.description,
          subject: newResource.subject,
          link: newResource.link,
          uploadedBy: newResource.uploadedBy
        }
      });
    } catch (error) {
      console.error("Error in addResource:", error);
      res.status(500).send({ msg: "Error adding resource", error: error.message });
    }
};

const deleteResource = async (req, res) => {
    try {
      const teacherId = req.body.userId;
      const resourceId = req.params.resourceId;

      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }
      if (!resourceId) {
        return res.status(400).send({ msg: "Resource ID is required" });
      }

      const resource = await ResourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).send({ msg: "Resource not found" });
      }

      if (resource.uploadedBy.toString() !== teacherId) {
        return res.status(403).send({ msg: "Not authorized to delete this resource" });
      }

      await ResourceModel.findByIdAndDelete(resourceId);
      res.status(200).send({ msg: "Resource deleted successfully" });
    } catch (error) {
      console.error("Error in deleteResource:", error);
      res.status(500).send({ msg: "Error deleting resource", error: error.message });
    }
};

const getResources = async (req, res) => {
    try {
      const teacherId = req.body.userId;  // Changed from req.params.userId to req.body.userId

      if (!teacherId) {
        return res.status(400).send({ msg: "Teacher ID is required" });
      }

      // Verify teacher exists
      const teacher = await TeacherModel.findById(teacherId);
      if (!teacher) {
        return res.status(404).send({ msg: "Teacher not found" });
      }

      const resources = await ResourceModel.find({ uploadedBy: teacherId });
      
      // Format the response
      const formattedResources = resources.map(resource => ({
        id: resource._id,
        title: resource.title,
        description: resource.description,
        subject: resource.subject,
        link: resource.link,
        uploadedBy: resource.uploadedBy,
        createdAt: resource.createdAt
      }));

      res.status(200).send({ 
        msg: "Resources fetched successfully", 
        count: formattedResources.length,
        resources: formattedResources 
      });
    } catch (error) {
      console.error("Error in getResources:", error);
      res.status(500).send({ msg: "Error fetching resources", error: error.message });
    }
};

module.exports = {
  getProfile,
  addAvailability,
  removeAvailability,
  addAttachments,
  removeAttachment,
  addSubject,
  removeSubject,
  updateProfile,
  getBookings,
  confirmBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
  pendingBookings,
  addResource,
  deleteResource,
  getResources
};
