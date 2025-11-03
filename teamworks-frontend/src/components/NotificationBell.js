import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => {
    const ownerUnread = (notes || []).filter(n => !n.isRead).length;
    const inviteCount = (invites || []).length;
    return inviteCount + ownerUnread;
  }, [invites, notes]);

  // Ensure X-User-Id header for protected endpoints
  useEffect(() => {
    if (user?.id) {
      axios.defaults.headers.common["X-User-Id"] = user.id;
    } else {
      delete axios.defaults.headers.common["X-User-Id"];
    }
  }, [user?.id]);

  const fetchAll = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // invitations for me (by email)
      const invRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/invitations`,
        { params: { email: user.email } }
      );
      setInvites(invRes.data || []);

      // owner notifications (if I'm an owner of something)
      const nRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/notifications`
      );
      setNotes(nRes.data || []);
    } catch (e) {
      console.error("Notification fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user?.email]);

  const respond = async (projectId, action) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/invitations/respond`, {
        projectId,
        email: user.email,
        action, // "accept" | "decline"
      });
      // refresh UI
      await fetchAll();

      // If accepted, refresh the navbar projects immediately
      if (action === "accept") {
        window.dispatchEvent(new Event("projects:refresh"));
      }
    } catch (e) {
      console.error("Respond failed:", e.response?.data || e.message);
      alert(e.response?.data?.error || "Failed to respond to invitation.");
    }
  };

  const markRead = async (nid) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/notifications/${nid}/read`);
      setNotes(notes.map(n => n.id === nid ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error("Mark read failed:", e);
    }
  };

  return (
    <div className="nav-item dropdown me-3">
      <button
        className="nav-link btn btn-link position-relative"
        id="notifDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title="Notifications"
      >
        <i className="bi bi-bell fs-5" />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: "0.65rem" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="notifDropdown" style={{ minWidth: 360 }}>
        <li className="px-3 py-2">
          <div className="d-flex justify-content-between align-items-center">
            <strong>Notifications</strong>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchAll} disabled={loading}>
              {loading ? "…" : "Refresh"}
            </button>
          </div>
        </li>
        <li><hr className="dropdown-divider" /></li>

        {/* Invitations for me */}
        <li className="px-3 py-2 text-muted small">Invitations</li>
        {invites.length === 0 && (
          <li className="px-3 pb-2 text-muted small">No invitations</li>
        )}
        {invites.map((inv, idx) => (
          <li key={`${inv.projectId}-${idx}`} className="px-3 py-2">
            <div className="d-flex flex-column">
              <div className="fw-semibold">{inv.projectName}</div>
              <div className="small text-muted">Invited: {inv.invitedAt ? inv.invitedAt.split("T")[0] : "—"}</div>
              <div className="mt-2 d-flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => respond(inv.projectId, "accept")}>Accept</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => respond(inv.projectId, "decline")}>Decline</button>
              </div>
            </div>
          </li>
        ))}

        <li><hr className="dropdown-divider" /></li>

        {/* Owner notifications */}
        <li className="px-3 py-2 text-muted small">Owner updates</li>
        {notes.length === 0 && (
          <li className="px-3 pb-2 text-muted small">No updates</li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="px-3 py-2">
            <div className="d-flex justify-content-between align-items-start">
              <div className="me-2">
                <div className="small">{n.message}</div>
                <div className="small text-muted">{n.createdAt ? n.createdAt.split("T")[0] : "—"}</div>
              </div>
              {!n.isRead && (
                <button className="btn btn-sm btn-outline-success" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}