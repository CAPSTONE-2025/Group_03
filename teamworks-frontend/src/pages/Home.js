import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { Button } from "bootstrap/dist/js/bootstrap.bundle.min";

function HomePage({ projs, user }) {
  const [projects, setProjects] = useState(projs || []);
  const [projectNameInput, setProjectNameInput] = useState("");


  const handleDelete = async (projectId, user) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}`,
        {
          headers: {
            "X-User-Id": user.id, // backend expects this header for owner check
          },
        }
      );
      alert("Project deleted");
      
    } catch (err) {
      console.error("Failed to delete project", err);
      alert("Failed to delete project");
    }
    // re-fetch to update state
    try {
      let result = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`,
      );
      setProjects(result.data); // update UI
    } catch (err) {
      console.error("Failed to fetch projects and update state", err);
      alert("Failed to fetch projects and update state");
    }
  };

  const handleNameChange = async (projectId, projName) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/name`,
        { projectName: projName }, // <-- this sends the projectName in the body
        {
          headers: {
            "X-User-Id": user.id, // if your backend expects this header for owner check
          },
        }
      );
      alert("Project name changed");
    } catch (err) {
      console.error("Failed to update project name", err);
      alert("Failed to update project name");
    }

    // re-fetch to update state
    try {
      let result = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
      );
      setProjects(result.data); // update UI
    } catch (err) {
      console.error("Failed to fetch projects and update state", err);
      alert("Failed to fetch projects and update state");
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        console.log(res.data);
        setProjects(res.data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };

    fetchProjects();
  }, [user]);

  return (
    <div className="container mt-4">
      <h1 className="text-center">Home Page</h1>
      {projects.map((project) => (
        <div key={project.id}>
          <span>{project.name}</span>
          <input
            type="text"
            placeholder="New name"
            onChange={(e) => setProjectNameInput(e.target.value)}
          />
          <button
            onClick={() => handleNameChange(project.id, projectNameInput)}
          >
            Change Name
          </button>
          <button onClick={() => handleDelete(project.id, user)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default HomePage;
