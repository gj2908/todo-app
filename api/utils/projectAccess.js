const Project = require("../models/Project");

// Every project the user owns or is a member of, each tagged with the
// user's role on it. Used to widen todo/project queries beyond strict
// ownership once a project is shared.
const getAccessibleProjects = async (userId) => {
  const projects = await Project.find({
    $or: [{ user: userId }, { "members.user": userId }],
  }).lean();

  return projects.map((p) => {
    const isOwner = String(p.user) === String(userId);
    const membership = p.members?.find((m) => String(m.user) === String(userId));
    return { ...p, role: isOwner ? "owner" : membership?.role || "viewer" };
  });
};

const getAccessibleProjectIds = async (userId) => {
  const projects = await getAccessibleProjects(userId);
  return projects.map((p) => p._id);
};

module.exports = { getAccessibleProjects, getAccessibleProjectIds };
