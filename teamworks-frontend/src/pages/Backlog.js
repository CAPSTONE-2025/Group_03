import React, { useState, useEffect } from 'react';
import axios from "axios";
import AddTaskForm from '../components/AddTaskForm';
import EditTaskForm from '../components/EditTaskForm';

const API_URL = "http://localhost:5000/backlog";

function Backlog() {
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [editingTask, setEditingTask] = useState(null);

    useEffect(()=> {
        axios.get(API_URL)
        .then((response) => setTasks(response.data))
        .catch((error) => console.error("Error fetching tasks:", error));
    }, []);


    // CREATE (POST)
    const handleAddTask = async (newTask) => {
        try {
            const response = await axios.post(API_URL, newTask);
            newTask.id = response.data.id;

            // Construct the new task with the actual Id from the DB
            const createdTask = {
                ...newTask,
                id: response.data.id,
            }

            //update the state with the new task
            setTasks([...tasks, createdTask]);
            setShowForm(false);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    }

    const handleRowClick = (task) => {
        setEditingTask(task);
        setShowForm(false);
      };

    
    // UPDATE (PUT)
    const handleEditTask = async (updatedTask) => {
        try {
            const response = await axios.put(`${API_URL}/${updatedTask.id}`, updatedTask);
            console.log("Task updated:", response.data);

            setTasks((prevTasks) => 
                prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
            );

            setEditingTask(null);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };


    const handleSelectTask = (taskId) => {
        // If the user selects the same task again, we can unselect it. Otherwise, select the new task.
        setSelectedTaskId((prevId) => (prevId === taskId ? null : taskId));
      };


    // DELETE (DELETE)
    const handleDeleteTask = async () => {
        if (!selectedTaskId) {
            alert("Please select a task to delete.");
        return;
        }

        try {
            const response = await axios.delete(`${API_URL}/${selectedTaskId}`);
            console.log("Task deleted:", response.data);

            // Remove the task from local state
            setTasks((prevTasks) => 
                prevTasks.filter((task) => task.id !== selectedTaskId)
            );

            // Clear the selection
            setSelectedTaskId(null);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };


  return (
    <div className="container mt-4 ">
        <div className="row">
            <div className={(showForm || editingTask) ? "col-md-7" : "col-md-12"}>
                <table class="table table-striped table-hover mx-auto ">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">ID</th>
                            <th scope="col">Title</th>
                            <th scope="col">Label</th>
                            <th scope="col">Status</th>
                            <th scope="col">Priority</th>
                            <th scope="col">Assigned To</th>
                            <th scope="col">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task=> (
                            <tr key={task.id}
                            onClick={() => handleRowClick(task)} 
                            style={{ cursor: 'pointer' }}
                            >
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTaskId === task.id} 
                                        onChange={()=>handleSelectTask(task.id)}
                                    />
                                </td>
                                <td>{task.id}</td>
                                <td >{task.title}</td>
                                <td>{task.label}</td>
                                <td>{task.status}</td>
                                <td>{task.priority}</td>
                                <td>{task.assignedTo}</td>
                                <td>{task.dueDate}</td>
                            </tr>
                        )))}
                    </tbody>
                </table>
                <div className="d-flex justify-content-end m-2">
                    <button 
                        type="button" 
                        class="btn btn-primary me-2" 
                        onClick={()=>{setShowForm(true); setEditingTask(null);}}
                    >
                        Add
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={handleDeleteTask}
                    >
                        Delete
                    </button>
                </div>
            </div>


            {showForm && (<div className="col-md-5">
                <AddTaskForm onAdd={handleAddTask} onCancel={()=>setShowForm(false)} />
            </div>)}

            {editingTask && (
                <div className="col-md-5">
                    <EditTaskForm 
                        task={editingTask} 
                        onEdit={handleEditTask} 
                        onCancel={() => setEditingTask(null)} 
                    />
                </div>
            )}

        </div>
    </div>
  );
}

export default Backlog;