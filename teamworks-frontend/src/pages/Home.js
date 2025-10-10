import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import axios from "axios";
import { Button } from 'bootstrap/dist/js/bootstrap.bundle.min';




function HomePage({ projs, user}) {
  const [projects, setProjects] = useState(projs || []);

  const handleDelete = async (projectId, user) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/projects/${projectId}`);
      alert("Project deleted");
      setProjects(projects.filter(proj => proj.id !== projectId)); // update UI

      // optionally update state to remove deleted project from UI
    } catch (err) {
      console.error("Failed to delete project", err);
      alert("Failed to delete project");
    }
  }

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        console.log(res.data)
        setProjects(res.data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    }

    fetchProjects();
  }, [user]);

  return (
    <div className="container mt-4">
      <h1 className="text-center">Home Page</h1>
      {projects.map(project => (
        <div key={project.id}>
          {project.name}
          <button onClick={() => handleDelete(project.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default HomePage;