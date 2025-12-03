import React from 'react';
import ReactMarkdown from 'react-markdown';

function TaskForm({ task, onEdit, onClose, memberLookup = {} }) {
  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('completed')) return 'success';
    if (statusLower.includes('progress')) return 'warning';
    return 'secondary';
  };

  const getPriorityColor = (priority) => {
    const priorityLower = (priority || '').toLowerCase();
    if (priorityLower === 'high') return 'danger';
    if (priorityLower === 'medium') return 'warning';
    return 'info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-info-circle me-2"></i>
          Task Information
        </h5>
      </div>
      <div className="card-body">
        {/* Title Section */}
        <div className="mb-4">
          <h4 className="fw-bold mb-2">{task.title || 'Untitled Task'}</h4>
        </div>

        {/* Status, Priority, Label - Badges Row */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <span className={`badge bg-${getStatusColor(task.status)} fs-6 px-3 py-2`}>
            <i className="bi bi-flag me-1"></i>
            {task.status || 'No Status'}
          </span>
          <span className={`badge bg-${getPriorityColor(task.priority)} fs-6 px-3 py-2`}>
            <i className="bi bi-exclamation-triangle me-1"></i>
            {task.priority || 'No Priority'}
          </span>
          {task.label && (
            <span className="badge bg-primary fs-6 px-3 py-2">
              <i className="bi bi-tag me-1"></i>
              {task.label}
            </span>
          )}
        </div>

        {/* Description Section */}
        {task.description && (
          <div className="mb-4">
            <h6 className="text-muted mb-2">
              <i className="bi bi-file-text me-2"></i>
              Description
            </h6>
            <div className="border rounded p-3 bg-light">
              <ReactMarkdown>{task.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="row g-3 mb-4">
          {/* Assigned To */}
          <div className="col-md-6">
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-person-fill text-primary me-2"></i>
                <small className="text-muted text-uppercase fw-semibold">Assigned To</small>
              </div>
              <div className="fw-semibold">
                {memberLookup[String(task.assignedTo)] || task.assignedTo || 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="col-md-6">
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-graph-up text-success me-2"></i>
                <small className="text-muted text-uppercase fw-semibold">Progress</small>
              </div>
              <div className="d-flex align-items-center">
                <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${Math.round(task.progress ?? 0)}%` }}
                    aria-valuenow={Math.round(task.progress ?? 0)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <span className="fw-bold">{Math.round(task.progress ?? 0)}%</span>
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="col-md-6">
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-calendar-event text-info me-2"></i>
                <small className="text-muted text-uppercase fw-semibold">Start Date</small>
              </div>
              <div className="fw-semibold">{formatDate(task.startDate)}</div>
            </div>
          </div>

          {/* Due Date */}
          <div className="col-md-6">
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-calendar-check text-danger me-2"></i>
                <small className="text-muted text-uppercase fw-semibold">Due Date</small>
              </div>
              <div className="fw-semibold">{formatDate(task.dueDate)}</div>
            </div>
          </div>

          {/* Dependencies */}
          <div className="col-md-6">
            <div className="p-3 bg-light rounded">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-diagram-3 text-warning me-2"></i>
                <small className="text-muted text-uppercase fw-semibold">Dependencies</small>
              </div>
              <div className="fw-semibold">
                {Array.isArray(task.dependencies) ? task.dependencies.length : 0} task{task.dependencies?.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button className="btn btn-primary" onClick={onEdit}>
            <i className="bi bi-pencil me-2"></i>
            Edit Task
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            <i className="bi bi-x-lg me-2"></i>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskForm;
