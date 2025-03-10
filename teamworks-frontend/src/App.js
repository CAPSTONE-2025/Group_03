import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import TaskCalendar from './components/Calendar';
import BacklogPage from './pages/Backlog';

function App() {
  return (
    <Router>
      {/* Navigation Bar */}
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
                <Link className="nav-link" to="/calendar">Calendar</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Page Routes */}
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/calendar" element={<TaskCalendar />} />
          <Route path="/backlog" element={<BacklogPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
