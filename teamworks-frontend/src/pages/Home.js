import React, { useState, useEffect } from "react";
import axios from "axios";

function HomePage({ projs, user, refreshProjects }) {
  const projects = projs || [];
  const [users, setUsers] = useState([]);
  const [selectedOwners, setSelectedOwners] = useState({});
  const [nameEdits, setNameEdits] = useState({});

  // ✅ Fetch users list once
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    })();
  }, []);

  const handleChangeOwner = async (projectId) => {
    const selectedUserId = selectedOwners[projectId];
    if (!selectedUserId) return alert("Select a user first");

    const project = projects.find((p) => p.id === projectId);
    if (!project) return alert("Project not found");

    const memberIds = (project.members || []).map(String);
    if (!memberIds.includes(String(selectedUserId))) {
      return alert("Selected user must be a member of this project");
    }

    const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));
    if (!selectedUser) return alert("Selected user not found");

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/owner`,
        { ownerEmail: selectedUser.email },
        { headers: { "X-User-Id": user.id } }
      );
      alert("Project ownership updated!");
      await refreshProjects(); // 🔁 update navbar + list
    } catch (err) {
      console.error("Failed to change owner", err);
      const msg =
        err?.response?.status === 403
          ? "Only the project owner can change project ownership"
          : err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to change owner";
      alert(msg);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}`,
        { headers: { "X-User-Id": user.id } }
      );
      alert("Project deleted");
      await refreshProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      const msg =
        err?.response?.status === 403
          ? "Only the project owner can delete project"
          : err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to delete project";
      alert(msg);
    }
  };

  const handleNameChange = async (projectId) => {
    const newName = nameEdits[projectId] ?? "";
    if (!newName.trim()) return alert("Enter a new name first");

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/name`,
        { projectName: newName },
        { headers: { "X-User-Id": user.id } }
      );
      alert("Project name changed");
      await refreshProjects();
      setNameEdits((prev) => ({ ...prev, [projectId]: "" }));
    } catch (err) {
      console.error("Failed to update project name", err);
      const msg =
        err?.response?.status === 403
          ? "Only the project owner can update project name"
          : err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to update project name";
      alert(msg);
    }
  };

  // ✅ UI rendering section
  return (
    <div className="container mt-4">
      <h1 className="text-center">Home Page</h1>

      {projects.map((project) => {
        // only members for this project
        const memberIds = (project.members || []).map(String);
        const memberUsers = users.filter((u) =>
          memberIds.includes(String(u.id))
        );

        return (
          <div key={project.id} className="mb-3">
            <span className="me-2 fw-semibold">{project.name}</span>

            <input
              type="text"
              placeholder="New name"
              value={nameEdits[project.id] ?? ""}
              onChange={(e) =>
                setNameEdits((prev) => ({
                  ...prev,
                  [project.id]: e.target.value,
                }))
              }
              className="form-control d-inline-block w-auto me-2"
            />
            <button
              className="btn btn-sm btn-primary me-2"
              onClick={() => handleNameChange(project.id)}
            >
              Change Name
            </button>
            <button
              className="btn btn-sm btn-outline-danger me-3"
              onClick={() => handleDelete(project.id)}
            >
              Delete
            </button>

            <label className="me-2">Change Project Owner:</label>
            <select
              className="form-select d-inline-block w-auto me-2"
              value={selectedOwners[project.id] || ""}
              onChange={(e) =>
                setSelectedOwners((prev) => ({
                  ...prev,
                  [project.id]: e.target.value,
                }))
              }
            >
              <option value="">-- Select Member --</option>
              {memberUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => handleChangeOwner(project.id)}
              disabled={!selectedOwners[project.id]}
            >
              Change Owner
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default HomePage;