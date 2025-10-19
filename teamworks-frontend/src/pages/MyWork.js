import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../Dashboard.css';

const MyWork = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects and user's tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projectsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/projects`);
        setProjects(projectsResponse.data);

        // Fetch user's tasks from all projects
        const allTasks = [];
        for (const project of projectsResponse.data) {
          try {
            const tasksResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/projects/${project.id}/backlog`);
            const userTasks = tasksResponse.data.filter(task => 
              task.assignedTo === user?.firstName || 
              task.assignedTo === `${user?.firstName} ${user?.lastName}`
            );
            allTasks.push(...userTasks.map(task => ({
              ...task,
              projectName: project.name,
              projectId: project.id
            })));
          } catch (error) {
            console.error(`Failed to fetch tasks for project ${project.id}:`, error);
          }
        }
        setMyTasks(allTasks);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Mock data for demonstration
        setProjects([
          { id: 1, name: 'Website Redesign' },
          { id: 2, name: 'Mobile App' },
          { id: 3, name: 'Database Migration' }
        ]);
        setMyTasks([
          {
            id: 1,
            title: 'Design Review Meeting',
            status: 'In Progress',
            priority: 'High',
            projectName: 'Website Redesign',
            projectId: 1,
            dueDate: '2024-09-25'
          },
          {
            id: 2,
            title: 'API Integration',
            status: 'To Do',
            priority: 'Medium',
            projectName: 'Mobile App',
            projectId: 2,
            dueDate: '2024-09-26'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'in progress': return 'warning';
      case 'to do': return 'primary';
      case 'stuck': return 'danger';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const groupTasksByStatus = () => {
    const grouped = {
      'To Do': [],
      'In Progress': [],
      'Completed': []
    };

    myTasks.forEach(task => {
      const status = task.status || 'To Do';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  };

  const groupedTasks = groupTasksByStatus();

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
                        onClick={(e) => e.preventDefault()}
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
              <h1 className="h3 mb-1">My Work</h1>
              <p className="text-muted mb-0">Tasks assigned to you across all projects.</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-primary fs-6">{myTasks.length} tasks</span>
            </div>
          </div>

          {loading ? (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
              <div className="text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading your tasks...</p>
              </div>
            </div>
          ) : myTasks.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-check2-square fs-1 text-muted mb-3"></i>
                <h5 className="text-muted">No tasks assigned</h5>
                <p className="text-muted mb-0">You don't have any tasks assigned to you yet.</p>
              </div>
            </div>
          ) : (
            <div className="row">
              {Object.entries(groupedTasks).map(([status, tasks]) => (
                <div key={status} className="col-lg-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-bottom-0">
                      <div className="d-flex align-items-center justify-content-between">
                        <h6 className="mb-0">{status}</h6>
                        <span className={`badge bg-${getStatusColor(status)}`}>{tasks.length}</span>
                      </div>
                    </div>
                    <div className="card-body p-3">
                      {tasks.length === 0 ? (
                        <div className="text-center py-3">
                          <i className="bi bi-inbox fs-1 text-muted mb-2"></i>
                          <p className="text-muted mb-0">No tasks in this status</p>
                        </div>
                      ) : (
                        <div className="list-group list-group-flush">
                          {tasks.map(task => (
                            <div key={task.id} className="list-group-item px-0 border-0 mb-3">
                              <div className="d-flex align-items-start">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1">{task.title}</h6>
                                  <p className="mb-2 text-muted small">{task.projectName}</p>
                                  <div className="d-flex align-items-center justify-content-between">
                                    <small className="text-muted">
                                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                    </small>
                                    <span className={`badge bg-${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Activity */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white border-bottom-0">
              <h6 className="mb-0">Recent Activity</h6>
            </div>
            <div className="card-body">
              <div className="timeline">
                {myTasks.slice(0, 5).map((task, index) => (
                  <div key={task.id} className="timeline-item d-flex mb-3">
                    <div className="flex-shrink-0">
                      <div className={`bg-${getStatusColor(task.status)} text-white rounded-circle d-flex align-items-center justify-content-center`} 
                           style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                        <i className="bi bi-check2"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <p className="mb-0 text-muted small">
                            {task.status} • {task.projectName}
                          </p>
                        </div>
                        <small className="text-muted">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Footer */}
      <footer className="footer bg-light text-center py-3 mt-auto">
        <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.</small>
      </footer>
    </div>
    </React.Fragment>
  );
};

export default MyWork;
