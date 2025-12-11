import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProjectCard from "../components/ProjectCard";
import axios from "axios";
import "../Dashboard.css";

const DashboardHome = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [showChangeOwner, setShowChangeOwner] = useState(false);
  const [ownerEmailInput, setOwnerEmailInput] = useState("");
  const [newOwner, setOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [memberOptionsForOwner, setMemberOptionsForOwner] = useState([]); // [{id, name, email}]

  // Fetch projects + users (for owner names)
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) {
        setProjects([]);
        setLoading(false);
        return;
      }
      try {
        const [projRes, usersRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/projects/${user.id}`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/users`)
        ]);

        const users = Array.isArray(usersRes.data) ? usersRes.data : [];
        const uById = users.reduce((acc, u) => {
          acc[u.id] = { name: u.name, email: u.email };
          return acc;
        }, {});

        const transformed = (projRes.data || []).map((p) => ({
          ...p,
          // attach ownerName/email if we can
          ownerName: uById[p.owner]?.name,
          ownerEmail: uById[p.owner]?.email,
          // memberCount directly from members list length (real data)
          memberCount: Array.isArray(p.members) ? p.members.length : 1,
          // keep createdAt as-is (server provides iso)
        }));

        setProjects(transformed);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user?.id]);

  // Open "Create Project" modal from navbar link /?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreateProject(true);
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams, navigate, location.pathname]);

  const refreshProjectsForUser = async () => {
    const [projRes, usersRes] = await Promise.all([
      axios.get(`${process.env.REACT_APP_API_URL}/api/projects/${user.id}`),
      axios.get(`${process.env.REACT_APP_API_URL}/api/users`)
    ]);
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    const uById = users.reduce((acc, u) => {
      acc[u.id] = { name: u.name, email: u.email };
      return acc;
    }, {});
    const transformed = (projRes.data || []).map((p) => ({
      ...p,
      ownerName: uById[p.owner]?.name,
      ownerEmail: uById[p.owner]?.email,
      memberCount: Array.isArray(p.members) ? p.members.length : 1,
    }));
    setProjects(transformed);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user?.id) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/projects`, {
        name: newProjectName,
        createdBy: user.id,
        description: "",
        status: "Active",
      });

      await refreshProjectsForUser();
      setNewProjectName("");
      setShowCreateProject(false);
      window.dispatchEvent(new Event("projects:refresh"));
    } catch (error) {
      console.error("Failed to create project:", error);
      alert(`Failed to create project: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSelectProject = (project) => setSelectedProject(project);

  const handleEditProject = (project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setShowEditProject(true);
  };

const handleChangeOwner = async (project) => {
  if (!user?.id) return;
  try {
    // fetch project to get member IDs
    const pres = await axios.get(`${process.env.REACT_APP_API_URL}/api/project/${project.id}`);
    const memberIds = pres.data?.members || [];

    // fetch all users to map IDs -> names/emails
    const ures = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
    const allUsers = Array.isArray(ures.data) ? ures.data : [];

    const options = allUsers
      .filter(u => memberIds.includes(String(u.id)))
      .map(u => ({
        id: String(u.id),
        name: u.name || u.email,
        email: u.email
      }));

    setMemberOptionsForOwner(options);
    setEditingProject(project);

    // if existing ownerEmail is still in members, pre-select; else empty
    const preselected = options.find(o => o.email === project.ownerEmail)?.email || "";
    setOwnerEmailInput(preselected);

    setShowChangeOwner(true);
  } catch (err) {
    console.error("Failed to load project members for change owner:", err);
    alert("Could not load members for this project.");
  }
};

  const handleUpdateOwner = async (e) => {
    e?.preventDefault?.();
    if (!editingProject?.id || !ownerEmailInput.trim() || !user?.id) return;

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${editingProject.id}/owner`,
        { ownerEmail: ownerEmailInput.trim() },
        { headers: { "X-User-Id": user.id } }
      );

      await refreshProjectsForUser();
      setShowChangeOwner(false);
      setEditingProject(null);
      setOwner("");
      setOwnerEmailInput("");
      window.dispatchEvent(new Event("projects:refresh"));
    } catch (error) {
      console.error("Failed to change owner:", error);
      const status = error.response?.status;
      const msg = error.response?.data?.error || error.message;
      if (status === 403) {
        alert("Only the current project owner can change the owner.");
      } else if (status === 404) {
        alert("User not found or project not found.");
      } else if (status === 304) {
        alert("User already owns the project.");
      } else {
        alert(`Failed to change owner: ${msg}`);
      }
    }
  };

  const handleDeleteProject = async (project) => {
    if (!user?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/projects/${project.id}`,
        { headers: { "X-User-Id": user.id } }
      );
      await refreshProjectsForUser();
      window.dispatchEvent(new Event("projects:refresh"));
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert(`Failed to delete project: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !editingProject?.id || !user?.id) return;

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${editingProject.id}/name`,
        { projectName: newProjectName },
        { headers: { "X-User-Id": user.id } }
      );

      await refreshProjectsForUser();
      setNewProjectName("");
      setShowEditProject(false);
      setEditingProject(null);
      window.dispatchEvent(new Event("projects:refresh"));
    } catch (error) {
      console.error("Failed to update project:", error);
      alert(`Failed to update project: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading your projects...</p>
        </div>
      </div>
    );
  }

  const activeCount = projects.filter((p) => (p.status || '').toLowerCase() === 'active').length;
  const completedCount = projects.filter((p) => (p.status || '').toLowerCase() === 'completed').length;

  return (
    <React.Fragment>
      <div className="flex-grow-1 container mt-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1">Dashboard</h1>
            <p className="text-muted mb-0">
              Welcome back, {user?.firstName}! Here's what's happening with your projects.
            </p>
          </div>
          <div className="d-flex align-items-center gap-3">
            {/* View Mode Toggle */}
            <div className="btn-group" role="group">
              <button
                className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("grid")}
              >
                <i className="bi bi-grid-3x3"></i>
              </button>
              <button
                className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("list")}
              >
                <i className="bi bi-list"></i>
              </button>
            </div>

            {/* Create Project Button */}
            <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
              <i className="bi bi-plus me-2"></i>
              New Project
            </button>
          </div>
        </div>

        {/* Stats Cards (Active / Completed) */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card border-0 bg-info text-white">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title mb-1">Total Projects</h6>
                  <h3 className="mb-0">{projects.length}</h3>
                </div>
                <i className="bi bi-folder fs-1 opacity-50"></i>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 bg-primary text-white">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title mb-1">Active</h6>
                  <h3 className="mb-0">{activeCount}</h3>
                </div>
                <i className="bi bi-play-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 bg-success text-white">
              <div className="card-body d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="card-title mb-1">Completed</h6>
                  <h3 className="mb-0">{completedCount}</h3>
                </div>
                <i className="bi bi-check-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom-0">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Your Projects</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="card-body p-4">
            {projects.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-folder-x fs-1 text-muted mb-3"></i>
                <h5 className="text-muted">No projects yet</h5>
                <p className="text-muted mb-4">Create your first project to get started with TeamWorks.</p>
                <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
                  <i className="bi bi-plus me-2"></i>
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "row" : "list-group"}>
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelectProject={handleSelectProject}
                    onEditProject={handleEditProject}
                    onChangeOwner={handleChangeOwner}
                    onDeleteProject={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Project</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateProject(false)}></button>
              </div>
              <form onSubmit={handleCreateProject}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Project Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description (Optional)</label>
                    <textarea className="form-control" rows="3" placeholder="Describe your project..."></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateProject(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Create Project</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProject && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Project</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
                    setNewProjectName("");
                  }}
                ></button>
              </div>
              <form onSubmit={handleUpdateProject}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Project Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditProject(false);
                      setEditingProject(null);
                      setNewProjectName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Update Project</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Owner Modal */}
      {showChangeOwner && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Project Owner</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowChangeOwner(false);
                    setEditingProject(null);
                    setOwner("");
                    setOwnerEmailInput("");
                  }}
                ></button>
              </div>
              <form onSubmit={handleUpdateOwner}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">New Owner (must be a member)</label>
                    <select
                      className="form-select"
                      value={ownerEmailInput}
                      onChange={(e) => setOwnerEmailInput(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select a member</option>
                      {memberOptionsForOwner.map(m => (
                        <option key={m.id} value={m.email}>{m.name} ({m.email})</option>
                      ))}
                    </select>
                    <div className="form-text">
                      Only existing project members can be selected as the new owner.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowChangeOwner(false);
                      setEditingProject(null);
                      setOwner("");
                      setOwnerEmailInput("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Change Owner</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default DashboardHome;
