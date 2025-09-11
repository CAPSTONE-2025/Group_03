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
          dueDate: task.dueDate, // Use dueDate for event date
          assignedTo: task.assignedTo,
          label: task.label,
          priority: task.priority,
          description: task.description,
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
      {/* Highlights the date with events */}
      <style>
        {`
        .highlight-tile abbr {
          visibility: hidden;
          position: absolute;
        }
        .react-calendar__tile {
          aspect-ratio: 1 / 1;        /* forces tile to be square */
          padding: 0.15em;            /* optional: adjust spacing */
        }

      `}
      </style>

      <h3 className="mb-3">Project Calendar</h3>
      <div className="mb-4">
        <Calendar onChange={setDate} value={date}
          tileClassName={({ date, view }) => {
            const formattedDate = date.toISOString().split("T")[0];
            if (events.some(event => event.dueDate === formattedDate)) {
              return "highlight-tile";
            }
          }}
          tileContent={({ date, view }) => {
            const formattedDate = date.toISOString().split("T")[0];
            if (events.some(event => event.dueDate === formattedDate)) {             
              return (
                <div
                  style={{
                    width: "70%",              // relative to tile size
                    height: "70%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#4292ddff",
                    color: "white",
                    borderRadius: "50%",
                    margin: "auto",
                  }}
                >
                  {date.getDate()}
                </div>
              );
            }
          }}
        />
      </div>
      <h3>Events on {date.toDateString()}</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",   // allows cards to move to next line if needed
          gap: "16px",        // space between cards
          justifyContent: "flex-start", // or center/space-between
          border: "2px black dashed" // for understanding how much space this div takes
        }}>
        {events.filter(event => event.dueDate === date.toISOString().split("T")[0]).map(event => (
          <div
            key={event.id}
            className="card rounded-3 p-3"
            style={{
              borderLeft: "6px solid #bdc7d2ff",
              // boxShadow: "4px 4px 6px rgba(0, 0, 0, 0.35)" 
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "4px 4px 6px rgba(0, 0, 0, 0.35)";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <h5 className="card-title mb-2">{event.title}</h5>
            <p className="mb-1">
              <strong>Due:</strong> {event.dueDate}
            </p>
            <p className="mb-1">
              <strong>Assigned To:</strong> {event.assignedTo}
            </p>
            <p className="mb-1">
              <strong>Label:</strong> {event.label}
            </p>
            <p className="mb-1">
              <strong>Priority:</strong> {event.priority}
            </p>
            <p className="mb-0">
              <strong>Description:</strong> {event.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskCalendar;
