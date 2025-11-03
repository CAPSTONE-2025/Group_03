import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

import AddTaskForm from "../components/AddTaskForm";
import TaskForm from "../components/TaskForm";
import EditTaskForm from "../components/EditTaskForm";
import { AuthContext } from "../contexts/AuthContext";

function Backlog() {
  const { projectId } = useParams();
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

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [pendingInvites, setPendingInvites] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- invite modal state (replaces window.prompt/alert) ----
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

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
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/invite`,
        { emails: [trimmed] }
      );
      setPendingInvites(data.pendingInvites || []);
      setInviteSuccess(`Invitation sent to ${trimmed}.`);
      // Optional: close modal after success
      // setTimeout(closeInvite, 900);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send invite.";
      setInviteError(msg);
    }
  };

  const API_URL = projectId
    ? `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/backlog`
    : null;

  // -------------------- EFFECTS --------------------
  // Project name + members
  useEffect(() => {
    if (!projectId) return;

    (async () => {
      try {
        const pres = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/project/${projectId}`
        );
        setProjectName(pres.data.name);
        const memberIds = pres.data.members || [];

        const ures = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
        const allUsers = Array.isArray(ures.data) ? ures.data : [];
        const onlyMembers = allUsers.filter((u) => memberIds.includes(String(u.id)));
        setMemberOptions(onlyMembers);

        const lookup = {};
        for (const u of onlyMembers) lookup[String(u.id)] = u.name || u.email;
        setMemberLookup(lookup);
      } catch {
        setProjectName("Unknown Project");
      }
    })();
  }, [projectId]);

  // Tasks
  useEffect(() => {
    if (!projectId || !API_URL) return;

    const fetchTasks = async () => {
      try {
        const response = await axios.get(API_URL);
        setTasks(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, API_URL]);

  if (!projectId) {
    return <div>No project selected. Please go back to your projects.</div>;
  }

  // -------------------- HANDLERS --------------------
  const handleAddTask = async (newTask) => {
    try {
      const response = await axios.post(API_URL, newTask);
      setTasks([...tasks, { ...newTask, id: response.data.id }]);
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

  // -------------------- LOADING & ERROR --------------------
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // -------------------- RENDER --------------------
  return (
    <div className="container mt-4">
      <div className="row">
        {/* ----------- LEFT SIDE (TASK LIST) ----------- */}
        <div className={showForm || showTaskForm ? "col-lg-7 col-md-12" : "col-12"}>
          <h2 className="mb-4 text-center">{projectName}</h2>

          {/* Controls */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div>
              <small className="text-muted">
                Pending invites: {pendingInvites.map((p) => p.email).join(", ") || "—"}
              </small>
            </div>
            <div>
              <button className="btn btn-outline-secondary me-2" onClick={openInvite}>
                Invite Members
              </button>
            </div>
          </div>

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
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-end">
            <button
              className="btn btn-primary me-2"
              onClick={() => {
                setShowForm(true);
                setShowTaskForm(false);
                setSelectedTask(null);
              }}
            >
              Add
            </button>
            <button className="btn btn-danger" onClick={handleDeleteTask}>
              Delete
            </button>
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
                    <button type="button" className="btn btn-secondary" onClick={closeInvite}>
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
    </div>
  );
}

export default Backlog;