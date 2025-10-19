import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project, onSelectProject }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'in progress': return 'warning';
      case 'completed': return 'info';
      case 'on hold': return 'secondary';
      default: return 'primary';
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

  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <div 
        className="card h-100 shadow-sm project-card"
        onClick={() => onSelectProject(project)}
        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }}
      >
        <div className="card-body">
          {/* Project Header */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="flex-grow-1">
              <h5 className="card-title mb-1 text-truncate" title={project.name}>
                {project.name}
              </h5>
              <small className="text-muted">
                Created {new Date(project.createdAt || Date.now()).toLocaleDateString()}
              </small>
            </div>
            <div className="dropdown">
              <button 
                className="btn btn-link p-0" 
                data-bs-toggle="dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="bi bi-three-dots-vertical text-muted"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><button className="dropdown-item">
                  <i className="bi bi-pencil me-2"></i>Edit Project
                </button></li>
                <li><button className="dropdown-item">
                  <i className="bi bi-people me-2"></i>Manage Members
                </button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger">
                  <i className="bi bi-trash me-2"></i>Delete Project
                </button></li>
              </ul>
            </div>
          </div>

          {/* Project Description */}
          {project.description && (
            <p className="card-text text-muted small mb-3">
              {project.description.length > 100 
                ? `${project.description.substring(0, 100)}...` 
                : project.description
              }
            </p>
          )}

          {/* Project Stats */}
          <div className="row g-2 mb-3">
            <div className="col-4">
              <div className="text-center">
                <div className="h6 mb-0 text-primary">{project.taskCount || 0}</div>
                <small className="text-muted">Tasks</small>
              </div>
            </div>
            <div className="col-4">
              <div className="text-center">
                <div className="h6 mb-0 text-success">{project.completedTasks || 0}</div>
                <small className="text-muted">Completed</small>
              </div>
            </div>
            <div className="col-4">
              <div className="text-center">
                <div className="h6 mb-0 text-warning">{project.memberCount || 1}</div>
                <small className="text-muted">Members</small>
              </div>
            </div>
          </div>

          {/* Project Status and Priority */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className={`badge bg-${getStatusColor(project.status)}`}>
              {project.status || 'Active'}
            </span>
            <span className={`badge bg-${getPriorityColor(project.priority)}`}>
              {project.priority || 'Medium'}
            </span>
          </div>

          {/* Project Owner */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                   style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                {project.owner?.firstName?.charAt(0) || project.createdBy?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="small fw-semibold">
                  {project.owner?.firstName ? 
                    `${project.owner.firstName} ${project.owner.lastName}` : 
                    project.createdBy || 'Unknown'
                  }
                </div>
                <div className="small text-muted">Owner</div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="d-flex gap-1">
              <Link 
                to={`/projects/${project.id}/backlog`}
                className="btn btn-sm btn-outline-primary"
                onClick={(e) => e.stopPropagation()}
                title="View Backlog"
              >
                <i className="bi bi-list-task"></i>
              </Link>
              <Link 
                to={`/projects/${project.id}/kanbanboard`}
                className="btn btn-sm btn-outline-success"
                onClick={(e) => e.stopPropagation()}
                title="View Kanban"
              >
                <i className="bi bi-kanban"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* Project Footer */}
        <div className="card-footer bg-transparent border-top-0 pt-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}
            </small>
            <div className="d-flex align-items-center">
              <div className="progress me-2" style={{ width: '60px', height: '4px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: `${project.completionPercentage || 0}%` }}
                ></div>
              </div>
              <small className="text-muted">{project.completionPercentage || 0}%</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
