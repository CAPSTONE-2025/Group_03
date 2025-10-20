import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      console.log("Checking auth, stored user:", storedUser);
      if (storedUser) {
        try {
          let userData = JSON.parse(storedUser);
          userData = buildFullName(userData);

          if (userData && userData.id) {
            console.log("User authenticated from localStorage:", userData);
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            console.log("Invalid user data, removing from localStorage");
            localStorage.removeItem("user");
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
          setIsAuthenticated(false);
        }
      } else {
        console.log("No stored user found");
        setIsAuthenticated(false);
      }
      setIsLoading(false);
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
    console.log("handleLogin called with:", userData);
    const normalizedUser = buildFullName(userData);
    console.log("Normalized user:", normalizedUser);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    console.log("User saved to localStorage");
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
        isLoading,
        handleLogin,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);