const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (userId) headers["X-User-Id"] = userId;

  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  // userdata is cleared when 401 error occurs. localStorage has no user data upon 401 error
  if (res.status === 401) {
    // token expired/invalid — clear and let app handle redirect
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user");
  }
  return res;
}

