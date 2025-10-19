import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../Dashboard.css';

const DashboardCalendar = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [loading, setLoading] = useState(true);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/projects`);
        setProjects(response.data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        // Mock data for demonstration
        setProjects([
          { id: 1, name: 'Website Redesign', owner: { firstName: 'John', lastName: 'Doe' } },
          { id: 2, name: 'Mobile App', owner: { firstName: 'Jane', lastName: 'Smith' } },
          { id: 3, name: 'Database Migration', owner: { firstName: 'Mike', lastName: 'Johnson' } }
        ]);
      }
    };
    fetchProjects();
  }, []);

  // Fetch events/tasks for calendar
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Fetch tasks from all projects
        const allEvents = [];
        for (const project of projects) {
          try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/projects/${project.id}/backlog`);
            const tasks = response.data.map(task => ({
              ...task,
              projectName: project.name,
              projectId: project.id
            }));
            allEvents.push(...tasks);
          } catch (error) {
            console.error(`Failed to fetch tasks for project ${project.id}:`, error);
          }
        }
        setEvents(allEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        // Mock data
        setEvents([
          {
            id: 1,
            title: 'Design Review Meeting',
            dueDate: '2024-09-25',
            status: 'In Progress',
            priority: 'High',
            projectName: 'Website Redesign',
            projectId: 1,
            assignedTo: 'John Doe'
          },
          {
            id: 2,
            title: 'API Integration',
            dueDate: '2024-09-26',
            status: 'To Do',
            priority: 'Medium',
            projectName: 'Mobile App',
            projectId: 2,
            assignedTo: 'Jane Smith'
          },
          {
            id: 3,
            title: 'Database Schema Update',
            dueDate: '2024-09-27',
            status: 'In Progress',
            priority: 'High',
            projectName: 'Database Migration',
            projectId: 3,
            assignedTo: 'Mike Johnson'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (projects.length > 0) {
      fetchEvents();
    }
  }, [projects]);

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.dueDate === dateStr);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'in progress': return 'warning';
      case 'to do': return 'primary';
      case 'stuck': return 'danger';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
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
          className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map(event => (
              <div 
                key={event.id}
                className={`event-dot bg-${getStatusColor(event.status)}`}
                title={`${event.title} - ${event.projectName}`}
              ></div>
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

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const todayEvents = getEventsForDate(new Date());

  return (
    <React.Fragment>
    <div className="d-flex flex-column min-vh-100">
      {/* Top Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">TeamWorks</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/my-work">My Work</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/calendar">Calendar</Link></li>
              <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>

              {/* Projects dropdown */}
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="/" id="projectsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Projects
                </a>
                <ul className="dropdown-menu" aria-labelledby="projectsDropdown">
                  {projects.map((project) => (
                    <li key={project.id} className="dropdown-submenu">
                      <a
                        className="dropdown-item dropdown-toggle"
                        href="#"
                        onClick={(e) => e.preventDefault()}
                      >
                        {project.name}
                      </a>
                      <ul className="dropdown-menu">
                        <li><Link className="dropdown-item" to={`/projects/${project.id}/backlog`}>Backlog</Link></li>
                        <li><Link className="dropdown-item" to={`/projects/${project.id}/kanbanboard`}>Kanban</Link></li>
                        <li><Link className="dropdown-item" to={`/projects/${project.id}/calendar`}>Calendar</Link></li>
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
          <div className="d-flex align-items-center">
            <Link className="nav-link me-3" to="/profile"><i className="bi bi-person fs-5"></i></Link>
            <button className="btn btn-link nav-link p-0" onClick={() => {
              localStorage.removeItem("user");
              window.location.href = '/welcome';
            }}><i className="bi bi-box-arrow-right fs-5"></i></button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow-1 container mt-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Calendar</h1>
              <p className="text-muted mb-0">View your tasks and deadlines in a calendar format.</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              {/* View Mode Toggle */}
              <div className="btn-group" role="group">
                <button 
                  className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('month')}
                >
                  Month
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('week')}
                >
                  Week
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'day' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('day')}
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
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                    <div className="calendar-header">
                      <div className="calendar-day-header">Sun</div>
                      <div className="calendar-day-header">Mon</div>
                      <div className="calendar-day-header">Tue</div>
                      <div className="calendar-day-header">Wed</div>
                      <div className="calendar-day-header">Thu</div>
                      <div className="calendar-day-header">Fri</div>
                      <div className="calendar-day-header">Sat</div>
                    </div>
                    <div className="calendar-body">
                      {renderCalendarGrid()}
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
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
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
                      {todayEvents.map(event => (
                        <div key={event.id} className="list-group-item px-0 border-0">
                          <div className="d-flex align-items-start">
                            <div className="flex-shrink-0">
                              <div className={`badge bg-${getStatusColor(event.status)} me-2`}>
                                {event.status}
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">{event.title}</h6>
                              <p className="mb-1 text-muted small">{event.projectName}</p>
                              <div className="d-flex align-items-center justify-content-between">
                                <small className="text-muted">{event.assignedTo}</small>
                                <span className={`badge bg-${getPriorityColor(event.priority)}`}>
                                  {event.priority}
                                </span>
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
                    .filter(event => {
                      const eventDate = new Date(event.dueDate);
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      return eventDate > today && eventDate <= nextWeek;
                    })
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5)
                    .map(event => (
                      <div key={event.id} className="d-flex align-items-center mb-3">
                        <div className="flex-shrink-0">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                               style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {new Date(event.dueDate).getDate()}
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0 small">{event.title}</h6>
                          <small className="text-muted">{event.projectName}</small>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`badge bg-${getPriorityColor(event.priority)}`}>
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

      {/* Footer */}
      <footer className="footer bg-light text-center py-3 mt-auto">
        <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.</small>
      </footer>
    </div>
    </React.Fragment>
  );
};

export default DashboardCalendar;
