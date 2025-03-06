import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";

const API_URL = "http://127.0.0.1:5000/calendar";

function TaskCalendar() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  // Fetch events from backend
  useEffect(() => {
    axios.get(API_URL)
      .then((response) => setEvents(response.data))
      .catch((error) => console.error("Error fetching events:", error));
  }, []);

  // Handle adding an event
  const addEvent = async () => {
    const title = prompt("Enter event title:");
    if (!title) return;

    const newEvent = { title, date: date.toISOString().split("T")[0] };
    try {
      const response = await axios.post(API_URL, newEvent);
      setEvents([...events, { ...newEvent, id: response.data.id }]);
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  // Handle deleting an event
  const deleteEvent = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setEvents(events.filter(event => event.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  return (
    <div>
      <h2>Project Calendar</h2>
      <Calendar onChange={setDate} value={date} />
      <button onClick={addEvent} className="btn btn-primary mt-2">Add Event</button>
      <h3>Events on {date.toDateString()}</h3>
      <ul>
        {events.filter(event => event.date === date.toISOString().split("T")[0]).map(event => (
          <li key={event.id}>
            {event.title} - {event.description}
            <button onClick={() => deleteEvent(event.id)} className="btn btn-danger btn-sm">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskCalendar;
