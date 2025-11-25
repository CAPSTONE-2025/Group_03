import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useContext,
  useCallback,
} from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "./GanttView.css";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NORMALIZED_API_ROOT = (() => {
  const raw = (process.env.REACT_APP_API_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
})();

const buildApiPath = (path = "") => {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${NORMALIZED_API_ROOT}${suffix}`;
};

const parseIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map((segment) => parseInt(segment, 10));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
    }
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp);
    }
  }
  return null;
};

const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readableDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusToClass = (status = "") =>
  `status-${status.toLowerCase().replace(/\s+/g, "-")}`;

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.error || err?.message || fallback;

function GanttView() {
  const { projectId } = useParams();
  const { user } = useContext(AuthContext);

  const ganttContainerRef = useRef(null);
  const selectionEventsRef = useRef([]);
  const editEventsRef = useRef([]);
  const hasInitializedRef = useRef(false);
  const [isGanttInitialized, setIsGanttInitialized] = useState(false);

  const [project, setProject] = useState(null);
  const [memberLookup, setMemberLookup] = useState({});
  const [memberOptions, setMemberOptions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [viewMode, setViewMode] = useState("week");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [dependencyDraft, setDependencyDraft] = useState("");

  const TASKS_ENDPOINT = buildApiPath(`/api/projects/${projectId}/backlog`);

  // Ensure auth header is always present for guarded endpoints
  useEffect(() => {
    if (user?.id) {
      axios.defaults.headers.common["X-User-Id"] = user.id;
    } else {
      delete axios.defaults.headers.common["X-User-Id"];
    }
  }, [user]);

  const isEditor = useMemo(() => {
    if (!project || !user?.id) return false;
    if (String(project.owner) === String(user.id)) return true;
    const roles = project.roles || [];
    if (Array.isArray(roles) && roles.length > 0) {
      return roles.some(
        (role) =>
          String(role.userId) === String(user.id) && role.canEditGantt === true
      );
    }
    return Array.isArray(project.members)
      ? project.members.some((memberId) => String(memberId) === String(user.id))
      : false;
  }, [project, user]);

  const isReadOnly = !isEditor;

  const normalizeTask = useCallback((task) => {
    return {
      ...task,
      progress: Number(task.progress ?? 0),
      dependencies: Array.isArray(task.dependencies)
        ? task.dependencies.map(String)
        : [],
      assignedTo: task.assignedTo ? String(task.assignedTo) : "",
    };
  }, []);

  const fetchProjectAndMembers = useCallback(async () => {
    const projectResponse = await axios.get(
      buildApiPath(`/api/project/${projectId}`)
    );
    const projectPayload = projectResponse.data || {};
    setProject(projectPayload);

    const usersResponse = await axios.get(buildApiPath("/api/users"));
    const allUsers = Array.isArray(usersResponse.data)
      ? usersResponse.data
      : [];

    const projectMembers = Array.isArray(projectPayload.members)
      ? projectPayload.members.map(String)
      : [];

    const memberList = allUsers.filter((userDoc) =>
      projectMembers.includes(String(userDoc.id))
    );

    const lookup = {};
    const options = [];
    memberList.forEach((member) => {
      const displayName = (member.name || "").trim() || member.email || "";
      const memberId = String(member.id);
      lookup[memberId] = displayName;
      options.push({
        id: memberId,
        name: displayName,
        email: member.email || "",
      });
    });
    setMemberLookup(lookup);
    setMemberOptions(options);

    return projectPayload;
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
    const response = await axios.get(TASKS_ENDPOINT);
    const payload = Array.isArray(response.data) ? response.data : [];
      const normalized = payload.map((item) => {
        const mapped = normalizeTask(item);
        return mapped;
      });
      setTasks(normalized);
    } catch (taskErr) {
      console.error("Failed to fetch tasks for gantt", taskErr);
      throw taskErr;
    }
  }, [TASKS_ENDPOINT, normalizeTask]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchProjectAndMembers();
      await fetchTasks();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchProjectAndMembers, fetchTasks]);

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId, loadData]);

  // Dismiss banners automatically
  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  // Initialise the gantt chart once
  useEffect(() => {
    if (!ganttContainerRef.current) {
      return undefined;
    }
    if (hasInitializedRef.current) {
      return undefined;
    }
    try {
    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.autosize = "y";
    gantt.config.grid_width = 360;
    gantt.config.min_column_width = 40;
    gantt.config.grid_resize = true;
    gantt.config.show_errors = false;
    gantt.config.row_height = 38;
    gantt.config.readonly = isReadOnly;
    gantt.config.fit_tasks = true;
    gantt.config.use_end_date = true;

      
     

      // Initialize locale if not exists
      if (!gantt.locale) {
        gantt.locale = {};
      }
      if (!gantt.locale.labels) {
        gantt.locale.labels = {};
      }

      // Set button labels - only Save, Cancel, Delete
      gantt.locale.labels["gantt_save_btn"] = "Save";
      gantt.locale.labels["gantt_cancel_btn"] = "Cancel";
      gantt.locale.labels["gantt_delete_btn"] = "Delete";
      
      // Set section labels in locale as backup
      gantt.locale.labels["section_description"] = "Task Name";
      gantt.locale.labels["section_time"] = "Time Period";
      gantt.locale.labels["section_status"] = "Status";
      gantt.locale.labels["section_priority"] = "Priority";
      gantt.locale.labels["section_progress"] = "Progress (%)";

      // Configure lightbox sections with explicit labels
      gantt.config.lightbox.sections = [
        { name: "description", height: 70, map_to: "text", type: "textarea", focus: true, label: "Task Name" },
        { name: "time", height: 72, map_to: "auto", type: "duration", label: "Time Period" },
        { name: "status", height: 40, map_to: "status", type: "select", label: "Status", options: [
          { key: "To Do", label: "To Do" },
          { key: "In Progress", label: "In Progress" },
          { key: "Done", label: "Done" }
        ]},
        { name: "priority", height: 40, map_to: "priority", type: "select", label: "Priority", options: [
          { key: "Low", label: "Low" },
          { key: "Medium", label: "Medium" },
          { key: "High", label: "High" }
        ]},
        { name: "progress", height: 50, map_to: "progress", type: "slider", label: "Progress (%)", min: 0, max: 1, step: 0.01 }
      ];
      
      // Set section labels in locale BEFORE configuring sections
      gantt.locale.labels["section_description"] = "Task Name";
      gantt.locale.labels["section_time"] = "Time Period";
      gantt.locale.labels["section_status"] = "Status";
      gantt.locale.labels["section_priority"] = "Priority";
      gantt.locale.labels["section_progress"] = "Progress (%)";
      
      // Override section label template - receives section name as string
      gantt.templates.lightbox_section_label = function(sectionName) {
        // Map section names to labels
        const labelMap = {
          "description": "Task Name",
          "time": "Time Period",
          "status": "Status",
          "priority": "Priority",
          "progress": "Progress (%)"
        };
        
        // Return the label from map or locale, fallback to name
        return labelMap[sectionName] || 
               gantt.locale.labels["section_" + sectionName] || 
               sectionName;
      };
      
      
      // Explicitly configure only 3 action buttons - Save, Cancel, Delete
      gantt.config.lightbox.buttons_left = ["gantt_save_btn", "gantt_cancel_btn"];
      gantt.config.lightbox.buttons_right = ["gantt_delete_btn"];
      
      // Override button text template - only return text for our 3 buttons
      gantt.templates.lightbox_button_text = function(button) {
        // Handle both string IDs and button objects
        const buttonId = typeof button === "string" ? button : (button.id || button);
        
        const labels = {
          "gantt_save_btn": "Save",
          "gantt_cancel_btn": "Cancel",
          "gantt_delete_btn": "Delete"
        };
        
        // Only return text for our configured buttons, return empty for others
        return labels[buttonId] || "";
      };
      

    gantt.config.scale_height = 54;
    gantt.config.scales = [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "day", step: 1, format: "%d" },
    ];

      gantt.templates.task_class = (start, end, task) =>
        statusToClass(task.status);

      const getToday = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      };

      gantt.templates.timeline_cell_class = (task, date) => {
        if (!date) return "";
        const today = getToday();
        const cellDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        return cellDate.getTime() === today.getTime() ? "gantt-today-cell" : "";
      };

      gantt.init(ganttContainerRef.current);
      
      // Set labels again after init to ensure they're applied
      gantt.locale.labels["section_description"] = "Task Name";
      gantt.locale.labels["section_time"] = "Time Period";
      gantt.locale.labels["section_status"] = "Status";
      gantt.locale.labels["section_priority"] = "Priority";
      gantt.locale.labels["section_progress"] = "Progress (%)";
      
      hasInitializedRef.current = true;
      setIsGanttInitialized(true); // Trigger re-render so event handlers useEffect can run
    } catch (initError) {
      console.error("Failed to initialize gantt", initError);
      hasInitializedRef.current = false;
      return undefined;
    }

      // Attach event to intercept lightbox save button and fix labels
      const lightboxOpenId = gantt.attachEvent("onLightbox", function(id) {
        const task = gantt.getTask(id);
        
        // Fix accessibility issues - remove aria-hidden when lightbox is open
        setTimeout(() => {
          // Find the lightbox element and fix accessibility attributes
          const lightbox = document.querySelector('.gantt_cal_light');
          if (lightbox) {
            // Remove aria-hidden and set proper accessibility attributes
            lightbox.removeAttribute('aria-hidden');
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-modal', 'true');
            
            // Get task info for aria-label
            const task = gantt.getTask(id);
            if (task) {
              const taskName = task.text || 'New task';
              const startDate = task.start_date ? new Date(task.start_date).toLocaleDateString() : '';
              const endDate = task.end_date ? new Date(task.end_date).toLocaleDateString() : '';
              const dateRange = startDate && endDate ? ` ${startDate} - ${endDate}` : '';
              lightbox.setAttribute('aria-label', `${taskName}${dateRange}`);
            }
          }
          
          // Update section labels via DOM if needed
          const labels = document.querySelectorAll('.gantt_popup_label, .gantt_popup_control > label');
          labels.forEach((label, index) => {
            const labelMap = ["Task Name", "Time Period", "Status", "Priority", "Progress (%)"];
            if (label.textContent === "undefined" && labelMap[index]) {
              label.textContent = labelMap[index];
            }
          });
          
        }, 100);
        
        // Also fix after a longer delay to catch any delayed rendering
        setTimeout(() => {
          const lightbox = document.querySelector('.gantt_cal_light');
          if (lightbox) {
            lightbox.removeAttribute('aria-hidden');
            lightbox.setAttribute('aria-modal', 'true');
          }
        }, 300);
        
        return true;
      });
      
      // Store the last opened task ID for saving when lightbox closes
      let lastLightboxTaskId = null;
      
      // Track when lightbox opens
      const lightboxOpenId2 = gantt.attachEvent("onLightbox", function(id) {
        lastLightboxTaskId = id;
        return true;
      });
      
      // Also fix accessibility when lightbox closes
      const lightboxCloseId = gantt.attachEvent("onAfterLightbox", function() {
        
        // When lightbox closes, ensure aria-hidden is set back
        setTimeout(() => {
          const lightbox = document.querySelector('.gantt_cal_light');
          if (lightbox && lightbox.style.display === 'none') {
            lightbox.setAttribute('aria-hidden', 'true');
          }
        }, 100);
        return true;
      });

    const selectId = gantt.attachEvent("onTaskSelected", (id) => {
      setSelectedTaskId(String(id));
      return true;
    });
    const unselectId = gantt.attachEvent("onTaskUnselected", () => {
      setSelectedTaskId(null);
      return true;
    });
      // Note: lightboxOpenId and lightboxCloseId are attached in the initialization useEffect
      // They should be tracked separately since they're not in editEventsRef

    hasInitializedRef.current = true;

    return () => {
      selectionEventsRef.current.forEach((eventId) =>
        gantt.detachEvent(eventId)
      );
      selectionEventsRef.current = [];
      editEventsRef.current.forEach((eventId) => gantt.detachEvent(eventId));
      editEventsRef.current = [];
      gantt.clearAll();
    };
  }, [isReadOnly, tasks]);

  // Toggle read-only behaviour
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    gantt.config.readonly = isReadOnly;
    gantt.config.drag_move = !isReadOnly;
    gantt.config.drag_resize = !isReadOnly;
    gantt.config.drag_progress = !isReadOnly;
    gantt.config.drag_links = !isReadOnly;
    gantt.render();
  }, [isReadOnly]);

  const applyScaleConfiguration = useCallback(
    (mode) => {
      if (!hasInitializedRef.current) return;

      if (mode === "day") {
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "day", step: 1, format: "%d" },
        ];
      } else if (mode === "week") {
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "week", step: 1, format: "%W" },
        ];
      } else {
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "year", step: 1, format: "%Y" },
          { unit: "month", step: 1, format: "%F" },
        ];
      }

      gantt.render();
    },
    []
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatch =
        statusFilter === "All" || task.status === statusFilter;
      const assigneeMatch =
        assigneeFilter === "All" ||
        (assigneeFilter === "__unassigned__" && !task.assignedTo) ||
        task.assignedTo === assigneeFilter;
      return statusMatch && assigneeMatch;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  const selectedTask = useMemo(
    () => tasks.find((task) => String(task.id) === String(selectedTaskId)) || null,
    [tasks, selectedTaskId]
  );

  const timelineBounds = useMemo(() => {
    let minDate = null;
    let maxDate = null;
    filteredTasks.forEach((task) => {
      const start = parseIsoDate(task.startDate);
      const end = parseIsoDate(task.dueDate);
      if (start && (!minDate || start < minDate)) {
        minDate = start;
      }
      if (end && (!maxDate || end > maxDate)) {
        maxDate = end;
      }
    });
    return { minDate, maxDate };
  }, [filteredTasks]);

  const { minDate: timelineMinDate, maxDate: timelineMaxDate } = timelineBounds;

  const timelineFocusDate = timelineMinDate;

  const formatRangeLabel = useCallback((mode, start, end) => {
    if (!start || !end) return "No dated tasks yet";

    const formatDay = (date, opts = {}) =>
      date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", ...opts });

    if (mode === "day") {
      if (start.toDateString() === end.toDateString()) {
        return formatDay(start);
      }
      return `${formatDay(start)} – ${formatDay(end)}`;
    }

    if (mode === "week") {
      const fmt = (date) =>
        date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (start.toDateString() === end.toDateString()) {
        return `Week of ${formatDay(start)}`;
      }
      const sameYear = start.getFullYear() === end.getFullYear();
      const endLabel = sameYear
        ? end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: undefined })
        : formatDay(end);
      return `${fmt(start)} – ${endLabel}${sameYear ? `, ${start.getFullYear()}` : ""}`;
    }

    // Month view
    const fmtMonth = (date) =>
      date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return fmtMonth(start);
    }
    return `${fmtMonth(start)} – ${fmtMonth(end)}`;
  }, []);

  const timelineRangeLabel = useMemo(
    () => formatRangeLabel(viewMode, timelineMinDate, timelineMaxDate),
    [viewMode, timelineMinDate, timelineMaxDate, formatRangeLabel]
  );

  useEffect(() => {
    if (selectedTaskId && !filteredTasks.some((t) => String(t.id) === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [filteredTasks, selectedTaskId]);

  useEffect(() => {
    setDependencyDraft("");
  }, [selectedTaskId]);

  const ganttDataset = useMemo(() => {
    return filteredTasks
      .map((task, index) => {
        const startRaw = task.startDate;
        const dueRaw = task.dueDate;
        const start = parseIsoDate(startRaw);
        const due = parseIsoDate(dueRaw);
        if (!start || !due) {
          console.warn("Skipping task with invalid dates", {
            index,
            id: task.id,
            startRaw,
            dueRaw,
          });
          return null;
        }
        const startIso = toIsoDate(start);
        const dueIso = toIsoDate(due);
        const durationDays = Math.max(
          1,
          Math.round((due.getTime() - start.getTime()) / DAY_IN_MS) + 1
        );
        return {
          id: String(task.id),
          text: task.title || "",
          start_date: startIso,
          duration: durationDays,
          end_date: dueIso,
          progress: (Number(task.progress) || 0) / 100,
          status: task.status || "To Do",
          priority: task.priority || "Medium",
        };
      })
      .filter(Boolean);
  }, [filteredTasks, memberLookup]);

  const ganttLinks = useMemo(() => {
    if (!filteredTasks.length) return [];
    const links = [];
    const taskIds = new Set(filteredTasks.map((task) => String(task.id)));
    filteredTasks.forEach((task, index) => {
      const targetId = String(task.id);
      const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
      deps.forEach((dependencyId) => {
        if (!taskIds.has(String(dependencyId))) {
          return;
        }
        const link = {
          id: `${dependencyId}__${targetId}`,
          source: String(dependencyId),
          target: targetId,
          type: 0,
        };
        links.push(link);
      });
    });
    return links;
  }, [filteredTasks]);

  // Render / refresh gantt data whenever dataset changes
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const dataArray = Array.isArray(ganttDataset) ? ganttDataset : [];
    const linksArray = Array.isArray(ganttLinks) ? ganttLinks : [];

    try {
      gantt.clearAll();
      const payload = { data: dataArray, links: linksArray };
      gantt.parse(payload);
      gantt.render();
      gantt.showDate(timelineFocusDate || new Date());
    } catch (ganttError) {
      console.error("Failed to render gantt dataset:", ganttError, {
        dataArray,
        linksArray,
      });
    }
  }, [ganttDataset, ganttLinks, viewMode, timelineFocusDate]);

  useEffect(() => {
    applyScaleConfiguration(viewMode);
  }, [applyScaleConfiguration, viewMode]);

  const refreshTasksQuietly = useCallback(async () => {
    try {
      await fetchTasks();
    } catch (err) {
      setBanner({
        type: "error",
        message: getErrorMessage(err, "Failed to refresh tasks."),
      });
    }
  }, [fetchTasks]);

  // Attach editable events whenever permission changes or Gantt initializes
  useEffect(() => {
    if (typeof gantt === 'undefined') {
      return;
    }
    
    editEventsRef.current.forEach((eventId) => {
      try {
        gantt.detachEvent(eventId);
      } catch (e) {
        // Ignore errors when detaching events
      }
    });
    editEventsRef.current = [];

    if (!hasInitializedRef.current || !isGanttInitialized) {
      return undefined;
    }
    
    if (isReadOnly) {
      return undefined;
    }

    // Simple save function that mimics the backlog approach
    const saveTaskToBackend = async (taskId, ganttTask) => {
      // Convert dates properly
      let startDateObj = ganttTask.start_date;
      if (typeof startDateObj === 'string') {
        startDateObj = parseIsoDate(startDateObj);
      } else if (!(startDateObj instanceof Date)) {
        startDateObj = new Date();
      }
      
      let endDateObj = ganttTask.end_date;
      if (!endDateObj && ganttTask.duration) {
        endDateObj = new Date(startDateObj.getTime() + (ganttTask.duration - 1) * DAY_IN_MS);
      } else if (typeof endDateObj === 'string') {
        endDateObj = parseIsoDate(endDateObj);
      } else if (!(endDateObj instanceof Date) && startDateObj) {
        endDateObj = new Date(startDateObj.getTime() + 7 * DAY_IN_MS);
      }
      
      const startDate = toIsoDate(startDateObj);
      const dueDate = toIsoDate(endDateObj);
      
      // Check if this is a new task (not in backend)
      const existingTask = tasks.find(t => String(t.id) === String(taskId));
      const isNewTask = !existingTask;
      
      if (isNewTask) {
        // Create new task - exactly like backlog does
        const currentMembers = memberOptions.length > 0 ? memberOptions : [];
        const defaultAssignee = currentMembers.length > 0 ? currentMembers[0].id : (user?.id || "");
        
        if (!defaultAssignee) {
          throw new Error("Cannot create task: No assignee available.");
        }
        
        const newTask = {
          title: String(ganttTask.text || "New Task").trim(),
          description: String(ganttTask.description || ""),
          label: String(ganttTask.label || ""),
          status: String(ganttTask.status || "To Do"),
          priority: String(ganttTask.priority || "Medium"),
          assignedTo: String(defaultAssignee),
          startDate: startDate,
          dueDate: dueDate,
          progress: Math.round((ganttTask.progress || 0) * 100),
        };
        
        try {
          const response = await axios.post(TASKS_ENDPOINT, newTask);
          
          // Update task ID in Gantt
          const realId = response.data.id;
          if (String(taskId) !== String(realId)) {
            gantt.changeTaskId(taskId, realId);
          }
          
          // Refresh tasks from backend
          await refreshTasksQuietly();
          
          setBanner({
            type: "success",
            message: "Task created successfully!",
          });
        } catch (err) {
          console.error('💾 Error creating task:', err);
          setBanner({
            type: "error",
            message: err.response?.data?.error || err.message || "Failed to create task.",
          });
          throw err;
        }
      } else {
        // Update existing task
        const updatePayload = {
          title: String(ganttTask.text || ""),
          status: String(ganttTask.status || ""),
          priority: String(ganttTask.priority || ""),
          startDate: startDate,
          dueDate: dueDate,
          progress: Math.round((ganttTask.progress || 0) * 100),
        };
        
        try {
          await axios.put(`${TASKS_ENDPOINT}/${taskId}`, updatePayload);
          
          // Refresh tasks from backend
          await refreshTasksQuietly();
          
          setBanner({
            type: "success",
            message: "Task saved successfully!",
          });
        } catch (err) {
          console.error('💾 Error updating task:', err);
          setBanner({
            type: "error",
            message: err.response?.data?.error || err.message || "Failed to save task.",
          });
          throw err;
        }
      }
    };

    const handleTaskChange = async (id, item) => {
      // Convert dates properly
      let startDateObj = item.start_date;
      if (typeof startDateObj === 'string') {
        startDateObj = parseIsoDate(startDateObj);
      } else if (!(startDateObj instanceof Date)) {
        startDateObj = new Date();
      }
      
      let endDateObj = item.end_date;
      if (!endDateObj && item.duration) {
        endDateObj = new Date(startDateObj.getTime() + (item.duration - 1) * DAY_IN_MS);
      } else if (typeof endDateObj === 'string') {
        endDateObj = parseIsoDate(endDateObj);
      } else if (!(endDateObj instanceof Date) && startDateObj) {
        endDateObj = new Date(startDateObj.getTime() + 7 * DAY_IN_MS);
      }
      
      const startDate = toIsoDate(startDateObj);
      const dueDate = toIsoDate(endDateObj);
      
      // Validate dates are not empty
      if (!startDate || !dueDate) {
        throw new Error("Start date and due date are required. Please set valid dates for the task.");
      }
      
      // Check if this is a new task (not in our tasks list)
      const existingTask = tasks.find(t => String(t.id) === String(id));
      const isNewTask = !existingTask;
      
      if (isNewTask) {
        // Create new task
        const currentMembers = memberOptions.length > 0 ? memberOptions : [];
        const defaultAssignee = currentMembers.length > 0 ? currentMembers[0].id : (user?.id || "");
        
        // Validate assignedTo is not empty (backend requires valid ObjectId)
        if (!defaultAssignee) {
          throw new Error("Cannot create task: No assignee available. Please ensure you have project members or are logged in.");
        }
        
        // Ensure all required string fields are strings (not null/undefined)
        const taskTitle = String(item.text || "New Task").trim();
        if (!taskTitle) {
          throw new Error("Task title cannot be empty.");
        }
        
        const newTaskPayload = {
          title: taskTitle,
          description: String(item.description || ""),
          label: String(item.label || ""),
          status: String(item.status || "To Do"),
          priority: String(item.priority || "Medium"),
          assignedTo: String(defaultAssignee), // Must be valid ObjectId string
          startDate: startDate, // Must be ISO date string YYYY-MM-DD
          dueDate: dueDate, // Must be ISO date string YYYY-MM-DD
          progress: Math.round((item.progress || 0) * 100),
          dependencies: [],
        };
        
        // Validate payload before sending
        const requiredFields = ["title", "description", "label", "status", "priority", "assignedTo", "startDate", "dueDate"];
        const missingFields = requiredFields.filter(field => !newTaskPayload[field] && newTaskPayload[field] !== 0 && newTaskPayload[field] !== "");
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }
        
        try {
          const response = await axios.post(TASKS_ENDPOINT, newTaskPayload);
          const realId = response.data.id;
          
          // Update task ID in Gantt if needed
          if (String(id) !== String(realId)) {
            gantt.changeTaskId(id, realId);
          }
          
          await refreshTasksQuietly();
          setBanner({
            type: "success",
            message: "Task created successfully!",
          });
        } catch (err) {
          // Extract detailed error message
          let errorMessage = "Failed to create task.";
          if (err.response?.data?.error) {
            errorMessage = err.response.data.error;
          } else if (err.message) {
            errorMessage = err.message;
          } else if (err.response?.status === 400) {
            errorMessage = "Invalid task data. Please check all required fields are filled correctly.";
          } else if (err.response?.status === 403) {
            errorMessage = "You don't have permission to create tasks in this project.";
          }
          
          console.error('Error creating task:', {
            error: err,
            response: err.response?.data,
            status: err.response?.status,
            payload: err.config?.data
          });
          
          setBanner({
            type: "error",
            message: errorMessage,
          });
          await refreshTasksQuietly();
        }
      } else {
        // Update existing task
      const payload = {
        startDate,
        dueDate,
        progress: Math.round((item.progress || 0) * 100),
      };
        
        // Always include title/text if present
        if (item.text !== undefined && item.text !== null) {
          payload.title = String(item.text);
        }
        
        // Always include status if present
        if (item.status !== undefined && item.status !== null) {
          payload.status = String(item.status);
        }
        
        // Always include priority if present
        if (item.priority !== undefined && item.priority !== null) {
          payload.priority = String(item.priority);
        }
        
      try {
        await axios.put(`${TASKS_ENDPOINT}/${id}`, payload);
          
          // Refresh tasks from backend to get the latest data
          await refreshTasksQuietly();
          
          setBanner({
            type: "success",
            message: "Task saved successfully!",
          });
      } catch (err) {
          console.error('Error updating task:', err);
        setBanner({
          type: "error",
            message: getErrorMessage(err, "Failed to save task."),
        });
        await refreshTasksQuietly();
        }
      }
    };

    // Handle new task creation - THIS IS THE KEY EVENT FOR NEW TASKS
    const taskAddBeforeId = gantt.attachEvent("onBeforeTaskAdd", (id, task) => {
      // Set default values for new tasks
      const today = new Date();
      const weekFromToday = new Date(today);
      weekFromToday.setDate(today.getDate() + 7);

      task.text = task.text || "New Task";
      task.status = task.status || "To Do";
      task.priority = task.priority || "Medium";
      task.progress = task.progress || 0;
      
      // Set default dates if not provided
      if (!task.start_date) {
        task.start_date = today;
      }
      if (!task.end_date && !task.duration) {
        task.end_date = weekFromToday;
        task.duration = 7;
      }
      
      return true;
    });

    const taskAddAfterId = gantt.attachEvent("onAfterTaskAdd", async (id, task) => {
      // DON'T save immediately - let user configure task in lightbox first
      // The save will happen in onAfterTaskUpdate when they click Save, or in onAfterLightbox fallback
      return;
      
      /* REMOVED: Immediate save - this was causing issues
      try {
        // Convert gantt task dates - they might be Date objects or ISO strings
        let startDateObj = task.start_date;
        if (typeof startDateObj === 'string') {
          startDateObj = parseIsoDate(startDateObj) || new Date();
        } else if (!(startDateObj instanceof Date)) {
          startDateObj = new Date();
        }

        let endDateObj = task.end_date;
        if (!endDateObj && task.duration) {
          endDateObj = new Date(startDateObj.getTime() + (task.duration - 1) * DAY_IN_MS);
        } else if (typeof endDateObj === 'string') {
          endDateObj = parseIsoDate(endDateObj) || new Date(startDateObj.getTime() + 7 * DAY_IN_MS);
        } else if (!(endDateObj instanceof Date)) {
          endDateObj = new Date(startDateObj.getTime() + 7 * DAY_IN_MS);
        }

        const startDate = toIsoDate(startDateObj);
        const endDate = toIsoDate(endDateObj);
        
        console.log('🔵 Parsed dates - startDate:', startDate, 'endDate:', endDate);
        
        // Validate dates are not empty
        if (!startDate || !endDate) {
          throw new Error("Start date and due date are required. Please set valid dates for the task.");
        }
        
        // Get current member options and user from state
        const currentMembers = memberOptions.length > 0 ? memberOptions : [];
        const defaultAssignee = currentMembers.length > 0 ? currentMembers[0].id : (user?.id || "");
        
        console.log('🔵 Default assignee:', defaultAssignee);
        
        // Validate assignedTo is not empty (backend requires valid ObjectId)
        if (!defaultAssignee) {
          throw new Error("Cannot create task: No assignee available. Please ensure you have project members or are logged in.");
        }
        
        // Ensure all required string fields are strings (not null/undefined)
        const taskTitle = String(task.text || "New Task").trim();
        if (!taskTitle) {
          throw new Error("Task title cannot be empty.");
        }
        
        const newTaskPayload = {
          title: taskTitle,
          description: String(task.description || ""),
          label: String(task.label || ""),
          status: String(task.status || "To Do"),
          priority: String(task.priority || "Medium"),
          assignedTo: String(defaultAssignee), // Must be valid ObjectId string
          startDate: startDate, // Must be ISO date string YYYY-MM-DD
          dueDate: endDate, // Must be ISO date string YYYY-MM-DD
          progress: Math.round((task.progress || 0) * 100),
          dependencies: [],
        };
        
        // Validate payload before sending
        console.log('🔵 Validating task payload before sending:', newTaskPayload);
        console.log('🔵 Axios headers:', axios.defaults.headers.common);
        
        const requiredFields = ["title", "description", "label", "status", "priority", "assignedTo", "startDate", "dueDate"];
        const missingFields = requiredFields.filter(field => !newTaskPayload[field] && newTaskPayload[field] !== 0 && newTaskPayload[field] !== "");
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }

        console.log('🔵 POST request to:', TASKS_ENDPOINT);
        console.log('🔵 Payload:', JSON.stringify(newTaskPayload, null, 2));
        
        // Save to backend
        const response = await axios.post(TASKS_ENDPOINT, newTaskPayload);
        console.log('✅ Task created successfully! Response:', response.data);
        const createdTask = {
          ...newTaskPayload,
          id: response.data.id,
        };

        // Update the gantt task with the real ID from backend first
        const realId = response.data.id;
        if (String(id) !== String(realId)) {
          gantt.changeTaskId(id, realId);
        }
        
        // Refresh tasks from backend to get complete task data
        await refreshTasksQuietly();

        setBanner({
          type: "success",
          message: "Task created successfully!",
        });
      } catch (err) {
        // Remove the task from gantt if backend save failed
        gantt.deleteTask(id);
        
        // Extract detailed error message
        let errorMessage = "Failed to create task.";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.response?.status === 400) {
          errorMessage = "Invalid task data. Please check all required fields are filled correctly.";
        } else if (err.response?.status === 403) {
          errorMessage = "You don't have permission to create tasks in this project.";
        }
        
        console.error('Error creating task:', {
          error: err,
          response: err.response?.data,
          status: err.response?.status,
          payload: err.config?.data
        });
        
        setBanner({
          type: "error",
          message: errorMessage,
        });
      }
      */
    });

    // Function to read form values directly from lightbox DOM (like backlog form)
    const readLightboxFormValues = (taskId) => {
      // Get the lightbox container
      const lightbox = document.querySelector('.gantt_cal_light');
      if (!lightbox) {
        throw new Error('Lightbox not found');
      }
      
      // Read form values from the lightbox sections
      // DHTMLX stores values in various ways - we'll get the task object from Gantt first
      const ganttTask = gantt.getTask(taskId);
      if (!ganttTask) {
        throw new Error('Task not found in Gantt');
      }
      
      // The lightbox updates the task object when fields change
      // But we need to get the CURRENT values from the lightbox before it closes
      // Try to read from the actual DOM inputs
      const titleInput = lightbox.querySelector('input[type="text"]');
      const textValue = titleInput ? titleInput.value : (ganttTask.text || '');
      
      // Get dates from the task object (they should be updated by lightbox)
      const startDate = ganttTask.start_date ? toIsoDate(ganttTask.start_date) : '';
      const endDate = ganttTask.end_date ? toIsoDate(ganttTask.end_date) : '';
      
      // Get other fields from task object
      const status = ganttTask.status || 'To Do';
      const priority = ganttTask.priority || 'Medium';
      const description = ganttTask.description || '';
      const label = ganttTask.label || '';
      const progress = ganttTask.progress || 0;
      
      return {
        text: textValue,
        start_date: ganttTask.start_date,
        end_date: ganttTask.end_date,
        status,
        priority,
        description,
        label,
        progress,
        ...ganttTask // Include all other fields
      };
    };
    
    // Function to save task by reading form and posting (exactly like backlog)
    const saveLightboxTask = async (taskId) => {
      try {
        // First, let DHTMLX update the task in its internal structure
        // by allowing its default save to happen, then read the values
        const taskData = readLightboxFormValues(taskId);
        
        // Now save using our backend function
        await saveTaskToBackend(taskId, taskData);
      } catch (err) {
        console.error('Error in saveLightboxTask:', err);
        throw err;
      }
    };
    
    // REMOVED: Button handler template override - not working reliably
    // Instead, we'll rely on onAfterTaskUpdate (for edits) and onAfterLightbox fallback (for new tasks)
    
    // Handle BEFORE task update - just allow it to proceed (must be synchronous)
    const beforeUpdateId = gantt.attachEvent("onBeforeTaskUpdate", (id, task) => {
      // Allow the update to proceed - this is required for onAfterTaskUpdate to fire
      return true;
    });
    
    // Handle task updates from lightbox save button - this fires AFTER Save is clicked and task is updated in Gantt
    const updateEventId = gantt.attachEvent("onAfterTaskUpdate", async (id, item) => {
      // Immediately save to backend using the simple save function (like backlog)
      try {
        await saveTaskToBackend(id, item);
      } catch (err) {
        console.error('Error saving to backend:', err);
        setBanner({
          type: "error",
          message: err.response?.data?.error || err.message || "Failed to save task to backend.",
        });
      }
    });
    
    const beforeLightboxId = gantt.attachEvent("onBeforeLightbox", function(id) {
      return true;
    });
    
    // Intercept lightbox save button when it opens (this runs in the editable events scope)
    const lightboxSaveHandlerId = gantt.attachEvent("onLightbox", function(id) {
      const taskIdToSave = id; // Capture ID in closure
      
      // Use multiple timeouts to catch the button at different stages
      const tryAttachHandler = (attempt = 1) => {
        setTimeout(() => {
          const saveButton = document.querySelector('.gantt_save_btn, button.gantt_save_btn, .gantt_btn_set .gantt_save_btn');
          
          if (!saveButton) {
            if (attempt < 5) {
              tryAttachHandler(attempt + 1);
            }
            return;
          }
          
          // Remove ALL event listeners by cloning
          const clonedBtn = saveButton.cloneNode(true);
          if (saveButton.parentNode) {
            saveButton.parentNode.replaceChild(clonedBtn, saveButton);
          }
          
          // Use event delegation on the lightbox container to catch DHTMLX button clicks
          const lightboxContainer = document.querySelector('.gantt_cal_light');
          if (lightboxContainer) {
            // Remove any existing delegation handler
            const existingHandler = lightboxContainer._saveHandler;
            if (existingHandler) {
              lightboxContainer.removeEventListener('click', existingHandler, true);
            }
            
            // Create new handler - try multiple ways to catch the click
            const saveHandler = async function(e) {
              const target = e.target;
              const isSaveButton = target.classList.contains('gantt_save_btn') || 
                                   target.closest('.gantt_save_btn') ||
                                   (target.tagName === 'DIV' && target.getAttribute('dhx_button') === '1' && target.classList.contains('gantt_save_btn'));
              
              if (isSaveButton) {
                e.preventDefault();
                e.stopImmediatePropagation();
                e.stopPropagation();
                
                // Get task data from Gantt - use current task ID
                const currentTaskId = gantt.getState().lightbox_id || taskIdToSave;
                const task = gantt.getTask(currentTaskId);
                
                if (!task) {
                  // Try to get task from the lightbox
                  const lightboxTask = gantt.getState().lightbox_task;
                  if (lightboxTask) {
                    await handleTaskChange(currentTaskId, lightboxTask);
                  }
                  return;
                }
                
                try {
                  // Use the simple save function that mimics backlog
                  await saveTaskToBackend(currentTaskId, task);
                  setTimeout(() => {
                    gantt.hideLightbox();
                  }, 100);
                } catch (err) {
                  console.error('Error in save handler:', err);
                  // Don't close lightbox on error so user can fix it
                }
              }
            };
            
            // Also try to catch clicks on the button set container
            const buttonSetContainer = document.querySelector('.gantt_btn_set');
            if (buttonSetContainer && !buttonSetContainer._saveHandlerAttached) {
              buttonSetContainer.addEventListener('click', saveHandler, true);
              buttonSetContainer._saveHandlerAttached = true;
            }
            
            // Store handler reference for cleanup
            lightboxContainer._saveHandler = saveHandler;
            
            // Add with capture phase to run before DHTMLX handlers
            lightboxContainer.addEventListener('click', saveHandler, true);
          }
        }, attempt * 200); // Increasing delays: 200ms, 400ms, 600ms, etc.
      };
      
      tryAttachHandler(1);
      
      return true;
    });
    
    
    const linkAddId = gantt.attachEvent("onAfterLinkAdd", async (id, link) => {
      const sourceId = String(link.source);
      const targetId = String(link.target);
      if (sourceId === targetId) {
        gantt.deleteLink(id);
        return;
      }
      try {
        const { data } = await axios.post(
          `${TASKS_ENDPOINT}/${targetId}/dependencies`,
          { dependencyId: sourceId }
        );
        setTasks((prev) =>
          prev.map((task) =>
            String(task.id) === targetId
              ? { ...task, dependencies: data.dependencies }
              : task
          )
        );
      } catch (err) {
        gantt.deleteLink(id);
        setBanner({
          type: "error",
          message: getErrorMessage(err, "Failed to add dependency."),
        });
        await refreshTasksQuietly();
      }
    });

    const linkDeleteId = gantt.attachEvent(
      "onAfterLinkDelete",
      async (id, link) => {
        const sourceId = String(link.source);
        const targetId = String(link.target);
        try {
          const { data } = await axios.delete(
            `${TASKS_ENDPOINT}/${targetId}/dependencies/${sourceId}`
          );
          setTasks((prev) =>
            prev.map((task) =>
              String(task.id) === targetId
                ? { ...task, dependencies: data.dependencies }
                : task
            )
          );
        } catch (err) {
          setBanner({
            type: "error",
            message: getErrorMessage(err, "Failed to remove dependency."),
          });
          await refreshTasksQuietly();
        }
      }
    );

    // Add fallback: save any unsaved tasks when lightbox closes
    console.log('🔵🔵🔵 About to attach onAfterLightbox event handler');
    const lightboxCloseSaveId = gantt.attachEvent("onAfterLightbox", async function() {
      console.log('🔷🔷🔷🔷🔷🔷🔷 onAfterLightbox FIRED - checking for unsaved tasks');
      
      // Get the task that was just in the lightbox
      const state = gantt.getState();
      let taskIdToCheck = state.lightbox_id;
      
      console.log('🔷 Lightbox state:', state);
      console.log('🔷 Task ID from lightbox state:', taskIdToCheck);
      
      if (taskIdToCheck) {
        // Wait a moment for Gantt to finish updating the task
        setTimeout(async () => {
          const task = gantt.getTask(taskIdToCheck);
          if (task) {
            console.log('🔷 Task found after lightbox closed:', task);
            
            // Check if this task exists in backend
            const backendTask = tasks.find(t => String(t.id) === String(taskIdToCheck));
            console.log('🔷 Task exists in backend?', !!backendTask);
            
            if (!backendTask) {
              console.log('🔷🔷🔷🔷🔷 UNSAVED TASK DETECTED - saving now!');
              console.log('🔷 Task details:', task);
              try {
                await saveTaskToBackend(taskIdToCheck, task);
                console.log('🔷✅✅✅ Task saved successfully!');
              } catch (err) {
                console.error('🔷❌ Error saving task:', err);
                setBanner({
                  type: "error",
                  message: err.response?.data?.error || err.message || "Failed to save task.",
                });
              }
            } else {
              console.log('🔷 Task already exists in backend, no need to save');
            }
          } else {
            console.log('🔷 Task not found in Gantt after lightbox closed');
          }
        }, 300);
      } else {
        console.log('🔷 No task ID found in lightbox state');
      }
      
      return true;
    });
    
    editEventsRef.current = [taskAddBeforeId, taskAddAfterId, updateEventId, beforeUpdateId, linkAddId, linkDeleteId, beforeLightboxId, lightboxSaveHandlerId, lightboxCloseSaveId];

    return () => {
      editEventsRef.current.forEach((eventId) => gantt.detachEvent(eventId));
      editEventsRef.current = [];
    };
  }, [isReadOnly, isGanttInitialized, TASKS_ENDPOINT, refreshTasksQuietly, memberOptions, user]);

  const handleRetry = () => {
    loadData();
  };

  const handleProgressSlider = async (event) => {
    const value = Number(event.target.value);
    if (!selectedTask || Number.isNaN(value) || isReadOnly) return;
    try {
      await axios.put(`${TASKS_ENDPOINT}/${selectedTask.id}`, {
        progress: value,
      });
      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(selectedTask.id)
            ? { ...task, progress: value }
            : task
        )
      );
    } catch (err) {
      setBanner({
        type: "error",
        message: getErrorMessage(err, "Failed to update progress."),
      });
      await refreshTasksQuietly();
    }
  };

  const handleAddDependency = async (event) => {
    event.preventDefault();
    if (!selectedTask || !dependencyDraft) return;
    try {
      const { data } = await axios.post(
        `${TASKS_ENDPOINT}/${selectedTask.id}/dependencies`,
        { dependencyId: dependencyDraft }
      );
      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(selectedTask.id)
            ? { ...task, dependencies: data.dependencies }
            : task
        )
      );
      setDependencyDraft("");
    } catch (err) {
      setBanner({
        type: "error",
        message: getErrorMessage(err, "Failed to add dependency."),
      });
      await refreshTasksQuietly();
    }
  };

  const handleRemoveDependency = async (dependencyId) => {
    if (!selectedTask) return;
    try {
      const { data } = await axios.delete(
        `${TASKS_ENDPOINT}/${selectedTask.id}/dependencies/${dependencyId}`
      );
      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(selectedTask.id)
            ? { ...task, dependencies: data.dependencies }
            : task
        )
      );
    } catch (err) {
      setBanner({
        type: "error",
        message: getErrorMessage(err, "Failed to remove dependency."),
      });
      await refreshTasksQuietly();
    }
  };

  const handleGoToToday = () => {
    gantt.showDate(new Date());
  };

  const handleFitTimeline = () => {
    if (!ganttDataset.length) return;
    const focusDate = timelineFocusDate || new Date();
    gantt.showDate(focusDate);
    const earliestTask = ganttDataset.reduce((acc, task) => {
      if (!task?.start_date) return acc;
      const start =
        task.start_date instanceof Date
          ? task.start_date
          : parseIsoDate(task.start_date);
      if (!start) return acc;
      if (!acc || start < acc.start) {
        return { id: task.id, start };
      }
      return acc;
    }, null);
    if (earliestTask?.id && gantt.isTaskExists(earliestTask.id)) {
      gantt.showTask(earliestTask.id);
    }
  };

  const statusOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach((task) => {
      if (task.status) set.add(task.status);
    });
    return ["All", ...Array.from(set)];
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      const key = task.assignedTo || "__unassigned__";
      if (!map.has(key)) {
        map.set(
          key,
          task.assignedTo
            ? memberLookup[task.assignedTo] || task.assignedTo
            : "Unassigned"
        );
      }
    });
    return [{ id: "All", label: "All assignees" }].concat(
      Array.from(map.entries()).map(([id, label]) => ({
        id,
        label,
      }))
    );
  }, [tasks, memberLookup]);

  const dependencyOptions = useMemo(() => {
    if (!selectedTask) return [];
    const existing = new Set(selectedTask.dependencies || []);
    return tasks
      .filter(
        (task) =>
          String(task.id) !== String(selectedTask.id) &&
          !existing.has(String(task.id))
      )
      .map((task) => ({
        id: String(task.id),
        label: task.title,
      }));
  }, [tasks, selectedTask]);

  const scheduledTasksCount = ganttDataset.length;

  const renderBanner = () =>
    banner ? (
      <div
        className={`alert alert-${
          banner.type === "error" ? "danger" : "info"
        } d-flex align-items-center`}
        role="alert"
      >
        <i
          className={`bi me-2 ${
            banner.type === "error" ? "bi-exclamation-triangle" : "bi-info-circle"
          }`}
        />
        <div>{banner.message}</div>
        <button
          type="button"
          className="btn-close ms-auto"
          aria-label="Close"
          onClick={() => setBanner(null)}
        />
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading Gantt...</span>
            </div>
            <p className="mb-0">Preparing project timeline…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="card border-danger">
          <div className="card-body">
            <h5 className="card-title text-danger">Unable to load Gantt view</h5>
            <p className="card-text">
              {getErrorMessage(error, "Something went wrong while loading data.")}{" "}
            </p>
            <button className="btn btn-danger" onClick={handleRetry}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-3">
        <div>
          <h3 className="mb-0">
            Gantt Timeline{" "}
            {project?.name ? (
              <span className="text-muted">– {project.name}</span>
            ) : null}
          </h3>
          <small className="text-muted">
            Track task timelines, dependencies, and progress in real-time.
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link
            to={`/projects/${projectId}/backlog`}
            className="btn btn-outline-secondary"
          >
            <i className="bi bi-list-task me-1" />
            Backlog
          </Link>
          <Link
            to={`/projects/${projectId}/kanbanboard`}
            className="btn btn-outline-success"
          >
            <i className="bi bi-kanban me-1" />
            Kanban
          </Link>
        </div>
      </div>

      {renderBanner()}

      {isReadOnly ? (
        <div className="gantt-readonly-hint border rounded-3 p-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-lock-fill text-secondary" />
            <div>
              <strong>Read-only mode</strong>
              <div className="text-muted small">
                Editing is limited to project owners or members with timeline
                permissions.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row gy-3 align-items-center">
            <div className="col-lg-4 col-md-6">
              <label className="form-label text-muted mb-1">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-4 col-md-6">
              <label className="form-label text-muted mb-1">Assignee</label>
              <select
                className="form-select"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                {assigneeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-4">
              <label className="form-label text-muted mb-1">Zoom</label>
              <div className="gantt-toolbar btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="zoom"
                  id="zoom-day"
                  autoComplete="off"
                  checked={viewMode === "day"}
                  onChange={() => setViewMode("day")}
                />
                <label className="btn btn-outline-primary" htmlFor="zoom-day">
                  Day
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="zoom"
                  id="zoom-week"
                  autoComplete="off"
                  checked={viewMode === "week"}
                  onChange={() => setViewMode("week")}
                />
                <label className="btn btn-outline-primary" htmlFor="zoom-week">
                  Week
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="zoom"
                  id="zoom-month"
                  autoComplete="off"
                  checked={viewMode === "month"}
                  onChange={() => setViewMode("month")}
                />
                <label className="btn btn-outline-primary" htmlFor="zoom-month">
                  Month
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-3">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <span className="fw-semibold d-block">
                  Timeline View{" "}
                  <span className="text-muted fw-normal">
                    ({scheduledTasksCount} scheduled task
                    {scheduledTasksCount === 1 ? "" : "s"})
                  </span>
                </span>
                <div className="text-muted small">
                  {timelineRangeLabel}
                </div>
              </div>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleFitTimeline}
                  disabled={!scheduledTasksCount}
                >
                  <i className="bi bi-arrows-move me-1" />
                  Fit Tasks
                </button>
                <button className="btn btn-outline-primary" onClick={handleGoToToday}>
                  <i className="bi bi-calendar-day me-1" />
                  Today
                </button>
              </div>
            </div>
            <div className="card-body">
              {scheduledTasksCount === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x text-muted fs-1 mb-3 d-block" />
                  <p className="mb-2">
                    No tasks with start and due dates yet.
                  </p>
                  <p className="text-muted mb-3">
                    Add tasks in the backlog or update existing tasks to define a
                    schedule and see them appear here.
                  </p>
                  <Link
                    to={`/projects/${projectId}/backlog`}
                    className="btn btn-primary"
                  >
                    Go to Backlog
                  </Link>
                </div>
              ) : (
                <div className="gantt-wrapper">
                  <div ref={ganttContainerRef} className="gantt-container" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Task Details</h5>
              {!selectedTask ? (
                <div className="text-muted">
                  Select a task in the timeline to view details, progress, and dependencies.
                </div>
              ) : (
                <>
                  <h6 className="fw-semibold">{selectedTask.title}</h6>
                  <div className="mb-2">
                    <span className="badge bg-secondary me-2">
                      {selectedTask.status || "Unspecified"}
                    </span>
                    <span className="badge bg-light text-dark">
                      {selectedTask.priority || "No priority"}
                    </span>
                  </div>
                  <dl className="row small mb-3">
                    <dt className="col-5 text-muted">Assignee</dt>
                    <dd className="col-7">
                      {memberLookup[selectedTask.assignedTo] ||
                        selectedTask.assignedTo ||
                        "Unassigned"}
                    </dd>
                    <dt className="col-5 text-muted">Start</dt>
                    <dd className="col-7">{selectedTask.startDate}</dd>
                    <dt className="col-5 text-muted">Due</dt>
                    <dd className="col-7">{selectedTask.dueDate}</dd>
                    <dt className="col-5 text-muted">Progress</dt>
                    <dd className="col-7">{Math.round(selectedTask.progress ?? 0)}%</dd>
                  </dl>

                  <div className="mb-3">
                    <label className="form-label small text-muted">
                      Adjust Progress
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(selectedTask.progress ?? 0)}
                      onChange={handleProgressSlider}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="mb-3 flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Dependencies</strong>
                      <span className="badge bg-light text-dark">
                        {selectedTask.dependencies.length}
                      </span>
                    </div>
                    {selectedTask.dependencies.length === 0 ? (
                      <div className="text-muted small">
                        No dependencies yet. Drag from a task’s connector in the
                        chart or add one below.
                      </div>
                    ) : (
                      <ul className="list-group dependency-list mb-3">
                        {selectedTask.dependencies.map((dependencyId) => {
                          const dependencyTask = tasks.find(
                            (task) => String(task.id) === String(dependencyId)
                          );
                          return (
                            <li
                              key={dependencyId}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <div className="fw-semibold">
                                  {dependencyTask?.title || dependencyId}
                                </div>
                                <div className="text-muted small">
                                  Due {dependencyTask?.dueDate || "—"}
                                </div>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveDependency(dependencyId)}
                                disabled={isReadOnly}
                              >
                                <i className="bi bi-x" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <form className="input-group" onSubmit={handleAddDependency}>
                      <select
                        className="form-select"
                        value={dependencyDraft}
                        onChange={(e) => setDependencyDraft(e.target.value)}
                        disabled={isReadOnly || dependencyOptions.length === 0}
                      >
                        <option value="">
                          {dependencyOptions.length === 0
                            ? "No available tasks"
                            : "Select task to link"}
                        </option>
                        {dependencyOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-outline-primary"
                        type="submit"
                        disabled={isReadOnly || !dependencyDraft}
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GanttView;

