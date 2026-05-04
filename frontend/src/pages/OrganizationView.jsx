import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
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

export default function OrganizationView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState(null);

  const fetchHierarchy = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API}/org/hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setHierarchy(res.data);
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

  const handleConvertToPost = (task) => {
    navigate("/posts/new", { state: { task } });
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <StatTile label="Departments" value={hierarchy.organization.departmentCount} note="Optional operating layers" />
          <StatTile label="Projects" value={hierarchy.organization.projectCount} note="Active work containers" />
          <StatTile label="Tasks" value={hierarchy.organization.taskCount} note="Execution workload" />
          <StatTile label="Team roles" value={hierarchy.members.length} note="Visible chain of ownership" />
        </div>

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
                <div className="flex flex-wrap gap-2">
                  <StatusChip>{department.projectCount || 0} projects</StatusChip>
                  <StatusChip tone="warning">{department.taskCount || 0} tasks</StatusChip>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {(department.projects || []).map((project) => (
                  <div key={project.id} className="rounded-2xl border-2 border-black bg-pastel-blue/10 p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Project</div>
                        <div className="text-lg font-black">{project.name}</div>
                      </div>
                      <StatusChip tone="primary">{project.taskCount || 0} tasks</StatusChip>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.managerId && (
                        <StatusChip>Manager: {memberMap.get(project.managerId)?.name || "Assigned"}</StatusChip>
                      )}
                      {(project.teamLeadIds || []).slice(0, 3).map((leadId) => (
                        <StatusChip key={leadId}>Lead: {memberMap.get(leadId)?.name || leadId.slice(0, 6)}</StatusChip>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {(tasksByProject.get(project.id) || []).map((task) => {
                        const assignee = task.assignedTo ? memberMap.get(task.assignedTo) : null;
                        return (
                          <div key={task.id} className="rounded-xl border-2 border-black bg-white p-3">
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
                            </div>
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
                ))}

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
                    <div className="font-black">{project.name}</div>
                    <div className="mt-1 text-xs text-text-secondary">{(tasksByProject.get(project.id) || []).length} tasks</div>
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
