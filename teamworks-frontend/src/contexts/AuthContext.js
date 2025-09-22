import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const buildFullName = (u) => {
    if (!u) return null;
    if (!u.fullName && (u.firstName || u.lastName)) {
      return { ...u, fullName: `${u.firstName || ""} ${u.lastName || ""}`.trim() };
    }
    return u;
  };

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          let userData = JSON.parse(storedUser);
          userData = buildFullName(userData);

          if (userData && userData.id) {
            setUser(userData);
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

    const handleStorageChange = (e) => {
      if (e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogin = (userData) => {
    const normalizedUser = buildFullName(userData);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        handleLogin,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);