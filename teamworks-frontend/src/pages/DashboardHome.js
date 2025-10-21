import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProjectCard from '../components/ProjectCard';
import axios from 'axios';
import '../Dashboard.css';

const DashboardHome = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) {
        setProjects([]);
        setLoading(false);
        return;
      }
      try {
        console.log('Fetching projects for user:', user.id);
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        console.log('Fetched projects:', response.data);

        // Transform the backend data to match frontend format
        const transformedProjects = (response.data || []).map(project => ({
          ...project,
          owner: { firstName: user?.firstName, lastName: user?.lastName },
          taskCount: 0,
          completedTasks: 0,
          memberCount: 1,
          completionPercentage: 0,
          dueDate: '2024-12-31',
          createdAt: new Date().toISOString().split('T')[0]
        }));

        setProjects(transformedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        console.error('Error details:', error.response?.data);
        // Optional: fallback demo data
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user?.id, user?.firstName, user?.lastName]);

  useEffect(() => {
  if (searchParams.get('new') === '1') {
    setShowCreateProject(true);
    // Clean the URL so refresh/back doesn’t reopen the modal
    navigate(location.pathname, { replace: true });
  }
}, [searchParams, navigate, location.pathname]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user?.id) return;

    try {
      console.log('Creating project with data:', {
        name: newProjectName,
        createdBy: user.id,
        description: '',
        status: 'Active',
        priority: 'Medium'
      });

      await axios.post(`${process.env.REACT_APP_API_URL}/api/projects`, {
        name: newProjectName,
        createdBy: user.id,
        description: '',
        status: 'Active',
        priority: 'Medium'
      });

      // Refresh the list
      const projectsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
      );

      const transformedProjects = (projectsResponse.data || []).map(project => ({
        ...project,
        owner: { firstName: user?.firstName, lastName: user?.lastName },
        taskCount: 0,
        completedTasks: 0,
        memberCount: 1,
        completionPercentage: 0,
        dueDate: '2024-12-31',
        createdAt: new Date().toISOString().split('T')[0]
      }));

      setProjects(transformedProjects);
      setNewProjectName('');
      setShowCreateProject(false);
      console.log('Project created successfully and projects refreshed');
    } catch (error) {
      console.error('Failed to create project:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to create project: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSelectProject = (project) => setSelectedProject(project);

  const handleEditProject = (project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setShowEditProject(true);
  };

  const handleDeleteProject = async (project) => {
    if (!user?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      console.log('Deleting project:', project.id);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/projects/${project.id}`,
        { headers: { 'X-User-Id': user.id } }
      );

      // Refresh
      const projectsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
      );

      const transformedProjects = (projectsResponse.data || []).map(project => ({
        ...project,
        owner: { firstName: user?.firstName, lastName: user?.lastName },
        taskCount: 0,
        completedTasks: 0,
        memberCount: 1,
        completionPercentage: 0,
        dueDate: '2024-12-31',
        createdAt: new Date().toISOString().split('T')[0]
      }));

      setProjects(transformedProjects);
      console.log('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to delete project: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !editingProject?.id || !user?.id) return;

    try {
      console.log('Updating project:', editingProject.id, 'with name:', newProjectName);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/projects/${editingProject.id}/name`,
        { projectName: newProjectName },
        { headers: { 'X-User-Id': user.id } }
      );

      // Refresh
      const projectsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
      );

      const transformedProjects = (projectsResponse.data || []).map(project => ({
        ...project,
        owner: { firstName: user?.firstName, lastName: user?.lastName },
        taskCount: 0,
        completedTasks: 0,
        memberCount: 1,
        completionPercentage: 0,
        dueDate: '2024-12-31',
        createdAt: new Date().toISOString().split('T')[0]
      }));

      setProjects(transformedProjects);
      setNewProjectName('');
      setShowEditProject(false);
      setEditingProject(null);

      console.log('Project updated successfully');
    } catch (error) {
      console.error('Failed to update project:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to update project: ${error.response?.data?.error || error.message}`);
    }
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
      {/* Main Content (no navbar/footer here) */}
      <div className="flex-grow-1 container mt-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1">Dashboard</h1>
            <p className="text-muted mb-0">
              Welcome back, {user?.firstName}! Here's what's happening with your projects.
            </p>
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
                    onEditProject={handleEditProject}
                    onDeleteProject={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
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

      {/* Edit Project Modal */}
      {showEditProject && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Project</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
                    setNewProjectName('');
                  }}
                ></button>
              </div>
              <form onSubmit={handleUpdateProject}>
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
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditProject(false);
                      setEditingProject(null);
                      setNewProjectName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Project
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