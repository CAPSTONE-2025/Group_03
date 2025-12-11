import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

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
      const storedToken = localStorage.getItem("access_token");
      const storedUserId = localStorage.getItem("user_id");
      // console.log("Checking auth, stored user:", {
      //   user: storedUser,
      //   JWTtoken: storedToken,
      //   userId: storedUserId,
      // });
      if (storedUser) {
        try {
          let userData = JSON.parse(storedUser);
          userData = buildFullName(userData);

          if (userData && userData.id) {
            setUser(userData);
            setIsAuthenticated(true);
            setToken(storedToken);
          } else {
            // console.log("Invalid user data, removing from localStorage");
            localStorage.removeItem("user");
            setIsAuthenticated(false);
            setToken(null);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setToken(null);
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
    const normalizedUser = buildFullName(userData);
    const storedToken = localStorage.getItem("access_token");
    // console.log("Normalized user:", normalizedUser);
    setUser(normalizedUser);
    setIsAuthenticated(true);
    setToken(storedToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    // if (navigate) navigate("/login"); do this later. navigate back to login page
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
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);