import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/Home';
import AboutPage from './pages/About';
import CalendarPage from './pages/Calendar';
import BacklogPage from './pages/Backlog';
import SignUp from './pages/Signup';
import WelcomePage from './pages/WelcomePage'; 
import Login from './pages/Login'; 
import KanbanBoardPage from './pages/KanbanBoard';
import ProfilePage from "./pages/Profile";
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsAuthenticated(user?.id ? true : false);
      } catch {
        localStorage.removeItem("user");
        setIsAuthenticated(false);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    window.location.href = '/welcome';
  };

  const handleLogin = () => setIsAuthenticated(true);

  return (
    <Router>
      <Routes>
        {/* Public pages - NO navbar */}
        <Route path="/welcome" element={<WelcomePage setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<SignUp setIsAuthenticated={handleLogin} />} />
        <Route path="/login" element={<Login setIsAuthenticated={handleLogin} />} />

        {/* Protected pages - SHOW navbar */}
        {isAuthenticated ? (
          <Route
            path="*"
            element={
              <div className="d-flex flex-column min-vh-100">
                {/* Navbar */}
                <nav className="navbar navbar-expand-lg navbar-light bg-light">
                  <div className="container">
                    <Link className="navbar-brand" to="/">TeamWorks</Link>
                    <div className="collapse navbar-collapse show">
                      <ul className="navbar-nav me-auto">
                        <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/backlog">Backlog Board</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/kanbanboard">Kanban Board</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/calendar">Calendar</Link></li>
                      </ul>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link className="nav-link me-3" to="/profile" title="Profile">
                        <i className="bi bi-person fs-5"></i>
                      </Link>
                      <button
                        className="btn btn-link nav-link p-0"
                        onClick={handleLogout}
                        title="Logout"
                        style={{ border: 'none', background: 'none' }}
                      >
                        <i className="bi bi-box-arrow-right fs-5"></i>
                      </button>
                    </div>
                  </div>
                </nav>

                {/* Main content */}
                <div className="flex-grow-1 container mt-4">
                  <Routes>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/backlog" element={<BacklogPage />} />
                    <Route path="/kanbanboard" element={<KanbanBoardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/" element={<HomePage />} />
                  </Routes>
                </div>

                {/* Footer */}
                <footer className="footer bg-light text-center py-3 mt-auto">
                  <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.</small>
                </footer>
              </div>
            }
          />
        ) : (
          <Route path="*" element={<Navigate to="/welcome" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;