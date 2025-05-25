const { StudentModel } = require("../models/StudentModel");
const { TeacherModel } = require("../models/TeacherModel");
const { BookingModel } = require("../models/BookingModel");
const { ResourceModel } = require("../models/ResourceModel"); 
const { AdminModel } = require("../models/AdminModel"); 
// const bcrypt = require("bcrypt");

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

const getAdmins = async (req, res) => {
  try { 
    const admins = await TeacherModel.find({ role: "admin" }, '-__v');
    if (!admins) return res.status(404).send({ msg: "No admins found" });
    res.status(200).send({ admins });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const teachers = await TeacherModel.find({}, "-password, -__v")
      .populate('attachments');
    
    // Add verification status and transform attachments for each teacher
    const teachersWithVerification = teachers.map(teacher => ({
      ...teacher.toObject(),
      attachments: teacher.attachments.map(transformFileData),
      verificationStatus: calculateVerificationDaysRemaining(teacher.createdAt)
    }));

    res.status(200).send({ teachers: teachersWithVerification });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const searchTeachers = async (req, res) => {
    try {
      const { name, email, banned, verified } = req.query;
      const query = {};
  
      if (name) query.name = { $regex: name, $options: "i" };
      if (email) query.email = { $regex: email, $options: "i" };
      if (banned !== undefined) query.banned = banned === "true";
      if (verified !== undefined) query.verified = verified === "true";

      const teachers = await TeacherModel.find(query)
        .select("-password -__v")
        .populate('attachments');
      
      // Add verification status and transform attachments for each teacher
      const teachersWithVerification = teachers.map(teacher => ({
        ...teacher.toObject(),
        attachments: teacher.attachments.map(transformFileData),
        verificationStatus: calculateVerificationDaysRemaining(teacher.createdAt)
      }));

      res.status(200).send({ teachers: teachersWithVerification });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };
  

  const searchStudents = async (req, res) => {
    try {
      const { name, email, banned } = req.query;
      const query = {};
  
      if (name) query.name = { $regex: name, $options: "i" };
      if (email) query.email = { $regex: email, $options: "i" };
      if (banned !== undefined) query.banned = banned === "true";
  
      const students = await StudentModel.find(query).select("-password -__v");
      res.status(200).send({ students });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };
  
const getAllStudents = async (req, res) => {
  try {
    const students = await StudentModel.find({}, "-password -__v");
    res.status(200).send({ students });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const banUserById = async (req, res) => {
  try {
    const { userId, role } = req.params;

    let userModel = role === "teacher" ? TeacherModel : StudentModel;
    const updatedUser = await userModel.findByIdAndUpdate(userId, { banned: true }, { new: true }, );

    if (!updatedUser) return res.status(404).send({ msg: "User not found" });
    res.status(200).send({ msg: `${role} banned successfully`, user: updatedUser });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const unbanUserById = async (req, res) => {
    try {
      const { userId, role } = req.params;
      if (!["student", "teacher"].includes(role)) return res.status(400).send({ msg: "Invalid role" });
  
      const Model = role === "student" ? StudentModel : TeacherModel;
      const user = await Model.findByIdAndUpdate(userId, { banned: false }, { new: true });
  
      if (!user) return res.status(404).send({ msg: "User not found" });
  
      res.status(200).send({ msg: "User unbanned", user });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };

const getUnverifiedTeachers = async (req, res) => {
  try {
    const teachers = await TeacherModel.find({ verified: false }, "-password -__v")
      .populate('attachments');
    
    // Add verification status and transform attachments for each teacher
    const teachersWithVerification = teachers.map(teacher => ({
      ...teacher.toObject(),
      attachments: teacher.attachments.map(transformFileData),
      verificationStatus: calculateVerificationDaysRemaining(teacher.createdAt)
    }));

    res.status(200).send({ teachers: teachersWithVerification });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};

const verifyTeacher = async (req, res) => {
  try {
    const { userId } = req.params;
    const updated = await TeacherModel.findByIdAndUpdate(userId, { verified: true }, { new: true });
    if (!updated) return res.status(404).send({ msg: "Teacher not found" });

    res.status(200).send({ msg: "Teacher verified", teacher: updated });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const removeResource = async (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = await ResourceModel.findByIdAndDelete(userId);
    if (!deleted) return res.status(404).send({ msg: "Resource not found" });

    res.status(200).send({ msg: "Resource removed" });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const cancelBooking = async (req, res) => {
  try {
    const { userId } = req.params;
    const booking = await BookingModel.findByIdAndUpdate(userId, { status: "cancelled" }, { new: true });
    if (!booking) return res.status(404).send({ msg: "Booking not found" });

    res.status(200).send({ msg: "Booking cancelled", booking });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};



const getUserStats = async (req, res) => {
  try {
    const studentCount = await StudentModel.countDocuments();
    const teacherCount = await TeacherModel.countDocuments();
    const bookingCount = await BookingModel.countDocuments();
    const activeTeachers = await TeacherModel.countDocuments({ verified: true, banned: false });
    const bannedUsers = await StudentModel.countDocuments({ banned: true }) +
                        await TeacherModel.countDocuments({ banned: true });

    res.status(200).send({
      stats: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        activeTeachers,
        totalBookings: bookingCount,
        bannedUsers,
      },
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
};


const viewAllBookings = async (req, res) => {
    try {
      const bookings = await BookingModel.find({}, "-__v")
        .sort({ createdAt: -1 });
  
      res.status(200).send({ bookings });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };


  const filterBookings = async (req, res) => {
    try {
      const { status, date, userId } = req.query;
      const query = {};
  
      if (status) query.status = status;
      if (date) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        query.date = { $gte: dayStart, $lt: dayEnd };
      }
      if (userId) query.teacher = userId;
  
      const bookings = await BookingModel.find({query, }, "-__v")
        .populate("teacher", "name email")
        .populate("student", "name email")
        .sort({ date: -1 });
  
      res.status(200).send({ bookings });
    } catch (error) {
      res.status(500).send({ msg: error.message });
    }
  };
  

const deleteUser = async (req, res) => {
  try {
    const { userId, role } = req.params;
    
    // Validate role
    if (!["student", "teacher"].includes(role)) {
      return res.status(400).send({ msg: "Invalid role. Must be 'student' or 'teacher'" });
    }

    // Choose the correct model based on role
    const Model = role === "student" ? StudentModel : "teacher" ? TeacherModel : AdminModel;

    // First check if user exists
    const user = await Model.findById(userId);
    if (!user) {
      return res.status(404).send({ msg: `${role} not found` });
    }

    // If it's a teacher, also delete their resources and bookings
    if (role === "teacher") {
      // Delete teacher's resources
      await ResourceModel.deleteMany({ uploadedBy: userId });
      await FileModel.deleteMany({ uploadedBy: userId });
      
      // Update bookings to cancelled status
      await BookingModel.updateMany(
        { teacher: userId, status: { $in: ["pending", "confirmed"] } },
        { status: "cancelled" }
      );
    }

    // Delete the user
    await Model.findByIdAndDelete(userId);

    res.status(200).send({ 
      msg: `${role} deleted successfully`,
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).send({ 
      msg: "Error deleting user",
      error: error.message 
    });
  }
};

module.exports = {
  getAdmins,
  getAllTeachers,
  searchTeachers,
  searchStudents,
  getAllStudents,
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
};