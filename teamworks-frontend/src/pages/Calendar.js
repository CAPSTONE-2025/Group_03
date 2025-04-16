import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_API_URL}/api/backlog`;

function TaskCalendar() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  // Fetch events from backend
  useEffect(() => {
    const fetchTasks = async () => {
        try {
            const response = await axios.get(API_URL);
            const tasks = response.data.map(task => ({
                id: task.id,
                title: task.title,
                date: task.dueDate, // Use dueDate for event date
                assignedTo: task.assignedTo
              }));
            setEvents(tasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }

    fetchTasks();
  }, []);


  return (
    <div className="container mt-4 d-flex flex-column align-items-center">
      <h3 className="mb-3">Project Calendar</h3>
      <div className="mb-4">
        <Calendar onChange={setDate} value={date} />
      </div>
      <h3>Events on {date.toDateString()}</h3>
      <ul>
        {events.filter(event => event.date === date.toISOString().split("T")[0]).map(event => (
          <li key={event.id}>
            {event.title} (Assigned to: {event.assignedTo})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskCalendar;
