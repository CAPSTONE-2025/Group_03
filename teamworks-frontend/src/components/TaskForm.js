import React from 'react';
import ReactMarkdown from 'react-markdown';

function TaskForm({ task, onEdit, onClose, memberLookup = {} }) {

    return (
        <div className="card p-3">
            <h3>Task Information</h3>
            <p className="mb-1"><strong>Title:</strong></p> 
            <p>{task.title}</p>
            <strong>Description:</strong>
            <div className="border p-2 bg-light mb-1">
                <ReactMarkdown>{task.description}</ReactMarkdown>
            </div>
            <p className="mb-1"><strong>Label:</strong></p> 
            <div className="d-flex gap-2 mb-2">
                <span className="badge bg-primary">{task.label}</span>
            </div>
            <p className="mb-1"><strong>Status:</strong></p> 
            <p>{task.status}</p>
            <p className="mb-1"><strong>Priority:</strong></p> 
            <p>{task.priority}</p>
            <p className="mb-1"><strong>Assigned To:</strong></p> 
            {/* <p>{task.assignedTo}</p> */}
            <p>{memberLookup[String(task.assignedTo)] || task.assignedTo}</p>
            <p className="mb-1"><strong>Start Date:</strong></p> 
            <p>{task.startDate}</p>
            <p className="mb-1"><strong>Due Date:</strong></p> 
            <p>{task.dueDate}</p>
            <p className="mb-1"><strong>Progress:</strong></p>
            <p>{Math.round(task.progress ?? 0)}%</p>
            <p className="mb-1"><strong>Dependencies:</strong></p>
            <p>{Array.isArray(task.dependencies) ? task.dependencies.length : 0}</p>

            <div className="d-flex justify-content-end mt-3">
                <button className="btn btn-primary me-2" onClick={onEdit}>Edit</button>
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
        </div>

        
    );

}

export default TaskForm;