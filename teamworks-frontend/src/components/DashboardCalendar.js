import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import axios from "axios";
import "../Dashboard.css";

const DashboardCalendar = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'day'
  const [loading, setLoading] = useState(true);

  // Fetch projects
  useEffect(() => {
    if (!user?.id) return;
    const fetchProjects = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        setProjects(response.data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    fetchProjects();
  }, [user]);

  // Fetch events/tasks for calendar
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    const fetchEvents = async () => {
      // Collect tasks from all projects then set events once
      const allTasks = [];
      for (const project of projects) {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/projects/${project.id}/backlog`
          );
          const tasks = response.data.map((task) => ({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate, // Use dueDate for event date
            assignedTo: task.assignedTo,
            label: task.label,
            priority: task.priority,
            description: task.description,
            status: task.status,
            projectName: project.name,
          }));
          allTasks.push(...tasks);
        } catch (error) {
          console.error("Error fetching tasks:", error);
        }
      }
      setEvents(allTasks);
      setLoading(false);
    };
    fetchEvents();
  }, [projects]);

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => event.dueDate === dateStr);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "in progress":
        return "warning";
      case "to do":
        return "primary";
      case "stuck":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? "today" : ""} ${
            dayEvents.length > 0 ? "has-events" : ""
          }`}
        >
          <div
            className={`day-number ${
              isToday
                ? `bg-${getStatusColor("to do")} text-light`
                : "day-number"
            }`}
          >
            {day}
          </div>
          {/* <div className="day-number ">{day}</div> */}

          <div className="">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={`bg-${getStatusColor(
                  event.status
                )} rounded text-light day-events`}
                title={`${event.title} - ${event.projectName}`}
              >{`${event.title} - ${event.projectName}`}</div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">+{dayEvents.length - 3}</div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };
 const renderWeekView = () => {
   const year = currentDate.getFullYear();
   const month = currentDate.getMonth();

   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);
   const daysInMonth = lastDay.getDate();
   const startingDay = firstDay.getDay();

   const days = [];

   // Add empty cells for days before the first day of the month
   for (let i = 0; i < startingDay; i++) {
     days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
   }

 };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const todayEvents = getEventsForDate(new Date());

  return (
    <React.Fragment>
      <div className="d-flex flex-column min-vh-100">
        {/* Main Content */}
        <div className="flex-grow-1 container mt-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Calendar</h1>
              <p className="text-muted mb-0">
                View your tasks and deadlines in a calendar format.
              </p>
            </div>
            <div className="d-flex align-items-center gap-3">
              {/* View Mode Toggle */}
              <div className="btn-group" role="group">
                <button
                  className={`btn btn-sm ${
                    viewMode === "month" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setViewMode("month")}
                >
                  Month
                </button>
                <button
                  className={`btn btn-sm ${
                    viewMode === "week" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setViewMode("week")}
                >
                  Week
                </button>
                <button
                  className={`btn btn-sm ${
                    viewMode === "day" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setViewMode("day")}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Calendar View */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      {currentDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigateMonth(-1)}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setCurrentDate(new Date())}
                      >
                        Today
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigateMonth(1)}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  {/* Calendar Grid */}
                  <div className="calendar-grid">
                    {viewMode === "month" && (
                      <div className="calendar-header">
                        <div className="calendar-day-header">Sun</div>
                        <div className="calendar-day-header">Mon</div>
                        <div className="calendar-day-header">Tue</div>
                        <div className="calendar-day-header">Wed</div>
                        <div className="calendar-day-header">Thu</div>
                        <div className="calendar-day-header">Fri</div>
                        <div className="calendar-day-header">Sat</div>
                      </div>
                    )}
                    {viewMode === "week" && (
                      <div className="calendar-header">
                        <div className="calendar-day-header">Sun</div>
                        <div className="calendar-day-header">Mon</div>
                        <div className="calendar-day-header">Tue</div>
                        <div className="calendar-day-header">Wed</div>
                        <div className="calendar-day-header">Thu</div>
                        <div className="calendar-day-header">Fri</div>
                        <div className="calendar-day-header">Sat</div>
                      </div>
                    )}
                    <div className="calendar-body">
                      {viewMode === "month" && renderCalendarGrid()}
                      {viewMode === "week" && renderWeekView()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Events Sidebar */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom-0">
                  <h6 className="mb-0">Today's Tasks</h6>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-3">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : todayEvents.length === 0 ? (
                    <div className="text-center py-3">
                      <i className="bi bi-calendar-check fs-1 text-muted mb-2"></i>
                      <p className="text-muted mb-0">No tasks due today</p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {todayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="card rounded-3 p-3"
                          style={{
                            borderLeft: "6px solid #bdc7d2ff",
                          }}
                        >
                          <div className="d-flex align-items-start">
                            <div className="flex-shrink-0">
                              <div
                                className={`badge bg-${getStatusColor(
                                  event.status
                                )} me-2`}
                              >
                                {event.status}
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <strong className="mb-1 text-muted medium">
                                {event.title}
                              </strong>
                              <p className="mb-1 text-muted medium">
                                {event.projectName}
                              </p>
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="mb-1">
                                  <strong>Assigned to:</strong>
                                  <div className="mb-1 text-muted small">
                                    {event.assignedTo}
                                  </div>
                                </div>

                                <span
                                  className={`badge bg-${getPriorityColor(
                                    event.priority
                                  )}`}
                                >
                                  {event.priority}
                                </span>
                              </div>
                              <div className="align-items-center">
                                <strong>Description:</strong>
                                <p className="text-muted">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="card border-0 shadow-sm mt-3">
                <div className="card-header bg-white border-bottom-0">
                  <h6 className="mb-0">Upcoming</h6>
                </div>
                <div className="card-body">
                  {events
                    .filter((event) => {
                      const eventDate = new Date(event.dueDate);
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      return eventDate > today && eventDate <= nextWeek;
                    })
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="d-flex align-items-center mb-3"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              width: "32px",
                              height: "32px",
                              fontSize: "12px",
                            }}
                          >
                            {new Date(event.dueDate).getDate()}
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0 small">{event.title}</h6>
                          <small className="text-muted">
                            {event.projectName}
                          </small>
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`badge bg-${getPriorityColor(
                              event.priority
                            )}`}
                          >
                            {event.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default DashboardCalendar;
