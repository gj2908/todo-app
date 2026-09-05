const Subject = require("../models/Subject");

// Every subject the user owns or is a member of, each tagged with the
// user's role on it. Used to widen todo/subject queries beyond strict
// ownership once a subject is shared.
const getAccessibleSubjects = async (userId) => {
  const subjects = await Subject.find({
    $or: [{ user: userId }, { "members.user": userId }],
  }).lean();

  return subjects.map((s) => {
    const isOwner = String(s.user) === String(userId);
    const membership = s.members?.find((m) => String(m.user) === String(userId));
    return { ...s, role: isOwner ? "owner" : membership?.role || "viewer" };
  });
};

const getAccessibleSubjectIds = async (userId) => {
  const subjects = await getAccessibleSubjects(userId);
  return subjects.map((s) => s._id);
};

// Whether userId is the owner or a member (any role) of a subject document
// (as returned by Subject.findOne/find - has .user and .members).
const isSubjectMember = (subject, userId) => {
  if (!subject) return false;
  if (String(subject.user) === String(userId)) return true;
  return !!subject.members?.some((m) => String(m.user) === String(userId));
};

module.exports = { getAccessibleSubjects, getAccessibleSubjectIds, isSubjectMember };
