import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import CalendarPage from './pages/Calendar';
import BacklogPage from './pages/Backlog';
import SignUp from './pages/Signup';
import WelcomePage from './pages/WelcomePage'; 
import Login from './pages/Login'; 
import KanbanBoardPage from './pages/KanbanBoard';
import ProfilePage from "./pages/Profile";
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import axios from "axios";
import { useCallback } from 'react';
function AppContent() {
  const { isAuthenticated, user, handleLogout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // ✅ Fetch only projects where logged-in user is a member
  
    const fetchProjects = useCallback (async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        console.log(res.data)
        setProjects(res.data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchProjects();
    }
  }, [isAuthenticated, user?.id, fetchProjects]);

  const handleLogoutClick = () => {
    handleLogout();
    window.location.href = '/welcome';
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/projects`, {
        name: newProjectName,
        createdBy: user.id,
      });
      setProjects([...projects, { id: res.data.id, name: newProjectName }]);
      setNewProjectName("");
      setShowCreateProject(false);
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />

        {/* Protected pages */}
        {isAuthenticated ? (
          <Route
            path="*"
            element={
              <div className="d-flex flex-column min-vh-100">
                {/* Navbar */}
                <nav className="navbar navbar-expand-lg navbar-light bg-light">
                  <div className="container">
                    <Link className="navbar-brand" to="/">TeamWorks</Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                      <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                      <ul className="navbar-nav me-auto">
                        <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>

                        {/* Projects dropdown */}
                        <li className="nav-item dropdown">
                          <a className="nav-link dropdown-toggle" href="/" id="projectsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Projects
                          </a>
                          <ul className="dropdown-menu" aria-labelledby="projectsDropdown">
                            {projects.map((project) => (
                              <li key={project.id} className="dropdown-submenu">
                                <a
                                  className="dropdown-item dropdown-toggle"
                                  href="#"
                                  onClick={(e) => e.preventDefault()} // prevents page reload
                                >
                                  {project.name}
                                </a>
                                <ul className="dropdown-menu">
                                  <li><Link className="dropdown-item" to={`/projects/${project.id}/backlog`}>Backlog</Link></li>
                                  <li><Link className="dropdown-item" to={`/projects/${project.id}/kanbanboard`}>Kanban</Link></li>
                                  <li><Link className="dropdown-item" to={`/projects/${project.id}/calendar`}>Calendar</Link></li>
                                </ul>
                              </li>
                            ))}
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-primary"
                                onClick={() => setShowCreateProject(true)}
                              >
                                + Create Project
                              </button>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link className="nav-link me-3" to="/profile"><i className="bi bi-person fs-5"></i></Link>
                      <button className="btn btn-link nav-link p-0" onClick={handleLogoutClick}><i className="bi bi-box-arrow-right fs-5"></i></button>
                    </div>
                  </div>
                </nav>

                {/* Main content */}
                <div className="flex-grow-1 container mt-4">
                  <Routes>
                    <Route path="/home" element={<HomePage projs={projects} user={user} refreshProjects={fetchProjects} />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
                    <Route path="/projects/:projectId/backlog" element={<BacklogPage />} />
                    <Route path="/projects/:projectId/kanbanboard" element={<KanbanBoardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/" element={<HomePage projs={projects} user={user} refreshProjects={fetchProjects}/>} />
                  </Routes>
                </div>

                {/* Footer */}
                <footer className="footer bg-light text-center py-3 mt-auto">
                  <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary, Fawad.</small>
                </footer>
              </div>
            }
          />
        ) : (
          <Route path="*" element={<Navigate to="/welcome" />} />
        )}
      </Routes>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Project</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateProject(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleCreateProject}>
                  <div className="mb-3">
                    <label className="form-label">Project Name</label>
                    <input type="text" className="form-control" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary">Create</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}

// ✅ Wrap with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
