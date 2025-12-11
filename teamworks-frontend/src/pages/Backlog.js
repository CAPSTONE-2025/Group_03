import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

import AddTaskForm from "../components/AddTaskForm";
import TaskForm from "../components/TaskForm";
import EditTaskForm from "../components/EditTaskForm";
import { AuthContext } from "../contexts/AuthContext";

function Backlog() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // ---- member options + lookup for display ----
  const [memberOptions, setMemberOptions] = useState([]); // [{id,email,name}]
  const [memberLookup, setMemberLookup] = useState({});   // { userId: "Name or email" }

  // ✅ Set the caller header for Flask guards (owner/access checks)
  useEffect(() => {
    if (user?.id) {
      axios.defaults.headers.common["X-User-Id"] = user.id;
    } else {
      delete axios.defaults.headers.common["X-User-Id"];
    }
  }, [user]);

  // ---- state ----
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [projectStatus, setProjectStatus] = useState("Active");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- invite modal state ----
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // ---- ownership & membership ----
  const [ownerId, setOwnerId] = useState(null);
  const [memberIds, setMemberIds] = useState([]);

  // ---- dropdown selected member to remove ----
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState("");

  // ---- leave project modal ----
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");

  const PROJECT_BASE = projectId
    ? `${process.env.REACT_APP_API_URL}/api/projects/${projectId}`
    : null;

  const API_URL = PROJECT_BASE
    ? `${PROJECT_BASE}/backlog`
    : null;

  const openInvite = () => {
    setInviteEmail("");
    setInviteError("");
    setInviteSuccess("");
    setShowInvite(true);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setInviteError("");
    setInviteSuccess("");
  };

  const submitInvite = async (e) => {
    e?.preventDefault?.();
    const trimmed = (inviteEmail || "").trim().toLowerCase();
    setInviteError("");
    setInviteSuccess("");

    if (!trimmed || !trimmed.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/invite`,
        { emails: [trimmed] }
      );
      setInviteSuccess(`Invitation sent to ${trimmed}.`);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send invite.";
      setInviteError(msg);
    }
  };

  // -------------------- EFFECTS --------------------
  // Project name + members + current status
  useEffect(() => {
    if (!projectId) return;

    (async () => {
      try {
        const pres = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/project/${projectId}`
        );
        setProjectName(pres.data.name);
        setProjectStatus(pres.data.status || "Active");

        const memberIdsFromRes = pres.data.members || [];
        setMemberIds(memberIdsFromRes);
        setOwnerId(pres.data.owner || null);

        const ures = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
        const allUsers = Array.isArray(ures.data) ? ures.data : [];
        const onlyMembers = allUsers.filter((u) =>
          memberIdsFromRes.includes(String(u.id))
        );
        setMemberOptions(onlyMembers);

        const lookup = {};
        for (const u of onlyMembers) lookup[String(u.id)] = u.name || u.email;
        setMemberLookup(lookup);
      } catch (err) {
        // If removed or no access, redirect away
        if (err.response?.status === 403 || err.response?.status === 404) {
          alert("You no longer have access to this project.");
          navigate("/", { replace: true });
          return;
        }
        setProjectName("Unknown Project");
      }
    })();
  }, [projectId, navigate]);

  // Tasks
  useEffect(() => {
    if (!projectId || !API_URL) return;

    const fetchTasks = async () => {
      try {
        const response = await axios.get(API_URL);
        const payload = Array.isArray(response.data) ? response.data : [];
        setTasks(
          payload.map((task) => ({
            ...task,
            progress: Number(task.progress ?? 0),
            dependencies: Array.isArray(task.dependencies)
              ? task.dependencies
              : [],
          }))
        );
      } catch (err) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          alert("You no longer have access to this project.");
          navigate("/", { replace: true });
          return;
        }
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, API_URL, navigate]);

  if (!projectId) {
    return <div>No project selected. Please go back to your projects.</div>;
  }

  // membership helpers
  const isOwner =
    ownerId && user?.id && String(ownerId) === String(user.id);

  const isMember =
    user?.id &&
    memberIds.some((id) => String(id) === String(user.id));

  // -------------------- HANDLERS --------------------
  const handleAddTask = async (newTask) => {
    try {
      const response = await axios.post(API_URL, newTask);
      setTasks([
        ...tasks,
        {
          ...newTask,
          id: response.data.id,
          progress: Number(newTask.progress ?? 0),
          dependencies: [],
        },
      ]);
      setShowForm(false);
    } catch (err) {
      setError(err);
    }
  };

  const handleRowClick = async (task) => {
    setSelectedTask(task);
    setShowForm(false);
    setShowTaskForm(true);
    setIsEditing(false);
    setSelectedTaskId(null);

    try {
      const response = await axios.get(`${API_URL}/${task.id}/comments`);
      setComments(response.data);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTaskId((prevId) => (prevId === taskId ? null : taskId));
  };

  const handleEditTask = async (updatedTask) => {
    try {
      await axios.put(`${API_URL}/${updatedTask.id}`, updatedTask);
      setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setSelectedTask(updatedTask);
      setIsEditing(false);
    } catch (err) {
      setError(err);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskId) return alert("Select a task to delete.");

    try {
      await axios.delete(`${API_URL}/${selectedTaskId}`);
      setTasks(tasks.filter((t) => t.id !== selectedTaskId));
      setSelectedTaskId(null);
    } catch (err) {
      setError(err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(
        `${API_URL}/${selectedTask.id}/comments`,
        {
          text: newComment,
          author: user?.fullName || "Anonymous",
        }
      );
      setComments([...comments, response.data]);
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err.response?.data || err.message);
      alert("Failed to add comment.");
    }
  };

  // 🔁 Project status change (Active / Completed)
  const handleProjectStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/status`,
        { status: newStatus }
      );
      setProjectStatus(newStatus);
    } catch (err) {
      console.error("Failed to update project status:", err);
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  // 🔁 Leave project
  const handleLeaveProject = async () => {
    if (!PROJECT_BASE) return;

    try {
      const res = await axios.delete(`${PROJECT_BASE}/members/self`);
      const msg = res.data?.message || "You have left the project.";
      setLeaveMessage(msg);

      // Refresh navbar projects
      window.dispatchEvent(new Event("projects:refresh"));

      // Short delay then redirect
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 800);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to leave project.");
    }
  };

  // 🔁 Owner removes member (using dropdown)
  const handleRemoveMember = async () => {
    if (!PROJECT_BASE) return;
    if (!selectedMemberToRemove) {
      alert("Please select a member to remove.");
      return;
    }

    // Redundant safety (owner is disabled in UI)
    if (String(selectedMemberToRemove) === String(ownerId)) {
      alert("Owner cannot be removed from the project.");
      return;
    }

    if (!window.confirm("Remove this member from the project?")) return;

    try {
      await axios.delete(`${PROJECT_BASE}/members/${selectedMemberToRemove}`);

      // Update memberIds + options + lookup locally
      setMemberIds((prev) =>
        prev.filter((id) => String(id) !== String(selectedMemberToRemove))
      );
      setMemberOptions((prev) =>
        prev.filter((m) => String(m.id) !== String(selectedMemberToRemove))
      );
      setMemberLookup((prev) => {
        const copy = { ...prev };
        delete copy[String(selectedMemberToRemove)];
        return copy;
      });

      setSelectedMemberToRemove("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove member.");
    }
  };

  // -------------------- LOADING & ERROR --------------------
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const isCompleted = (projectStatus || "").toLowerCase() === "completed";

  // -------------------- RENDER --------------------
  return (
    <div className="container mt-4">
      <div className="row">
        {/* ----------- LEFT SIDE (TASK LIST) ----------- */}
        <div className={showForm || showTaskForm ? "col-lg-7 col-md-12" : "col-12"}>
          <h3 className="text-center mb-4">
            Backlog Board{" "}
            {projectName ? <span className="text-muted">– {projectName}</span> : null}
          </h3>

          {/* Top-right: Member dropdown (owner), Invite, Leave */}
          <div className="d-flex align-items-center justify-content-end mb-2 gap-2">
            {/* Owner: member dropdown + remove button (same side as Invite) */}
            {isOwner && memberOptions.length > 0 && (
              <div className="d-flex flex-column align-items-end me-2">
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: 260 }}
                    value={selectedMemberToRemove}
                    onChange={(e) => setSelectedMemberToRemove(e.target.value)}
                  >
                    <option value="">Project Members</option>
                    {memberOptions.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={String(m.id) === String(ownerId)}
                      >
                        {m.name || m.email}
                        {String(m.id) === String(ownerId) ? " (Owner)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleRemoveMember}
                    disabled={
                      !selectedMemberToRemove ||
                      String(selectedMemberToRemove) === String(ownerId)
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <button className="btn btn-outline-secondary" onClick={openInvite}>
              Invite Members
            </button>

            {/* Leave Project button: only for members who are not owner */}
            {isMember && !isOwner && (
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  setLeaveMessage("");
                  setShowLeaveModal(true);
                }}
              >
                Leave Project
              </button>
            )}
          </div>

          {isCompleted && (
            <div className="alert alert-info py-2 mb-3">
              This project is marked as <strong>Completed</strong>. Task creation is
              disabled.
            </div>
          )}

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Label</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleRowClick(task)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTaskId === task.id}
                      onChange={() => handleSelectTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{task.title}</td>
                  <td>{task.label}</td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{memberLookup[String(task.assignedTo)] || task.assignedTo}</td>
                  <td>{task.startDate}</td>
                  <td>{task.dueDate}</td>
                  <td>{Math.round(task.progress ?? 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom row: Add/Delete on left, Status dropdown on right */}
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <button
                className="btn btn-primary me-2"
                disabled={isCompleted}
                onClick={() => {
                  setShowForm(true);
                  setShowTaskForm(false);
                  setSelectedTask(null);
                }}
                title={isCompleted ? "Project is completed. Adding is disabled." : ""}
              >
                Add
              </button>

              <button
                className="btn btn-danger"
                disabled={isCompleted || !selectedTaskId}
                onClick={handleDeleteTask}
                title={
                  isCompleted
                    ? "Project is completed. Deleting is disabled."
                    : !selectedTaskId
                    ? "Select a task to delete."
                    : ""
                }
              >
                Delete
              </button>
            </div>

            <div>
              <label className="me-2 small text-muted">Project Status</label>
              <select
                className="form-select form-select-sm d-inline-block"
                style={{ width: 160 }}
                value={projectStatus}
                onChange={handleProjectStatusChange}
                title="Project Status"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* ----------- RIGHT SIDE (FORMS & COMMENTS) ----------- */}
        {(showForm || showTaskForm) && (
          <div
            className="col-lg-5 col-md-12"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Add Task Form */}
            {showForm && (
              <AddTaskForm
                onAdd={handleAddTask}
                onCancel={() => setShowForm(false)}
                members={memberOptions}
              />
            )}

            {/* Task View + Comments */}
            {showTaskForm && selectedTask && !isEditing && (
              <>
                <TaskForm
                  task={selectedTask}
                  memberLookup={memberLookup}
                  onEdit={() => setIsEditing(true)}
                  onClose={() => {
                    setShowTaskForm(false);
                    setSelectedTask(null);
                  }}
                />
                <div className="mt-4">
                  <h5>Comments</h5>
                  {comments.length === 0 && <p>No comments yet.</p>}
                  <ul className="list-group mb-3">
                    {comments.map((comment, idx) => (
                      <li key={idx} className="list-group-item">
                        <strong>{comment.author}:</strong> {comment.text}
                      </li>
                    ))}
                  </ul>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleAddComment}>
                      Add Comment
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Edit Task Form */}
            {showTaskForm && selectedTask && isEditing && (
              <EditTaskForm
                task={selectedTask}
                onEdit={handleEditTask}
                onCancel={() => setIsEditing(false)}
                members={memberOptions}
              />
            )}
          </div>
        )}
      </div>

      {/* ----------- INVITE MODAL ----------- */}
      {showInvite && (
        <>
          {/* Backdrop */}
          <div className="modal-backdrop fade show"></div>

          {/* Modal */}
          <div
            className="modal fade show"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ display: "block" }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={submitInvite}>
                  <div className="modal-header">
                    <h5 className="modal-title">Invite Members</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeInvite}
                    />
                  </div>

                  <div className="modal-body">
                    <div className="mb-3">
                      <label htmlFor="inviteEmail" className="form-label">
                        Teamworks account email
                      </label>
                      <input
                        id="inviteEmail"
                        type="email"
                        className="form-control"
                        placeholder="name@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>

                    {inviteError && (
                      <div className="alert alert-danger py-2">{inviteError}</div>
                    )}
                    {inviteSuccess && (
                      <div className="alert alert-success py-2">{inviteSuccess}</div>
                    )}

                    <small className="text-muted d-block">
                      We’ll add this email to the project’s pending invites.
                    </small>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeInvite}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Send Invite
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ----------- LEAVE PROJECT MODAL ----------- */}
      {showLeaveModal && (
        <>
          <div className="modal-backdrop fade show"></div>

          <div
            className="modal fade show"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ display: "block" }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Leave Project</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowLeaveModal(false)}
                  />
                </div>

                <div className="modal-body">
                  {!leaveMessage && (
                    <p>
                      Are you sure you want to leave this project? You will lose
                      access to its backlog, Kanban, calendar, and Gantt pages.
                    </p>
                  )}
                  {leaveMessage && (
                    <div className="alert alert-success py-2 mb-0">
                      {leaveMessage}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {!leaveMessage && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowLeaveModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleLeaveProject}
                      >
                        Leave Project
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Backlog;
