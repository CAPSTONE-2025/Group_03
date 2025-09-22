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

  // -------------------- STATE --------------------
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = projectId
    ? `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/backlog`
    : null;

useEffect(() => {
  if (!projectId || !API_URL) return; // ✅ safe check inside hook

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

// then conditionally render UI (but AFTER hooks)
if (!projectId) {
  return <div>No project selected. Please go back to your projects.</div>;
}


  // -------------------- HANDLERS --------------------
  const handleAddTask = async (newTask) => {
    try {
      const response = await axios.post(API_URL, newTask); // projectId is in URL
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
      setTasks(
        tasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
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
      setTasks(tasks.filter((task) => task.id !== selectedTaskId));
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
      console.error(
        "Error adding comment:",
        err.response?.data || err.message
      );
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
        <div
          className={
            showForm || showTaskForm ? "col-lg-7 col-md-12" : "col-12"
          }
        >
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Label</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
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
                    />
                  </td>
                  <td>{task.title}</td>
                  <td>{task.label}</td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.assignedTo}</td>
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
              />
            )}

            {/* Task View + Comments */}
            {showTaskForm && selectedTask && !isEditing && (
              <>
                <TaskForm
                  task={selectedTask}
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
                    <button
                      className="btn btn-primary"
                      onClick={handleAddComment}
                    >
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
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Backlog;
