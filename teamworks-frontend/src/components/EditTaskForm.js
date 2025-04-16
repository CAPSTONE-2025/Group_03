import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function EditTaskForm({ task, onEdit, onCancel }) {
  // Initialize local state with the task data
  const [editedTask, setEditedTask] = useState(task);

  // When the task prop changes, update the local state accordingly
  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const handleInputChange = (e) => {
    setEditedTask({ ...editedTask, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit(editedTask);
  };

  return (
    <div className="card p-3">
      <h3>Edit Task</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input 
            type="text" 
            className="form-control" 
            id="title" 
            name="title" 
            value={editedTask.title} 
            onChange={handleInputChange} 
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description (supports Markdown syntax)</label>
          <textarea 
            rows="8"
            className="form-control" 
            id="description" 
            name="description" 
            value={editedTask.description} 
            onChange={handleInputChange} 
            required 
          />
          <div className="mt-2 p-2 border bg-light">
            <strong>Preview:</strong>
            <ReactMarkdown>{editedTask.description}</ReactMarkdown>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="label">Label</label>
          <input 
            type="text" 
            className="form-control" 
            id="label" 
            name="label" 
            value={editedTask.label} 
            onChange={handleInputChange} 
          />
        </div>
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select 
            className="form-control" 
            id="status" 
            name="status" 
            value={editedTask.status} 
            onChange={handleInputChange} 
            required
          >
            <option value="">Select Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select 
            className="form-control" 
            id="priority" 
            name="priority" 
            value={editedTask.priority} 
            onChange={handleInputChange} 
            required
          >
            <option value="">Select Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>  
            <option value="High">High</option>    
          </select>  
        </div>
        <div className="form-group">
          <label htmlFor="assignedTo">Assigned To</label>
          <input 
            type="text" 
            className="form-control" 
            id="assignedTo" 
            name="assignedTo" 
            value={editedTask.assignedTo} 
            onChange={handleInputChange} 
            required
          />    
        </div>
        <div className="form-group">
          <label htmlFor="dueDate">Due Date</label>
          <input 
            type="date" 
            className="form-control" 
            id="dueDate" 
            name="dueDate" 
            value={editedTask.dueDate} 
            onChange={handleInputChange} 
            required
          />
        </div>
        <div className="d-flex justify-content-end mt-2">
          <button type="submit" className="btn btn-primary me-2">Save Changes</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default EditTaskForm;