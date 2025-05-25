const express = require("express");
const {
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
} = require("../controllers/studentController");
const { auth } = require("../middlewares/authMiddleware");
const { isStudent } = require("../middlewares/roleMiddleware");

const StudentRouter = express.Router();

// Dashboard route
StudentRouter.get("/dashboard", auth, isStudent, getDashboard);

// Profile routes
StudentRouter.get("/profile", auth, isStudent, getStudentProfile);
StudentRouter.patch("/profile", auth, isStudent, updateStudentProfile);

// Teacher search and booking routes
StudentRouter.get("/teachers", auth, isStudent, getTeachers); //checked!!
StudentRouter.get("/teachers/search", auth, isStudent, searchTeachers); //checked!!

StudentRouter.get("/teachers/:userId/slots", auth, isStudent, getAvailableSlots); //checked!

StudentRouter.post("/bookings", auth, isStudent, bookTeacher); //checked!!

StudentRouter.get("/bookings", auth, isStudent, getBookings);


StudentRouter.patch("/bookings/:bookingId/cancel", auth, isStudent, cancelBooking);
StudentRouter.patch("/bookings/:bookingId/complete", auth, isStudent, completeBooking);

StudentRouter.get("/resources", auth, isStudent, getResources); //checked!!

module.exports = { StudentRouter };