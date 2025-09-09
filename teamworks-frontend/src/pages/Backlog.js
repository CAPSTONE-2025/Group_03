import React, { useState, useEffect } from 'react';
import axios from "axios";
import AddTaskForm from '../components/AddTaskForm';
import TaskForm from '../components/TaskForm';
import EditTaskForm from '../components/EditTaskForm';

const API_URL = "http://localhost:5001/backlog";

function Backlog() {
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(()=> {
        const fetchTasks = async () => {
            try {
                const response = await axios.get(API_URL);
                setTasks(response.data);
            } catch (error) {
                console.error("Error fetching tasks:", error); 
                setError(error);
            } finally {
                setLoading(false);
            }
        }
        fetchTasks();
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
            setError(error);
        }
    }

    const handleRowClick = (task) => {
        setSelectedTask(task);
        setShowForm(false);
        setShowTaskForm(true);
        setIsEditing(false);
        setSelectedTaskId(null);
      };


    const handleSelectTask = (taskId) => {
        // If the user selects the same task again, we can unselect it. Otherwise, select the new task.
        setSelectedTaskId((prevId) => (prevId === taskId ? null : taskId));
      };


    const handleEditTask = async (updatedTask) => {
        try {
          await axios.put(`${API_URL}/${updatedTask.id}`, updatedTask);
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          setSelectedTask(updatedTask); // update task shown
          setIsEditing(false);          // return to view mode
        } catch (error) {
          console.error("Error updating task:", error);
          setError(error);
        }
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
            setError(error);
        }
    };


    if (loading) return <div>Loading...</div>
    if (error) return <div>Error fetching tasks: {error.message}</div>

  return (
    <div className="container mt-4 ">
        <div className="row">
            <div className={(showForm || showTaskForm) ? "col-lg-7 col-md-12" : "col-12"}>
            <div className="table-responsive ">
                <table className="table table-striped table-hover mx-auto">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            {/* <th scope="col">ID</th> */}
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
                                {/* <td>{task.id}</td> */}
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
            </div>
                <div className="d-flex justify-content-end m-2">
                    <button 
                        type="button" 
                        className="btn btn-primary me-2" 
                        onClick={()=>{
                            setShowForm(true);
                            setShowTaskForm(false);
                            setSelectedTask(null);
                        }}
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


            {(showForm || showTaskForm) && (
                <div className="col-lg-5 col-md-12" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                    {showForm && (
                        <AddTaskForm onAdd={handleAddTask} onCancel={() => setShowForm(false)} />
                    )}
                    {showTaskForm && selectedTask && !isEditing && (
                    <TaskForm
                        task={selectedTask}
                        onEdit={() => setIsEditing(true)}
                        onClose={() => {
                        setShowTaskForm(false);
                        setSelectedTask(null);
                        }}
                    />
                    )}

                    {showTaskForm && selectedTask && isEditing && (
                    <EditTaskForm
                        task={selectedTask}
                        onEdit={handleEditTask}
                        onCancel={() => setIsEditing(false)}
                    />
                    )}
                </div>
  
            )}
        </div>
    </div>  
    
    );
}

export default Backlog;