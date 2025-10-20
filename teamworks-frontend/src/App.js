import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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
import axios from "axios";

function AppContent() {
  const { isAuthenticated, user, handleLogout, isLoading } = useAuth();
  
  console.log("AppContent render - isAuthenticated:", isAuthenticated, "user:", user, "isLoading:", isLoading);

  // Show loading spinner while checking authentication
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
          <>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/home" element={<DashboardHome />} />
            <Route path="/calendar" element={<DashboardCalendar />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/projects/:projectId/calendar" element={<CalendarPage />} />
            <Route path="/projects/:projectId/backlog" element={<BacklogPage />} />
            <Route path="/projects/:projectId/kanbanboard" element={<KanbanBoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/welcome" />} />
        )}
      </Routes>
    </Router>
  );
}

// ✅ Wrap with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;