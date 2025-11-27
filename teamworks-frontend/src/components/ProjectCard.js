import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project, onSelectProject, onEditProject, onDeleteProject, onChangeOwner }) => {
  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active': return 'primary';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  const ownerDisplay =
    project.ownerName ||
    project.ownerFullName || // if you inject this in the list call
    project.ownerEmail ||    // or this
    'Owner';

  const ownerInitial =
    (ownerDisplay && ownerDisplay[0]) ||
    'O';

  const memberCount = Array.isArray(project.members) ? project.members.length : (project.memberCount ?? 1);

  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <div
        className="card h-100 shadow-sm project-card"
        onClick={() => onSelectProject(project)}
        style={{ cursor: "pointer", transition: "transform 0.2s ease" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
        }}
      >
        <div className="card-body">
          {/* Header */}
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
                <li>
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(project);
                    }}
                  >
                    <i className="bi bi-pencil me-2"></i>Edit Project
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeOwner(project);
                    }}
                  >
                    <i className="bi bi-person-gear me-2"></i>Change Project Owner
                  </button>
                </li>

                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project);
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>Delete Project
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="card-text text-muted small mb-3">
              {project.description.length > 100
                ? `${project.description.substring(0, 100)}...`
                : project.description}
            </p>
          )}

          {/* Status + Members */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className={`badge bg-${getStatusColor(project.status)}`}>
              {project.status || 'Active'}
            </span>

            <div className="d-flex align-items-center">
              <i className="bi bi-people me-1"></i>
              <small className="text-muted">{memberCount} member{memberCount === 1 ? '' : 's'}</small>
            </div>
          </div>

          {/* Owner + Quick actions */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div
                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                style={{ width: "28px", height: "28px", fontSize: "12px" }}
              >
                {ownerInitial}
              </div>
              <div>
                <div className="small fw-semibold">{ownerDisplay}</div>
                <div className="small text-muted">Owner</div>
              </div>
            </div>

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

        {/* Footer: Due date only */}
        {/* <div className="card-footer bg-transparent border-top-0 pt-0">
          <div className="d-flex justify-content-end align-items-center">
            <small className="text-muted">
              Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}
            </small>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default ProjectCard;