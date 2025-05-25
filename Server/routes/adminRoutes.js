const express = require("express");
const {
  // registerAdmin,
  getAdmins,
  getAllTeachers,
  getAllStudents,
  searchTeachers,
  searchStudents,
  banUserById,
  unbanUserById,
  verifyTeacher,
  removeResource,
  cancelBooking,
  getUserStats,
  viewAllBookings,
  filterBookings,
  getUnverifiedTeachers,
  deleteUser
} = require("../controllers/adminController");
const { getResources } = require("../controllers/studentController");

const { auth } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/roleMiddleware");


const adminRouter = express.Router();

adminRouter.use(auth);
adminRouter.use(isAdmin);

// adminRouter.post("/register", registerAdmin);
adminRouter.get("/admins", getAdmins); // checked!
adminRouter.get("/teachers", getAllTeachers); // checked!
adminRouter.get("/teachers/search",  searchTeachers); // checked!
adminRouter.patch("/teachers/:userId/verify",  verifyTeacher); // checked!

adminRouter.get("/students",  getAllStudents); // checked!
adminRouter.get("/students/search",  searchStudents); // checked!

adminRouter.patch("/users/:role/:userId/ban",  banUserById); // checked!
adminRouter.patch("/users/:role/:userId/unban",  unbanUserById); // checked!
adminRouter.delete("/users/:userId", deleteUser); // Delete user route

adminRouter.get("/resources",  getResources);
adminRouter.delete("/resources/:userId",  removeResource);

adminRouter.get("/bookings",  viewAllBookings);
adminRouter.get("/bookings/filter",  filterBookings);
adminRouter.patch("/bookings/:userId/cancel",  cancelBooking);

adminRouter.get("/stats",  getUserStats);
adminRouter.get("/unverified-teachers",  getUnverifiedTeachers);

module.exports = { adminRouter };


