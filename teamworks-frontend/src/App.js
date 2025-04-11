import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
//import TaskCalendar from './components/Calendar';
import CalendarPage from './pages/Calendar';
import BacklogPage from './pages/Backlog';
import SignUp from './pages/Signup';
import WelcomePage from './pages/WelcomePage'; 
import Login from './pages/Login'; 
import KanbanBoardPage from './pages/KanbanBoard';
import ProfilePage from "./pages/Profile";

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  return (
    <Router>
      {/* Navigation Bar - Only shown after authentication */}
      {isAuthenticated && (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <div className="container">
            <Link className="navbar-brand" to="/">TeamWorks</Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/">Home</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/about">About</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/backlog">Backlog Board</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/kanbanboard">Kanban Board</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/calendar">Calendar</Link>
                </li>
              </ul>
            </div>
            <Link className="nav-link" to="/profile">Profile</Link>
          </div>
        </nav>
      )}

      {/* Page Routes */}
      <div className="container mt-4">
        <Routes>
          <Route path="/welcome" element={<WelcomePage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/signup" element={<SignUp setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          {isAuthenticated ? (
            <>
              <Route path="/home" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/backlog" element={<BacklogPage />} />
              <Route path="/kanbanboard" element={<KanbanBoardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}

          <Route
            path="/"
            element={isAuthenticated ? <HomePage /> : <Navigate to="/welcome" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;