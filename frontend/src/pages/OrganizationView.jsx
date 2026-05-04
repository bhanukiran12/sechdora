import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import usePlan from "@/hooks/usePlan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GitBranch,
  Users,
  Briefcase,
  CheckSquare,
  Plus,
  ArrowDown,
  CircleDot,
  Shield,
  Crown,
  Flag,
  CheckCircle2,
  SquareDashedBottomCode,
  PencilLine,
  Save,
  RefreshCw,
  Trash2,
} from "lucide-react";

const API = "/api";

const ROLE_ORDER = [
  { key: "admin", label: "Admin", subtitle: "Owner-level control", icon: Crown },
  { key: "vp", label: "VP", subtitle: "Strategic oversight", icon: Shield },
  { key: "manager", label: "Manager", subtitle: "Owns departments", icon: Briefcase },
  { key: "team_lead", label: "Team Lead", subtitle: "Runs execution", icon: Flag },
  { key: "employee", label: "Employee", subtitle: "Executes tasks", icon: CheckCircle2 },
];

function StatTile({ label, value, note }) {
  return (
    <div className="brutal-card p-5 bg-white">
      <div className="text-[10px] uppercase tracking-[0.24em] font-black text-text-muted">{label}</div>
      <div className="mt-3 text-4xl font-black font-heading tracking-tight">{value}</div>
      <div className="mt-2 text-xs font-medium text-text-secondary">{note}</div>
    </div>
  );
}

function StatusChip({ children, tone = "default" }) {
  const tones = {
    default: "bg-white text-text-primary",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    muted: "bg-gray-100 text-text-muted",
    primary: "bg-primary text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}

function emptyDepartmentForm() {
  return { id: "", name: "", assignedVP: "" };
}

function emptyProjectForm() {
  return { id: "", name: "", departmentId: "", managerId: "", teamLeadIds: [], members: [] };
}

function emptyTaskForm() {
  return {
    id: "",
    title: "",
    description: "",
    projectId: "",
    assignedTo: "",
    assignedBy: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    linkedPostId: "",
  };
}

export default function OrganizationView() {
  const navigate = useNavigate();
  const { role, canManagerRoles, hasFullHierarchy, isAdmin } = usePlan();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [savingKey, setSavingKey] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [departmentMode, setDepartmentMode] = useState("create");
  const [projectMode, setProjectMode] = useState("create");
  const [taskMode, setTaskMode] = useState("create");
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm());
  const [projectForm, setProjectForm] = useState(emptyProjectForm());
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [creatorDialog, setCreatorDialog] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [mobileAssignTargets, setMobileAssignTargets] = useState({});

  const fetchHierarchy = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const [hierarchyRes, meRes] = await Promise.all([
        axios.get(`${API}/org/hierarchy`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
      ]);
      setHierarchy(hierarchyRes.data);
      setCurrentUser(meRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load hierarchy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const memberMap = useMemo(() => {
    const map = new Map();
    (hierarchy?.members || []).forEach((member) => {
      map.set(member._id, member);
    });
    return map;
  }, [hierarchy?.members]);

  const tasksByProject = useMemo(() => {
    const grouped = new Map();
    (hierarchy?.tasks || []).forEach((task) => {
      const bucket = grouped.get(task.projectId) || [];
      bucket.push(task);
      grouped.set(task.projectId, bucket);
    });
    return grouped;
  }, [hierarchy?.tasks]);

  const allProjects = useMemo(() => {
    const projects = [];
    (hierarchy?.departments || []).forEach((department) => {
      (department.projects || []).forEach((project) => projects.push(project));
    });
    (hierarchy?.unassignedProjects || []).forEach((project) => projects.push(project));
    return projects;
  }, [hierarchy?.departments, hierarchy?.unassignedProjects]);

  const manageableProjects = useMemo(() => {
    if (isAdmin || (role === "vp" && hasFullHierarchy)) return allProjects;
    if (role === "manager" && canManagerRoles && currentUser?._id) {
      return allProjects.filter((project) => project.managerId === currentUser._id || (project.teamLeadIds || []).includes(currentUser._id));
    }
    if (role === "team_lead" && hasFullHierarchy && currentUser?._id) {
      return allProjects.filter((project) => (project.teamLeadIds || []).includes(currentUser._id));
    }
    return [];
  }, [allProjects, canManagerRoles, currentUser?._id, hasFullHierarchy, isAdmin, role]);

  const manageableTasks = useMemo(() => {
    const tasks = hierarchy?.tasks || [];
    if (isAdmin || (role === "vp" && hasFullHierarchy)) return tasks;
    if (role === "manager" && canManagerRoles && currentUser?._id) {
      return tasks.filter((task) => manageableProjects.some((project) => project.id === task.projectId));
    }
    if (role === "team_lead" && hasFullHierarchy && currentUser?._id) {
      return tasks.filter((task) => task.assignedTo === currentUser._id || manageableProjects.some((project) => project.id === task.projectId));
    }
    return [];
  }, [canManagerRoles, currentUser?._id, hasFullHierarchy, hierarchy?.tasks, isAdmin, manageableProjects, role]);

  const memberBuckets = useMemo(() => {
    const buckets = {
      admin: [],
      vp: [],
      manager: [],
      team_lead: [],
      employee: [],
    };
    (hierarchy?.members || []).forEach((member) => {
      if (buckets[member.role]) buckets[member.role].push(member);
    });
    return buckets;
  }, [hierarchy?.members]);

  const lowerRolesForTask = useMemo(() => {
    if (isAdmin) return ["vp", "manager", "team_lead", "employee"];
    if (role === "vp") return ["manager", "team_lead", "employee"];
    if (role === "manager") return ["team_lead", "employee"];
    if (role === "team_lead") return ["employee"];
    return [];
  }, [isAdmin, role]);

  const projectAssignableManagers = useMemo(() => {
    if (isAdmin || role === "vp") return memberBuckets.manager;
    if (role === "manager" && currentUser?._id) return memberBuckets.manager.filter((member) => member._id === currentUser._id);
    return [];
  }, [currentUser?._id, isAdmin, memberBuckets.manager, role]);

  const projectAssignableLeads = useMemo(() => {
    if (isAdmin || role === "vp" || role === "manager") return memberBuckets.team_lead;
    return [];
  }, [isAdmin, memberBuckets.team_lead, role]);

  const projectAssignableMembers = useMemo(() => {
    if (isAdmin || role === "vp" || role === "manager" || role === "team_lead") {
      return [...memberBuckets.team_lead, ...memberBuckets.employee];
    }
    return [];
  }, [isAdmin, memberBuckets.employee, memberBuckets.team_lead, role]);

  const taskAssignableMembers = useMemo(() => {
    const eligibleRoles = lowerRolesForTask;
    return eligibleRoles.flatMap((r) => memberBuckets[r] || []);
  }, [lowerRolesForTask, memberBuckets]);

  const analytics = useMemo(() => {
    const tasks = hierarchy?.tasks || [];
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const reviewTasks = tasks.filter((task) => task.status === "review").length;
    const activeTasks = tasks.filter((task) => ["todo", "in-progress", "review"].includes(task.status)).length;
    const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const departmentCount = (hierarchy?.departments || []).length || 1;
    const throughput = Math.round(doneTasks / departmentCount);
    const avgTasksPerDepartment = Math.round(totalTasks / departmentCount);

    const departmentRows = (hierarchy?.departments || []).map((department) => {
      const deptTasks = [];
      (department.projects || []).forEach((project) => {
        (tasksByProject.get(project.id) || []).forEach((task) => deptTasks.push(task));
      });
      const completed = deptTasks.filter((task) => task.status === "done").length;
      const completion = deptTasks.length ? Math.round((completed / deptTasks.length) * 100) : 0;
      return {
        id: department.id,
        name: department.name,
        total: deptTasks.length,
        completed,
        completion,
        throughput: deptTasks.length ? Math.round(completed / Math.max(1, (department.projects || []).length)) : 0,
      };
    });

    return {
      totalTasks,
      doneTasks,
      reviewTasks,
      activeTasks,
      completionRate,
      throughput,
      avgTasksPerDepartment,
      departmentRows,
    };
  }, [hierarchy?.departments, hierarchy?.tasks, tasksByProject]);

  const handleConvertToPost = (task) => {
    navigate("/posts/new", { state: { task } });
  };

  const beginTaskDrag = (taskId) => {
    setDraggedTaskId(taskId);
  };

  const clearTaskDrag = () => {
    setDraggedTaskId("");
  };

  const assignTaskToMember = async (taskIdOrTask, assigneeId) => {
    const task = typeof taskIdOrTask === "string"
      ? hierarchy?.tasks?.find((item) => item.id === taskIdOrTask)
      : taskIdOrTask;
    const assignee = memberMap.get(assigneeId);
    if (!assignee) return;
    if (!taskAssignableMembers.some((member) => member._id === assigneeId)) {
      toast.error("You can only assign down the hierarchy");
      return;
    }
    const token = localStorage.getItem("access_token");
    setActionKey(`assign:${task.id}:${assigneeId}`);
    try {
      await axios.put(`${API}/tasks/${task.id}`, {
        assignedTo: assigneeId,
        assignedBy: currentUser?._id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(`Assigned to ${assignee.name || assignee.email}`);
      await fetchHierarchy();
      setMobileAssignTargets((prev) => {
        if (!task?.id) return prev;
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign task");
    } finally {
      setActionKey("");
      clearTaskDrag();
    }
  };

  const handleDeleteUndo = async (trashId) => {
    const token = localStorage.getItem("access_token");
    try {
      await axios.post(`${API}/org/trash/${trashId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success("Restored");
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Undo failed");
    }
  };

  const deleteDepartment = async (departmentId, label) => {
    if (!window.confirm(`Delete department "${label}"? This will remove its projects and tasks.`)) return;
    const token = localStorage.getItem("access_token");
    setActionKey(`dept:${departmentId}`);
    try {
      const response = await axios.delete(`${API}/departments/${departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const trashId = response.data?.trash_id;
      toast.success("Department deleted", {
        action: {
          label: "Undo",
          onClick: trashId ? () => handleDeleteUndo(trashId) : undefined,
        },
      });
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete department");
    } finally {
      setActionKey("");
    }
  };

  const deleteProject = async (projectId, label) => {
    if (!window.confirm(`Delete project "${label}"? This will remove its tasks.`)) return;
    const token = localStorage.getItem("access_token");
    setActionKey(`proj:${projectId}`);
    try {
      const response = await axios.delete(`${API}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const trashId = response.data?.trash_id;
      toast.success("Project deleted", {
        action: {
          label: "Undo",
          onClick: trashId ? () => handleDeleteUndo(trashId) : undefined,
        },
      });
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete project");
    } finally {
      setActionKey("");
    }
  };

  const deleteTask = async (taskId, label) => {
    if (!window.confirm(`Delete task "${label}"?`)) return;
    const token = localStorage.getItem("access_token");
    setActionKey(`task:${taskId}`);
    try {
      const response = await axios.delete(`${API}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const trashId = response.data?.trash_id;
      toast.success("Task deleted", {
        action: {
          label: "Undo",
          onClick: trashId ? () => handleDeleteUndo(trashId) : undefined,
        },
      });
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete task");
    } finally {
      setActionKey("");
    }
  };

  const resetDepartmentForm = () => {
    setDepartmentForm(emptyDepartmentForm());
    setDepartmentMode("create");
  };

  const resetProjectForm = () => {
    setProjectForm(emptyProjectForm());
    setProjectMode("create");
  };

  const resetTaskForm = () => {
    setTaskForm(emptyTaskForm());
    setTaskMode("create");
  };

  const openCreatorDialog = (type) => {
    if (type === "department") resetDepartmentForm();
    if (type === "project") resetProjectForm();
    if (type === "task") resetTaskForm();
    setCreatorDialog(type);
  };

  const closeCreatorDialog = () => setCreatorDialog("");

  const submitDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    if (role === "vp" && departmentForm.assignedVP && departmentForm.assignedVP !== currentUser?._id) {
      toast.error("VPs can only assign themselves");
      return;
    }
    const payload = {
      name: departmentForm.name,
      assignedVP: departmentForm.assignedVP || (role === "vp" ? currentUser?._id : undefined),
    };
    const token = localStorage.getItem("access_token");
    setSavingKey("department");
    try {
      if (departmentMode === "edit" && departmentForm.id) {
        await axios.put(`${API}/departments/${departmentForm.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      } else {
        await axios.post(`${API}/departments`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      }
      toast.success(`Department ${departmentMode === "edit" ? "updated" : "created"}`);
      resetDepartmentForm();
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save department");
    } finally {
      setSavingKey("");
    }
  };

  const submitProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!projectForm.departmentId) {
      toast.error("Select a department");
      return;
    }
    const payload = {
      name: projectForm.name,
      departmentId: projectForm.departmentId,
      managerId: role === "manager" ? currentUser?._id : projectForm.managerId || undefined,
      teamLeadIds: projectForm.teamLeadIds,
      members: projectForm.members,
    };
    const token = localStorage.getItem("access_token");
    setSavingKey("project");
    try {
      if (projectMode === "edit" && projectForm.id) {
        await axios.put(`${API}/projects/${projectForm.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      } else {
        await axios.post(`${API}/projects`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      }
      toast.success(`Project ${projectMode === "edit" ? "updated" : "created"}`);
      resetProjectForm();
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save project");
    } finally {
      setSavingKey("");
    }
  };

  const submitTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!taskForm.projectId) {
      toast.error("Select a project");
      return;
    }
    if (!taskForm.assignedTo) {
      toast.error("Assign the task to a team member");
      return;
    }
    if (role === "employee" && taskForm.status === "done") {
      toast.error("Employees cannot mark tasks as done");
      return;
    }
    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      projectId: taskForm.projectId,
      assignedTo: taskForm.assignedTo,
      assignedBy: taskForm.assignedBy || currentUser?._id,
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || undefined,
      linkedPostId: taskForm.linkedPostId || undefined,
    };
    const token = localStorage.getItem("access_token");
    setSavingKey("task");
    try {
      if (taskMode === "edit" && taskForm.id) {
        await axios.put(`${API}/tasks/${taskForm.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      } else {
        await axios.post(`${API}/tasks`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
      }
      toast.success(`Task ${taskMode === "edit" ? "updated" : "created"}`);
      resetTaskForm();
      await fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save task");
    } finally {
      setSavingKey("");
    }
  };

  const isAllowedToManageDepartments = isAdmin || (role === "vp" && hasFullHierarchy);
  const isAllowedToManageProjects = isAdmin || (role === "vp" && hasFullHierarchy) || (role === "manager" && canManagerRoles);
  const isAllowedToManageTasks = isAdmin
    || (role === "vp" && hasFullHierarchy)
    || (role === "manager" && canManagerRoles)
    || (role === "team_lead" && hasFullHierarchy);

  const selectDepartmentForEdit = (departmentId) => {
    if (!departmentId) {
      resetDepartmentForm();
      return;
    }
    const department = (hierarchy?.departments || []).find((item) => item.id === departmentId);
    if (!department) return;
    setDepartmentMode("edit");
    setDepartmentForm({
      id: department.id,
      name: department.name || "",
      assignedVP: department.assignedVP || "",
    });
  };

  const selectProjectForEdit = (projectId) => {
    if (!projectId) {
      resetProjectForm();
      return;
    }
    const project = manageableProjects.find((item) => item.id === projectId);
    if (!project) return;
    setProjectMode("edit");
    setProjectForm({
      id: project.id,
      name: project.name || "",
      departmentId: project.departmentId || "",
      managerId: project.managerId || "",
      teamLeadIds: project.teamLeadIds || [],
      members: project.members || [],
    });
  };

  const selectTaskForEdit = (taskId) => {
    if (!taskId) {
      resetTaskForm();
      return;
    }
    const task = manageableTasks.find((item) => item.id === taskId);
    if (!task) return;
    setTaskMode("edit");
    setTaskForm({
      id: task.id,
      title: task.title || "",
      description: task.description || "",
      projectId: task.projectId || "",
      assignedTo: task.assignedTo || "",
      assignedBy: task.assignedBy || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 16) : "",
      linkedPostId: task.linkedPostId || "",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar active="organization" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitBranch className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-text-muted">Loading hierarchy</p>
          </div>
        </main>
      </div>
    );
  }

  if (!hierarchy) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar active="organization" />
        <main className="flex-1 p-8">
          <div className="brutal-card p-10 text-center">
            <p className="font-black uppercase tracking-[0.24em] text-sm">Hierarchy unavailable</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background" data-testid="organization-view">
      <Sidebar active="organization" />
      <main className="flex-1 px-5 py-6 md:px-10 md:py-8 max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] shadow-brutal">
                <GitBranch className="h-3.5 w-3.5" />
                Org View
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-black font-heading tracking-tighter">
                Hierarchy without clutter
              </h1>
              <p className="mt-3 max-w-2xl text-text-secondary">
                A simple top-down view of who owns strategy, who owns projects, and who executes the work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatusChip tone="primary">Top-down flow</StatusChip>
              <StatusChip>Departments optional</StatusChip>
              <StatusChip tone="success">Tasks stay clean</StatusChip>
            </div>
          </div>
        </motion.div>

        <div className="mb-8 grid gap-3 md:grid-cols-3">
          {[
            { key: "department", label: "Create Department", icon: GitBranch, note: "Typeform-style popup" },
            { key: "project", label: "Create Project", icon: Briefcase, note: "Simple project setup" },
            { key: "task", label: "Create Task", icon: CheckSquare, note: "Fast task capture" },
          ].map(({ key, label, icon: Icon, note }) => (
            <button
              key={key}
              type="button"
              onClick={() => openCreatorDialog(key)}
              className="brutal-card flex items-center justify-between gap-4 bg-white p-4 text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-pastel-blue">
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-black">{label}</div>
                  <div className="text-[11px] font-medium text-text-secondary">{note}</div>
                </div>
              </div>
              <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            </button>
          ))}
        </div>

        <Dialog open={Boolean(creatorDialog)} onOpenChange={(open) => !open && closeCreatorDialog()}>
          <DialogContent className="max-w-2xl border-4 border-black bg-white p-0 shadow-brutal-lg">
            <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
              <DialogHeader className="mb-6 text-left">
                <DialogTitle className="text-2xl font-black font-heading tracking-tight">
                  {creatorDialog === "department" ? "Create department" : creatorDialog === "project" ? "Create project" : "Create task"}
                </DialogTitle>
                <DialogDescription className="text-sm text-text-secondary">
                  {creatorDialog === "department"
                    ? "Set the strategic layer first. Keep it short and clear."
                    : creatorDialog === "project"
                      ? "Capture the project owner and the team that will move it."
                      : "Create the task, assign it, and keep the next step obvious."}
                </DialogDescription>
              </DialogHeader>

              {creatorDialog === "department" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Department name</label>
                    <input
                      value={departmentForm.name}
                      onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                      placeholder="Growth, Product, Operations"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Assigned VP</label>
                    {role === "vp" ? (
                      <div className="rounded-xl border-2 border-black bg-pastel-yellow/30 px-3 py-3 text-sm font-bold">Locked to you</div>
                    ) : (
                      <select
                        value={departmentForm.assignedVP}
                        onChange={(e) => setDepartmentForm((prev) => ({ ...prev, assignedVP: e.target.value }))}
                        className="brutal-input w-full p-3 text-sm"
                        disabled={!memberBuckets.vp.length}
                      >
                        <option value="">Select VP</option>
                        {memberBuckets.vp.map((member) => (
                          <option key={member._id} value={member._id}>{member.name || member.email}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button type="button" onClick={submitDepartment} disabled={savingKey === "department"} className="brutal-button bg-black text-white w-full py-3 font-black">
                    {departmentMode === "edit" ? "Save Department" : "Create Department"}
                  </button>
                </div>
              )}

              {creatorDialog === "project" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project name</label>
                    <input
                      value={projectForm.name}
                      onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                      placeholder="Launch sprint, Client A, Q2 pipeline"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Department</label>
                    <select
                      value={projectForm.departmentId}
                      onChange={(e) => setProjectForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      <option value="">Optional / select department</option>
                      {(hierarchy?.departments || []).map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={submitProject} disabled={savingKey === "project"} className="brutal-button bg-black text-white w-full py-3 font-black">
                    {projectMode === "edit" ? "Save Project" : "Create Project"}
                  </button>
                </div>
              )}

              {creatorDialog === "task" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Task title</label>
                    <input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                      placeholder="Write launch brief"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project</label>
                    <select
                      value={taskForm.projectId}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      <option value="">Select project</option>
                      {manageableProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Assign to</label>
                    <select
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      <option value="">Select team member</option>
                      {taskAssignableMembers.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.email} ({member.role})</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={submitTask} disabled={savingKey === "task"} className="brutal-button bg-black text-white w-full py-3 font-black">
                    {taskMode === "edit" ? "Save Task" : "Create Task"}
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 xl:grid-cols-3 mb-8">
          {isAllowedToManageDepartments ? (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-5 bg-white">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Quick Form</div>
                  <h2 className="text-xl font-black font-heading">Department</h2>
                </div>
                <button
                  type="button"
                  onClick={resetDepartmentForm}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Edit Existing</label>
                  <select
                    value={departmentMode === "edit" ? departmentForm.id : ""}
                    onChange={(e) => selectDepartmentForEdit(e.target.value)}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Create new department</option>
                    {(hierarchy?.departments || []).map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Name</label>
                  <input
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                    placeholder="Product, Growth, Operations"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Assigned VP</label>
                  {role === "vp" ? (
                    <div className="rounded-xl border-2 border-black bg-pastel-yellow/30 px-3 py-2 text-sm font-bold">
                      Locked to you
                    </div>
                  ) : (
                    <select
                      value={departmentForm.assignedVP}
                      onChange={(e) => setDepartmentForm((prev) => ({ ...prev, assignedVP: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                      disabled={!memberBuckets.vp.length}
                    >
                      <option value="">Select VP</option>
                      {memberBuckets.vp.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.email}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={submitDepartment}
                  disabled={savingKey === "department"}
                  className="brutal-button bg-black text-white w-full inline-flex items-center justify-center gap-2 text-[10px] py-3"
                >
                  <Save className="h-3.5 w-3.5" />
                  {departmentMode === "edit" ? "Save Department" : "Create Department"}
                </button>
              </div>
            </motion.section>
          ) : (
            <div className="brutal-card p-5 bg-gray-50">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Department tools</div>
              <h2 className="mt-2 text-xl font-black font-heading">Locked for this role</h2>
              <p className="mt-2 text-sm text-text-secondary">Only Admins and VPs can create or edit departments.</p>
            </div>
          )}

          {isAllowedToManageProjects ? (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-5 bg-white">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Quick Form</div>
                  <h2 className="text-xl font-black font-heading">Project</h2>
                </div>
                <button
                  type="button"
                  onClick={resetProjectForm}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Edit Existing</label>
                  <select
                    value={projectMode === "edit" ? projectForm.id : ""}
                    onChange={(e) => selectProjectForEdit(e.target.value)}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Create new project</option>
                    {manageableProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Name</label>
                  <input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                    placeholder="Launch campaign"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Department</label>
                  <select
                    value={projectForm.departmentId}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Select department</option>
                    {(hierarchy?.departments || []).map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Manager</label>
                  {role === "manager" ? (
                    <div className="rounded-xl border-2 border-black bg-pastel-yellow/30 px-3 py-2 text-sm font-bold">
                      Locked to you as project owner
                    </div>
                  ) : (
                    <select
                      value={projectForm.managerId}
                      onChange={(e) => setProjectForm((prev) => ({ ...prev, managerId: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      <option value="">Select manager</option>
                      {projectAssignableManagers.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.email}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Team Leads</label>
                  <select
                    multiple
                    value={projectForm.teamLeadIds}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, teamLeadIds: Array.from(e.target.selectedOptions).map((opt) => opt.value) }))}
                    className="brutal-input w-full p-3 text-sm min-h-24"
                  >
                    {projectAssignableLeads.length > 0 ? (
                      projectAssignableLeads.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.email}</option>
                      ))
                    ) : (
                      <option value="" disabled>No team leads available</option>
                    )}
                  </select>
                  <p className="mt-1 text-[10px] text-text-muted">Hold Ctrl/Command to select multiple leads.</p>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Members</label>
                  <select
                    multiple
                    value={projectForm.members}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, members: Array.from(e.target.selectedOptions).map((opt) => opt.value) }))}
                    className="brutal-input w-full p-3 text-sm min-h-24"
                  >
                    {projectAssignableMembers.length > 0 ? (
                      projectAssignableMembers.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.email}</option>
                      ))
                    ) : (
                      <option value="" disabled>No assignable members available</option>
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={submitProject}
                  disabled={savingKey === "project"}
                  className="brutal-button bg-black text-white w-full inline-flex items-center justify-center gap-2 text-[10px] py-3"
                >
                  <Save className="h-3.5 w-3.5" />
                  {projectMode === "edit" ? "Save Project" : "Create Project"}
                </button>
              </div>
            </motion.section>
          ) : (
            <div className="brutal-card p-5 bg-gray-50">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project tools</div>
              <h2 className="mt-2 text-xl font-black font-heading">Locked for this role</h2>
              <p className="mt-2 text-sm text-text-secondary">Managers, VPs, and Admins can create or edit projects on the right plan.</p>
            </div>
          )}

          {isAllowedToManageTasks ? (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-5 bg-white">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Quick Form</div>
                  <h2 className="text-xl font-black font-heading">Task</h2>
                </div>
                <button
                  type="button"
                  onClick={resetTaskForm}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Edit Existing</label>
                  <select
                    value={taskMode === "edit" ? taskForm.id : ""}
                    onChange={(e) => selectTaskForEdit(e.target.value)}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Create new task</option>
                    {manageableTasks.map((task) => (
                      <option key={task.id} value={task.id}>{task.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Title</label>
                  <input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                    placeholder="Write launch brief"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm min-h-24 resize-none"
                    placeholder="Add context, acceptance criteria, and links"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project</label>
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Select project</option>
                    {manageableProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Assign To</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                    className="brutal-input w-full p-3 text-sm"
                  >
                    <option value="">Select team member</option>
                    {taskAssignableMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name || member.email} ({member.role})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-text-muted">You can only assign down the hierarchy from your role.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      {["low", "medium", "high", "urgent"].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    >
                      {["todo", "in-progress", "review", "done"].filter((value) => !(role === "employee" && value === "done")).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Due Date</label>
                    <input
                      type="datetime-local"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Linked Post Id</label>
                    <input
                      value={taskForm.linkedPostId}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, linkedPostId: e.target.value }))}
                      className="brutal-input w-full p-3 text-sm"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submitTask}
                  disabled={savingKey === "task"}
                  className="brutal-button bg-black text-white w-full inline-flex items-center justify-center gap-2 text-[10px] py-3"
                >
                  <Save className="h-3.5 w-3.5" />
                  {taskMode === "edit" ? "Save Task" : "Create Task"}
                </button>
              </div>
            </motion.section>
          ) : (
            <div className="brutal-card p-5 bg-gray-50">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Task tools</div>
              <h2 className="mt-2 text-xl font-black font-heading">Locked for this role</h2>
              <p className="mt-2 text-sm text-text-secondary">Leads and above can create or edit tasks, but only down the chain of command.</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <StatTile label="Departments" value={hierarchy.organization.departmentCount} note="Optional operating layers" />
          <StatTile label="Projects" value={hierarchy.organization.projectCount} note="Active work containers" />
          <StatTile label="Tasks" value={hierarchy.organization.taskCount} note="Execution workload" />
          <StatTile label="Team roles" value={hierarchy.members.length} note="Visible chain of ownership" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <StatTile label="Completion rate" value={`${analytics.completionRate}%`} note={`${analytics.doneTasks} of ${analytics.totalTasks} tasks done`} />
          <StatTile label="Department throughput" value={analytics.throughput} note="Done tasks per department" />
          <StatTile label="Active workload" value={analytics.activeTasks} note="Todo, in progress, and review" />
          <StatTile label="Review queue" value={analytics.reviewTasks} note="Needs approval or output review" />
        </div>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-6 bg-white mb-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-black font-heading tracking-tight">Department Throughput</h2>
              <p className="text-sm text-text-secondary">A live snapshot of completion and load by department.</p>
            </div>
            <Users className="h-5 w-5" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analytics.departmentRows.map((department) => (
              <div key={department.id} className="rounded-2xl border-2 border-black bg-pastel-yellow/15 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">{department.name}</div>
                    <div className="text-xl font-black font-heading">{department.completed}/{department.total}</div>
                  </div>
                  <StatusChip tone={department.completion >= 70 ? "success" : department.completion >= 35 ? "warning" : "muted"}>
                    {department.completion}%
                  </StatusChip>
                </div>
                <div className="h-2 rounded-full border border-black bg-white overflow-hidden">
                  <div
                    className="h-full bg-black"
                    style={{ width: `${Math.max(8, department.completion)}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                  <span>Throughput {department.throughput}</span>
                  <span>{department.total} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mb-8">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-6 bg-white">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black font-heading tracking-tight">Role Ladder</h2>
                <p className="text-sm text-text-secondary">Authority stacks from strategy to execution.</p>
              </div>
              <ArrowDown className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              {ROLE_ORDER.map((role, index) => {
                const Icon = role.icon;
                const count = hierarchy.roleSummary?.[role.key] || 0;
                return (
                  <div key={role.key} className="flex items-center gap-4 rounded-2xl border-2 border-black bg-pastel-yellow/20 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black text-sm uppercase tracking-widest">{index + 1}. {role.label}</div>
                        <StatusChip tone={index === 0 ? "primary" : "default"}>{count} member{count === 1 ? "" : "s"}</StatusChip>
                      </div>
                      <div className="text-xs text-text-secondary">{role.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-6 bg-white">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black font-heading tracking-tight">Task Flow</h2>
                <p className="text-sm text-text-secondary">Keep execution moving without micromanagement.</p>
              </div>
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              {[
                { label: "Todo", value: hierarchy.taskStatusSummary?.todo || 0, tone: "muted" },
                { label: "In Progress", value: hierarchy.taskStatusSummary?.["in-progress"] || 0, tone: "warning" },
                { label: "In Review", value: hierarchy.taskStatusSummary?.review || 0, tone: "default" },
                { label: "Done", value: hierarchy.taskStatusSummary?.done || 0, tone: "success" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border-2 border-black bg-white p-4">
                  <div className="font-black uppercase tracking-widest text-xs">{item.label}</div>
                  <StatusChip tone={item.tone}>{item.value}</StatusChip>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        <section className="space-y-6">
          {(hierarchy.departments || []).map((department) => (
            <motion.article key={department.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-6 bg-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Department</div>
                  <h3 className="text-2xl font-black font-heading tracking-tight">{department.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip>{department.projectCount || 0} projects</StatusChip>
                  <StatusChip tone="warning">{department.taskCount || 0} tasks</StatusChip>
                  {isAllowedToManageDepartments && (
                    <>
                      <button
                        type="button"
                        onClick={() => selectDepartmentForEdit(department.id)}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDepartment(department.id, department.name)}
                        disabled={actionKey === `dept:${department.id}`}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {(department.projects || []).map((project) => {
                  const canManageProject = manageableProjects.some((item) => item.id === project.id);
                  return (
                  <div key={project.id} className="rounded-2xl border-2 border-black bg-pastel-blue/10 p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project</div>
                        <div className="text-lg font-black">{project.name}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <StatusChip tone="primary">{project.taskCount || 0} tasks</StatusChip>
                        {canManageProject && (
                          <>
                            <button
                              type="button"
                              onClick={() => selectProjectForEdit(project.id)}
                              className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProject(project.id, project.name)}
                              disabled={actionKey === `proj:${project.id}`}
                              className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.managerId && (
                        <StatusChip>Manager: {memberMap.get(project.managerId)?.name || "Assigned"}</StatusChip>
                      )}
                      {(project.teamLeadIds || []).slice(0, 3).map((leadId) => (
                        <StatusChip key={leadId}>Lead: {memberMap.get(leadId)?.name || leadId.slice(0, 6)}</StatusChip>
                      ))}
                    </div>

                    {canManageProject && isAllowedToManageTasks && taskAssignableMembers.length > 0 && (
                      <div className="mb-4 rounded-xl border-2 border-dashed border-black/20 bg-white p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Drag task here to assign</div>
                          {draggedTaskId && (
                            <StatusChip tone="primary">Dragging</StatusChip>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {taskAssignableMembers.map((member) => (
                            <button
                              key={member._id}
                              type="button"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedTaskId) {
                                  assignTaskToMember(draggedTaskId, member._id);
                                }
                              }}
                              className={`rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                draggedTaskId ? "hover:bg-pastel-yellow" : ""
                              }`}
                              title="Drop a task here to assign it"
                            >
                              {member.name || member.email}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {(tasksByProject.get(project.id) || []).map((task) => {
                        const canManageTask = manageableTasks.some((item) => item.id === task.id);
                        const assignee = task.assignedTo ? memberMap.get(task.assignedTo) : null;
                        return (
                          <div
                            key={task.id}
                            draggable={isAllowedToManageTasks}
                            onDragStart={(e) => {
                              beginTaskDrag(task.id);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", task.id);
                            }}
                            onDragEnd={clearTaskDrag}
                            className={`rounded-xl border-2 border-black bg-white p-3 ${draggedTaskId === task.id ? "ring-4 ring-primary" : ""} ${isAllowedToManageTasks ? "cursor-grab active:cursor-grabbing" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-sm line-clamp-1">{task.title}</div>
                                <div className="mt-1 text-xs text-text-secondary line-clamp-2">{task.description || "No description"}</div>
                              </div>
                              <StatusChip
                                tone={task.status === "done" ? "success" : task.status === "review" ? "warning" : "default"}
                              >
                                {task.status}
                              </StatusChip>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {assignee && <StatusChip>{assignee.name}</StatusChip>}
                              {task.dueDate && <StatusChip>Due {new Date(task.dueDate).toLocaleDateString()}</StatusChip>}
                              <StatusChip>{task.priority || "medium"}</StatusChip>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleConvertToPost(task)}
                                className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                              >
                                <SquareDashedBottomCode className="h-3.5 w-3.5" />
                                Convert to Post
                              </button>
                              {canManageTask && (
                                <button
                                  type="button"
                                  onClick={() => selectTaskForEdit(task.id)}
                                  className="inline-flex items-center gap-1 rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              )}
                              {task.status !== "done" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem("access_token");
                                      await axios.put(`${API}/tasks/${task.id}/status`, { status: task.status === "todo" ? "in-progress" : "review" }, {
                                        headers: { Authorization: `Bearer ${token}` },
                                        withCredentials: true,
                                      });
                                      toast.success("Task moved");
                                      await fetchHierarchy();
                                    } catch (error) {
                                      toast.error(error.response?.data?.detail || "Failed to update task");
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                  <CircleDot className="h-3.5 w-3.5" />
                                  Advance Status
                                </button>
                              )}
                              {canManageTask && (
                                <button
                                  type="button"
                                  onClick={() => deleteTask(task.id, task.title)}
                                  disabled={actionKey === `task:${task.id}`}
                                  className="inline-flex items-center gap-1 rounded-xl border-2 border-black bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                                >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                            </div>
                            {canManageTask && taskAssignableMembers.length > 0 && (
                              <div className="mt-3 space-y-2 lg:hidden">
                                <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                                  Quick assign on mobile
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={mobileAssignTargets[task.id] || task.assignedTo || ""}
                                    onChange={(e) => setMobileAssignTargets((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                    className="brutal-input min-w-0 flex-1 px-3 py-3 text-sm"
                                  >
                                    <option value="">Choose teammate</option>
                                    {taskAssignableMembers.map((member) => (
                                      <option key={member._id} value={member._id}>
                                        {member.name || member.email} ({member.role})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const assigneeId = mobileAssignTargets[task.id] || task.assignedTo;
                                      if (assigneeId) {
                                        assignTaskToMember(task, assigneeId);
                                      }
                                    }}
                                    disabled={!mobileAssignTargets[task.id] && !task.assignedTo}
                                    className="inline-flex items-center justify-center rounded-xl border-2 border-black bg-pastel-yellow px-4 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                  >
                                    Assign
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(tasksByProject.get(project.id) || []).length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-black/20 bg-white p-4 text-sm text-text-muted">
                          No tasks yet for this project.
                        </div>
                      )}
                    </div>
                  </div>
                )})}

                {(department.projects || []).length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-black/20 bg-white p-6 text-sm text-text-muted">
                    No projects yet in this department.
                  </div>
                )}
              </div>
            </motion.article>
          ))}

          {(hierarchy.unassignedProjects || []).length > 0 && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="brutal-card p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <Plus className="h-5 w-5" />
                <h3 className="text-xl font-black font-heading">Unassigned Projects</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {hierarchy.unassignedProjects.map((project) => (
                  <div key={project.id} className="rounded-2xl border-2 border-black bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">{project.name}</div>
                        <div className="mt-1 text-xs text-text-secondary">{(tasksByProject.get(project.id) || []).length} tasks</div>
                      </div>
                      {isAllowedToManageProjects && (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => selectProjectForEdit(project.id)}
                            className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(project.id, project.name)}
                            disabled={actionKey === `proj:${project.id}`}
                            className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </section>
      </main>
    </div>
  );
}
