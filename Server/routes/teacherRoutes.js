const express = require("express");
const {
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
  cancelBooking,
  completeBooking,
  addResource,
  deleteResource,
  getResources,
  pendingBookings,
  declineBooking
} = require("../controllers/teacherController");
const { auth } = require("../middlewares/authMiddleware");
const { isTeacher } = require("../middlewares/roleMiddleware");
const { handleFileUpload } = require('../middlewares/uploadMiddleware');

const TeacherRouter = express.Router();


TeacherRouter.get("/profile", auth, isTeacher, getProfile)
TeacherRouter.patch("/profile", auth, isTeacher, updateProfile); 

TeacherRouter.patch("/availability/add",auth,isTeacher, addAvailability); 

TeacherRouter.patch("/availability/remove", auth, isTeacher, removeAvailability); 

TeacherRouter.patch("/attachments/add", handleFileUpload, addAttachments)
TeacherRouter.patch("/attachments/remove/:fileId", auth, isTeacher, removeAttachment)

TeacherRouter.patch("/subjects/add", auth, isTeacher, addSubject); 
TeacherRouter.patch("/subjects/remove", auth, isTeacher, removeSubject); 

// Booking management
TeacherRouter.get("/bookings", auth, isTeacher, getBookings);
TeacherRouter.get("/bookings/pending", auth, isTeacher, pendingBookings); 


TeacherRouter.patch("/bookings/:bookingId/confirm", auth, isTeacher, confirmBooking);
TeacherRouter.patch("/bookings/:bookingId/cancel", auth, isTeacher, cancelBooking);
TeacherRouter.patch("/bookings/:bookingId/complete", auth, isTeacher, completeBooking);
TeacherRouter.delete("/bookings/:bookingId/decline", auth, isTeacher, declineBooking);


// Resource management
TeacherRouter.post("/resources/add", auth, isTeacher, addResource); 
TeacherRouter.delete("/resources/:resourceId", auth, isTeacher, deleteResource); 
TeacherRouter.get("/resources", auth, isTeacher, getResources); 

module.exports = { TeacherRouter }; 