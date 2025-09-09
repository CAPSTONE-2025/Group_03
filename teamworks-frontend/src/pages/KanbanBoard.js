import React, { useState, useEffect } from 'react';
import axios from "axios";
const BACKLOG_URL = `${process.env.REACT_APP_API_URL}/api/backlog`;

function KanbanBoard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {

                const response = await axios.get("http://localhost:5001/backlog");

                setTasks(response.data);
            } catch (error) {
                console.error("Error fetching tasks:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const columns = [
        { status: "To Do", color: "#f8d7da" },
        { status: "In Progress", color: "#fff3cd" },
        { status: "Done", color: "#d4edda" },
    ];

    const handleStatusChange = async (taskId, newStatus) => {
        try {

            await axios.put(`http://localhost:5001/backlog/${taskId}`, { status: newStatus });


            const updatedTasks = tasks.map(task =>
                task.id === taskId ? { ...task, status: newStatus } : task
            );
            setTasks(updatedTasks);
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update task status.");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error fetching tasks: {error.message}</div>;

    return (
        <div className="container mt-4">
            <h3 className="text-center mb-3">Kanban Board</h3>

            <div className="row">
                {columns.map((column) => (
                    <div className="col-md-4" key={column.status}>
                        <div
                            className="p-3 mb-3"
                            style={{ backgroundColor: column.color, borderRadius: "10px" }}
                        >
                            <h4 className="text-center">{column.status}</h4>

                            {tasks
                                .filter((task) => task.status === column.status)
                                .map((task) => (
                                    <div key={task.id} className="card p-3 mb-3 shadow-sm">
                                        <h5>{task.title}</h5>

                                        <select
                                            className="form-select mb-2"
                                            value={task.status}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                        >
                                            {columns.map((col) => (
                                                <option key={col.status} value={col.status}>
                                                    {col.status}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <span className="badge bg-primary">{task.label}</span>
                                            <span className="badge bg-info">{task.priority}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="badge bg-secondary">{task.dueDate}</span>
                                            <span className="badge bg-dark">{task.assignedTo}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default KanbanBoard;
