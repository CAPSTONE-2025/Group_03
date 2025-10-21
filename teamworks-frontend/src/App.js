import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AppLayout from "./layouts/AppLayout";
import DashboardHome from './pages/DashboardHome';
import DashboardCalendar from './components/DashboardCalendar';
import AboutPage from './pages/About';
import CalendarPage from './pages/Calendar';
import BacklogPage from './pages/Backlog';
import SignUp from './pages/Signup';
import WelcomePage from './pages/WelcomePage';
import Login from './pages/Login';
import KanbanBoardPage from './pages/KanbanBoard';
import ProfilePage from "./pages/Profile";
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />

        {/* Protected pages */}
        {isAuthenticated ? (
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/home" element={<DashboardHome />} />
            <Route path="/calendar" element={<DashboardCalendar />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
            <Route path="/projects/:projectId/backlog" element={<BacklogPage />} />
            <Route path="/projects/:projectId/kanbanboard" element={<KanbanBoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/welcome" />} />
        )}
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
