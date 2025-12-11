import React, { useEffect, useState, useCallback, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "../components/NotificationBell";
import axios from "axios";
import { apiFetch } from "../utils/apiClient";

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }
    try {
      setLoadingProjects(true);
      const res = await apiFetch(`/api/projects/${user.id}`, { method: "GET" });
      const data = await res.json();

      setProjects(data || []);
    } catch (e) {
      console.error("AppLayout.js: Failed to fetch projects:", e);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  // initial + on user change
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // allow pages to signal a refresh
  useEffect(() => {
    const handler = () => fetchProjects();
    window.addEventListener("projects:refresh", handler);
    return () => window.removeEventListener("projects:refresh", handler);
  }, [fetchProjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownContainer = dropdownRef.current;
      if (!dropdownContainer || !isDropdownOpen) return;

      // Check if click is outside the dropdown container
      const isClickInside = dropdownContainer.contains(event.target);

      // Close if click is outside
      if (!isClickInside) {
        setIsDropdownOpen(false);
      }
    };

    // Use mousedown to catch clicks earlier
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);


  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    navigate("/welcome", { replace: true });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-md navbar-light bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">
            TeamWorks
          </Link>

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
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/about">
                  About
                </Link>
              </li>

              {/* Projects dropdown */}
              <li
                className="nav-item dropdown position-relative"
                ref={dropdownRef}
              >
                <button
                  className="nav-link btn btn-link dropdown-toggle"
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                  type="button"
                >
                  Projects
                </button>

                {/* React-controlled dropdown — no Bootstrap JS */}
                {isDropdownOpen && (
                  <ul
                    className="dropdown-menu show"
                    style={{
                      minWidth: 300,
                      maxHeight: "400px",
                      display: "flex",
                      flexDirection: "column",
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        overflowX: "hidden",
                      }}
                    >
                      {loadingProjects && (
                        <li className="px-3 py-2 text-muted small">Loading…</li>
                      )}

                      {!loadingProjects && projects.length === 0 && (
                        <li className="px-3 py-2 text-muted small">
                          No projects yet
                        </li>
                      )}

                      {!loadingProjects &&
                        projects.map((p) => (
                          <li key={p.id} className="px-2">
                            <div className="dropdown-item d-flex flex-column align-items-start">
                              <div
                                className="fw-semibold text-truncate"
                                title={p.name}
                              >
                                {p.name}
                              </div>
                              <div className="mt-1 d-flex gap-2 flex-nowrap">
                                <Link
                                  className="btn btn-sm btn-outline-primary"
                                  to={`/projects/${p.id}/backlog`}
                                  onClick={closeDropdown}
                                >
                                  Backlog
                                </Link>
                                <Link
                                  className="btn btn-sm btn-outline-success"
                                  to={`/projects/${p.id}/kanbanboard`}
                                  onClick={closeDropdown}
                                >
                                  Kanban
                                </Link>
                                <Link
                                  className="btn btn-sm btn-outline-info"
                                  to={`/projects/${p.id}/calendar`}
                                  onClick={closeDropdown}
                                >
                                  Calendar
                                </Link>
                                <Link
                                  className="btn btn-sm btn-outline-warning"
                                  to={`/projects/${p.id}/gantt`}
                                  onClick={closeDropdown}
                                >
                                  Gantt
                                </Link>
                              </div>
                            </div>
                          </li>
                        ))}
                    </div>

                    <li style={{ flexShrink: 0, marginTop: "auto" }}>
                      <hr className="dropdown-divider my-0" />
                    </li>

                    <li className="px-2" style={{ flexShrink: 0 }}>
                      <Link
                        className="dropdown-item text-primary"
                        to="/?new=1"
                        onClick={closeDropdown}
                      >
                        + Create Project
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

              <li className="nav-item">
                <Link className="nav-link" to="/calendar">
                  Calendar
                </Link>
              </li>
            </ul>

            <div className="d-flex align-items-center">
              {/* 🔔 */}
              <NotificationBell />
              <Link className="nav-link me-3" title="Profile" to="/profile">
                <i className="bi bi-person fs-5" />
              </Link>
              <button
                className="btn btn-link nav-link p-0"
                title="Logout"
                onClick={handleLogout}
              >
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
        <small>
          &copy; {new Date().getFullYear()} TeamWorks. Seongjun, Jimbert, Gary,
          Fawad.
        </small>
      </footer>
    </div>
  );
}
