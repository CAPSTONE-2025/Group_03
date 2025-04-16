import React, { useState} from 'react';
import ReactMarkdown from 'react-markdown';

function AddTaskForm({ onAdd, onCancel }) {
    const [newTask, setNewTask] = useState([
        {
            title: "",
            description: "",
            label: "",
            status: "",
            priority: "",
            assignedTo: "",
            dueDate: "",
        }
    ]);

    const handleInputChange = (e) => {
        setNewTask({ ...newTask, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const taskToAdd = { ...newTask, id: Date.now() };
        onAdd(taskToAdd);
        // Clear form fields
        setNewTask({
          title: '',
          description: '',
          label: '',
          status: '',
          priority: '',
          assignedTo: '',
          dueDate: ''
        });
    };

    return (
        <div className="card p-3">
            <h3>Add New Task</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input type="text" className="form-control" id="title" name="title" value={newTask.title} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description (supports Markdown syntax)</label>
                    <textarea rows="8" className="form-control" id="description" name="description" value={newTask.description} onChange={handleInputChange} required />
                    <div className="mt-2 p-2 border bg-light">
                        <strong>Preview:</strong>
                        <ReactMarkdown>{newTask.description}</ReactMarkdown>
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="label">Label</label>
                    <input type="text" className="form-control" id="label" name="label" value={newTask.label} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select className="form-control" id="status" name="status" value={newTask.status} onChange={handleInputChange} required>
                        <option value="">Select Status</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="priority">Priority</label>
                    <select className="form-control" id="priority" name="priority" value={newTask.priority} onChange={handleInputChange} required>
                        <option value="">Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>  
                        <option value="High">High</option>    
                    </select>  
                </div>
                <div className="form-group">
                    <label htmlFor="assignedTo">Assigned To</label>
                    <input type="text" className="form-control" id="assignedTo" name="assignedTo" value={newTask.assignedTo} onChange={handleInputChange} required/>    
                </div>
                <div className="form-group">
                    <label htmlFor="dueDate">Due Date</label>
                    <input type="date" className="form-control" id="dueDate" name="dueDate" value={newTask.dueDate} onChange={handleInputChange} required/>
                </div>
                <div className="d-flex justify-content-end mt-2">
                    <button type="submit" className="btn btn-primary me-2 ">Add Task</button>
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>  
                </div>

            </form>
        </div>
    );

}

export default AddTaskForm;