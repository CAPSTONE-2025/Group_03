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
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // Check authentication state on component mount
  React.useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("user");
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("user"); // Clear user data from localStorage
    // Redirect to welcome page
    window.location.href = '/welcome';
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  return (
    <div>
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
      )}

      {/* Page Routes */}
      <div className="container mt-4">
        <Routes>
          <Route path="/welcome" element={<WelcomePage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/signup" element={<SignUp setIsAuthenticated={handleLogin} />} />
          <Route path="/login" element={<Login setIsAuthenticated={handleLogin} />} />
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

    <footer className="footer bg-light text-center py-3 mt-4 fixed-bottom">
          <small>
            &copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.
          </small>
    </footer>
    </div>
  );
}

export default App;