import React, { useEffect, useState, useCallback } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.id) {
        if (!ignore) { setProjects([]); setLoadingProjects(false); }
        return;
      }
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/projects/${user.id}`
        );
        if (!ignore) setProjects(res.data || []);
      } catch (e) {
        console.error("Navbar projects fetch failed:", e);
        if (!ignore) setProjects([]);
      } finally {
        if (!ignore) setLoadingProjects(false);
      }
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  // if you had a rogue contenteditable causing the caret, you can keep this:
  // useEffect(() => {
  //   document.querySelectorAll("[contenteditable],[contentEditable='true']").forEach(el => {
  //     el.removeAttribute("contenteditable");
  //     el.removeAttribute("contentEditable");
  //   });
  // }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/welcome", { replace: true });
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">TeamWorks</Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">Home</Link>
              </li>

              {/* Projects dropdown (global) */}
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link"
                  id="projectsDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Projects
                </button>
                <ul className="dropdown-menu" aria-labelledby="projectsDropdown" style={{ minWidth: 300 }}>
                  {loadingProjects && (
                    <li className="px-3 py-2 text-muted small">Loading…</li>
                  )}

                  {!loadingProjects && projects.length === 0 && (
                    <li className="px-3 py-2 text-muted small">No projects yet</li>
                  )}

                  {!loadingProjects && projects.map((p) => (
                    <li key={p.id} className="px-2">
                      <div className="dropdown-item d-flex flex-column align-items-start">
                        <div className="fw-semibold text-truncate" title={p.name}>{p.name}</div>
                        <div className="mt-1 d-flex gap-2">
                          <Link className="btn btn-sm btn-outline-primary" to={`/projects/${p.id}/backlog`}>
                            Backlog
                          </Link>
                          <Link className="btn btn-sm btn-outline-success" to={`/projects/${p.id}/kanbanboard`}>
                            Kanban
                          </Link>
                          <Link className="btn btn-sm btn-outline-info" to={`/projects/${p.id}/calendar`}>
                            Calendar
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}

                  <li><hr className="dropdown-divider" /></li>
                  <li className="px-2">
                    {/* Route to home with a query to open the create-project modal if you want */}
                    <Link className="dropdown-item text-primary" to="/?new=1">
                      + Create Project
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/calendar">Calendar</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/about">About</Link>
              </li>
            </ul>

            <div className="d-flex align-items-center">
              <Link className="nav-link me-3" to="/profile">
                <i className="bi bi-person fs-5" />
              </Link>
              <button className="btn btn-link nav-link p-0" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right fs-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow-1">
        <Outlet />
      </main>

      <footer className="footer bg-light text-center py-3 mt-auto">
        <small>&copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary.</small>
      </footer>
    </div>
  );
}