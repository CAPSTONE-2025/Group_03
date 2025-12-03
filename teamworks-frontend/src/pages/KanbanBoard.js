import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

function KanbanBoard() {
  const { projectId } = useParams();
  const { user } = useContext(AuthContext);

  const BACKLOG_URL = `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/backlog`;
  const PROJECT_URL = `${process.env.REACT_APP_API_URL}/api/project/${projectId}`;
  const USERS_URL = `${process.env.REACT_APP_API_URL}/api/users`;

  const [tasks, setTasks] = useState([]);
  const [memberLookup, setMemberLookup] = useState({}); // { userId: "Full Name" }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectName, setProjectName] = useState("");

  // Header for routes that need it
  useEffect(() => {
    if (user?.id) axios.defaults.headers.common["X-User-Id"] = user.id;
    else delete axios.defaults.headers.common["X-User-Id"];
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const pres = await axios.get(PROJECT_URL);
        setProjectName(pres.data?.name || "");
        const memberIds = pres.data?.members || [];

        const ures = await axios.get(USERS_URL);
        const allUsers = Array.isArray(ures.data) ? ures.data : [];
        const members = allUsers.filter((u) => memberIds.includes(String(u.id)));

        const lookup = {};
        for (const u of members) {
          const display = (u.name || "").trim() || u.email || String(u.id);
          lookup[String(u.id)] = display;
        }
        setMemberLookup(lookup);

        const tres = await axios.get(BACKLOG_URL);
        const payload = Array.isArray(tres.data) ? tres.data : [];
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
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchAll();
  }, [projectId, PROJECT_URL, USERS_URL, BACKLOG_URL]);

  const columns = useMemo(
    () => [
      { status: "To Do", bg: "#f8f9fa" },
      { status: "In Progress", bg: "#fffdf5" },
      { status: "Done", bg: "#f6fff7" },
    ],
    []
  );

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`${BACKLOG_URL}/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update task status.");
    }
  };

  // ---------- UI helpers ----------
  const getPriorityColor = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "high":
        return "#dc3545"; // red
      case "medium":
        return "#fd7e14"; // orange
      case "low":
        return "#0d6efd"; // blue
      default:
        return "#6c757d"; // gray
    }
  };

  const getLabelPillClass = (label) => {
    if (!label) return "badge text-bg-secondary";
    const l = label.toLowerCase();
    if (l.includes("bug") || l.includes("fix")) return "badge text-bg-danger";
    if (l.includes("feature") || l.includes("feat")) return "badge text-bg-success";
    if (l.includes("design") || l.includes("ui")) return "badge text-bg-info";
    return "badge text-bg-secondary";
    };

  const fmt = (d) => d || "—";

  const daysLeft = (dueDate) => {
    if (!dueDate) return null;
    try {
      const end = new Date(dueDate);
      const today = new Date();
      // zero-out time for clean diffs
      end.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((end - today) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return null;
    }
  };

  const dueBadge = (dueDate) => {
    const d = daysLeft(dueDate);
    if (d === null) return <span className="badge text-bg-secondary">No due</span>;
    if (d < 0) return <span className="badge text-bg-danger">Overdue</span>;
    if (d === 0) return <span className="badge text-bg-warning">Due today</span>;
    if (d <= 3) return <span className="badge text-bg-warning">{d} day{d === 1 ? "" : "s"} left</span>;
    return <span className="badge text-bg-success">{d} days left</span>;
  };

  const initialsOf = (displayNameOrEmail) => {
    if (!displayNameOrEmail) return "?";
    const nameOnly = displayNameOrEmail.split("@")[0]; // if email, drop domain
    const parts = nameOnly.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const AssigneeChip = ({ userId }) => {
    const display = memberLookup[String(userId)] || String(userId);
    return (
      <div className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-3 border bg-white">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 26,
            height: 26,
            border: "1px solid #dee2e6",
            fontSize: 12,
            fontWeight: 600,
          }}
          title={display}
        >
          {initialsOf(display)}
        </div>
        <span className="small text-truncate" style={{ maxWidth: 150 }} title={display}>
          {display}
        </span>
      </div>
    );
  };

  const Card = ({ task }) => {
    const borderColor = getPriorityColor(task.priority);
    return (
      <div
        className="mb-3 shadow-sm"
        style={{
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #e9ecef",
          overflow: "hidden",
        }}
      >
        {/* Colored left bar */}
        <div style={{ height: 4, background: borderColor }} />

        <div className="p-3">
          {/* Title + status selector */}
          <div className="d-flex align-items-start justify-content-between gap-2">
            <h6 className="mb-1" style={{ lineHeight: 1.3 }}>{task.title}</h6>
            <select
              className="form-select form-select-sm"
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              style={{ maxWidth: 150 }}
            >
              {columns.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.status}
                </option>
              ))}
            </select>
          </div>

          {/* Chips row */}
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
            {task.label && <span className={getLabelPillClass(task.label)}>{task.label}</span>}
            {task.priority && (
              <span className="badge" style={{ background: borderColor, color: "#fff" }}>
                {task.priority}
              </span>
            )}
            {dueBadge(task.dueDate)}
          </div>

          {/* Meta row */}
          <div className="d-flex align-items-center justify-content-between mt-3">
            <div className="d-flex flex-column">
              <span className="small text-muted">Start</span>
              <span className="fw-semibold">{fmt(task.startDate)}</span>
            </div>
            <div className="d-flex flex-column">
              <span className="small text-muted">Due</span>
              <span className="fw-semibold">{fmt(task.dueDate)}</span>
            </div>
            <AssigneeChip userId={task.assignedTo} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error fetching tasks: {error.message}</div>;

  return (
    <div className="container mt-4">
      <h3 className="text-center mb-4">
        Kanban Board {projectName ? <span className="text-muted">– {projectName}</span> : null}
      </h3>

      <div className="row g-3">
        {columns.map((column) => (
          <div className="col-md-4" key={column.status}>
            <div
              className="p-3"
              style={{
                backgroundColor: column.bg,
                borderRadius: 16,
                border: "1px solid #e9ecef",
                minHeight: 200,
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="mb-0">{column.status}</h5>
                <span className="badge text-bg-light">
                  {tasks.filter((t) => t.status === column.status).length}
                </span>
              </div>

              {tasks
                .filter((task) => task.status === column.status)
                .map((task) => (
                  <Card key={task.id} task={task} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;