const authorize = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role check'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};


const isAdmin = authorize('admin');
const isTeacher = authorize('teacher');
const isStudent = authorize('student');
const isAdminOrTeacher = authorize('admin', 'teacher');

module.exports = {
  authorize,
  isAdmin,
  isTeacher,
  isStudent,
  isAdminOrTeacher
}; 