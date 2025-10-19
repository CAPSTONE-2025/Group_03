import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import axios from 'axios';
import '../Dashboard.css';

const DashboardHome = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/projects`);
        setProjects(response.data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        // Create mock data for demonstration
        setProjects([
          {
            id: 1,
            name: 'Website Redesign',
            description: 'Complete redesign of the company website with modern UI/UX',
            status: 'Active',
            priority: 'High',
            owner: { firstName: 'John', lastName: 'Doe' },
            createdBy: user?.firstName || 'User',
            taskCount: 12,
            completedTasks: 8,
            memberCount: 5,
            completionPercentage: 67,
            dueDate: '2024-12-31',
            createdAt: '2024-01-15'
          },
          {
            id: 2,
            name: 'Mobile App Development',
            description: 'Development of iOS and Android mobile applications',
            status: 'In Progress',
            priority: 'Medium',
            owner: { firstName: 'Jane', lastName: 'Smith' },
            createdBy: user?.firstName || 'User',
            taskCount: 25,
            completedTasks: 15,
            memberCount: 8,
            completionPercentage: 60,
            dueDate: '2024-11-30',
            createdAt: '2024-02-01'
          },
          {
            id: 3,
            name: 'Database Migration',
            description: 'Migrate legacy database to modern cloud infrastructure',
            status: 'On Hold',
            priority: 'Low',
            owner: { firstName: 'Mike', lastName: 'Johnson' },
            createdBy: user?.firstName || 'User',
            taskCount: 8,
            completedTasks: 3,
            memberCount: 3,
            completionPercentage: 38,
            dueDate: '2024-10-15',
            createdAt: '2024-03-10'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/projects`, {
        name: newProjectName,
        createdBy: user?.id || user?.firstName,
        description: '',
        status: 'Active',
        priority: 'Medium'
      });

      const newProject = {
        ...response.data,
        name: newProjectName,
        owner: { firstName: user?.firstName, lastName: user?.lastName },
        taskCount: 0,
        completedTasks: 0,
        memberCount: 1,
        completionPercentage: 0
      };

      setProjects([...projects, newProject]);
      setNewProjectName('');
      setShowCreateProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
    <div className="d-flex flex-column min-vh-100">
      {/* Top Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">TeamWorks</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/my-work">My Work</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/calendar">Calendar</Link></li>
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
            <button className="btn btn-link nav-link p-0" onClick={() => {
              localStorage.removeItem("user");
              window.location.href = '/welcome';
            }}><i className="bi bi-box-arrow-right fs-5"></i></button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow-1 container mt-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Dashboard</h1>
              <p className="text-muted mb-0">Welcome back, {user?.firstName}! Here's what's happening with your projects.</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              {/* View Mode Toggle */}
              <div className="btn-group" role="group">
                <button 
                  className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <i className="bi bi-grid-3x3"></i>
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('list')}
                >
                  <i className="bi bi-list"></i>
                </button>
              </div>
              
              {/* Create Project Button */}
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateProject(true)}
              >
                <i className="bi bi-plus me-2"></i>
                New Project
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card border-0 bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="card-title mb-1">Total Projects</h6>
                      <h3 className="mb-0">{projects.length}</h3>
                    </div>
                    <i className="bi bi-folder fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-success text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="card-title mb-1">Active Projects</h6>
                      <h3 className="mb-0">{projects.filter(p => p.status === 'Active').length}</h3>
                    </div>
                    <i className="bi bi-play-circle fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="card-title mb-1">In Progress</h6>
                      <h3 className="mb-0">{projects.filter(p => p.status === 'In Progress').length}</h3>
                    </div>
                    <i className="bi bi-clock fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-info text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h6 className="card-title mb-1">Completed</h6>
                      <h3 className="mb-0">{projects.filter(p => p.status === 'Completed').length}</h3>
                    </div>
                    <i className="bi bi-check-circle fs-1 opacity-50"></i>
                  </div>
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
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
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
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateProject(true)}
                  >
                    <i className="bi bi-plus me-2"></i>
                    Create Your First Project
                  </button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'row' : 'list-group'}>
                  {projects.map((project) => (
                    <ProjectCard 
                      key={project.id}
                      project={project}
                      onSelectProject={handleSelectProject}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer bg-light text-center py-3 mt-auto">
          <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.</small>
        </footer>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Project</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateProject(false)}
                ></button>
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
                    <textarea 
                      className="form-control" 
                      rows="3"
                      placeholder="Describe your project..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateProject(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Project
                  </button>
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
