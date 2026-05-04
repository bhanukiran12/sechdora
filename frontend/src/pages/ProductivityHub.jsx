import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import usePlan from "@/hooks/usePlan";
import { NotebookPen, StickyNote, Plus, CalendarDays, CheckCircle2, FileText, ArrowRight, Shield, ListTodo } from "lucide-react";

const STORAGE_KEY = "schedora_productivity_hub";

const emptyState = {
  notes: [
    { id: "note-1", title: "Client call", body: "Capture next actions and deliverables." },
  ],
  todos: [
    { id: "todo-1", title: "Plan next task batch", status: "todo", dueDate: "" },
  ],
  docs: [
    { id: "doc-1", title: "Weekly delivery note", body: "Summary, blockers, next steps." },
  ],
};

export default function ProductivityHub() {
  const navigate = useNavigate();
  const { planType, canTodoScheduling, canDocs, hasOrgTools } = usePlan();
  const [hydrated, setHydrated] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [draftTodo, setDraftTodo] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftDoc, setDraftDoc] = useState("");
  const [workspace, setWorkspace] = useState(emptyState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setWorkspace({ ...emptyState, ...JSON.parse(saved) });
      }
    } catch {
      setWorkspace(emptyState);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [hydrated, workspace]);

  const todoLimit = planType === "free" ? 10 : planType === "pro" ? 50 : null;
  const remainingTodos = todoLimit === null ? null : Math.max(0, todoLimit - workspace.todos.length);

  const addNote = () => {
    if (!draftNote.trim()) return;
    setWorkspace((prev) => ({ ...prev, notes: [{ id: crypto.randomUUID(), title: "Quick note", body: draftNote.trim() }, ...prev.notes] }));
    setDraftNote("");
    toast.success("Note added");
  };

  const addTodo = () => {
    if (!draftTodo.trim()) return;
    if (todoLimit !== null && workspace.todos.length >= todoLimit) {
      toast.error(`Free plan allows ${todoLimit} todos only`);
      return;
    }
    setWorkspace((prev) => ({
      ...prev,
      todos: [{ id: crypto.randomUUID(), title: draftTodo.trim(), status: "todo", dueDate: draftDueDate }, ...prev.todos],
    }));
    setDraftTodo("");
    setDraftDueDate("");
    toast.success("Todo added");
  };

  const addDoc = () => {
    if (!draftDoc.trim()) return;
    setWorkspace((prev) => ({
      ...prev,
      docs: [{ id: crypto.randomUUID(), title: "Working doc", body: draftDoc.trim() }, ...prev.docs],
    }));
    setDraftDoc("");
    toast.success("Doc saved");
  };

  const nextStatus = (status) => {
    if (status === "todo") return "in-progress";
    if (status === "in-progress") return "done";
    return "todo";
  };

  const badge = useMemo(() => {
    if (planType === "free") return "Free: notes + 10 todos";
    if (planType === "pro") return "Pro: todo scheduling";
    if (planType === "ultra_pro") return "Ultra Pro: docs + full productivity";
    if (planType === "organization") return "Organization: org tasks + team planning";
    return "Workspace";
  }, [planType]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="productivity" />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8 rounded-[28px] border border-border bg-white p-6 shadow-brutal-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                <NotebookPen className="h-3.5 w-3.5 text-primary" />
                Productivity
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-text-primary">Notes, todo planning, and docs</h1>
              <p className="mt-3 max-w-2xl text-sm text-text-secondary">
                Keep this workspace separate from social scheduling and project org management.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gray-50 px-4 py-3 text-sm font-semibold text-text-primary shadow-brutal">
              {badge}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Notes</div>
                  <h2 className="text-2xl font-black">Simple notes</h2>
                </div>
                <StickyNote className="h-5 w-5 text-primary" />
              </div>
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                className="brutal-input mt-4 w-full min-h-28 resize-none"
                placeholder="Write a quick note, meeting takeaway, or checklist..."
              />
              <button onClick={addNote} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5">
                <Plus className="h-4 w-4" />
                Add note
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Todos</div>
                  <h2 className="text-2xl font-black">Task list</h2>
                </div>
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={draftTodo}
                  onChange={(e) => setDraftTodo(e.target.value)}
                  className="brutal-input w-full py-3"
                  placeholder="Add a task"
                />
                <input
                  type="datetime-local"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className={`brutal-input w-full py-3 ${canTodoScheduling ? "" : "opacity-70"}`}
                  disabled={!canTodoScheduling}
                  title={canTodoScheduling ? "Set a due date" : "Todo scheduling unlocks on Pro"}
                />
              </div>
              <button onClick={addTodo} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5">
                <Plus className="h-4 w-4" />
                Add todo
              </button>
              {todoLimit !== null && (
                <p className="mt-2 text-xs text-text-muted">
                  {remainingTodos} todos left on this plan
                </p>
              )}
              <div className="mt-4 space-y-3">
                {workspace.todos.map((todo) => (
                  <div key={todo.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-gray-50 px-4 py-3">
                    <div>
                      <div className="font-semibold text-text-primary">{todo.title}</div>
                      <div className="text-xs text-text-muted">
                        {todo.dueDate ? `Due ${new Date(todo.dueDate).toLocaleString()}` : "No due date"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkspace((prev) => ({
                        ...prev,
                        todos: prev.todos.map((item) => item.id === todo.id ? { ...item, status: nextStatus(item.status) } : item),
                      }))}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold shadow-brutal"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {todo.status}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {canDocs && (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Docs</div>
                    <h2 className="text-2xl font-black">Notion-like docs</h2>
                  </div>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <textarea
                  value={draftDoc}
                  onChange={(e) => setDraftDoc(e.target.value)}
                  className="brutal-input mt-4 w-full min-h-36 resize-none"
                  placeholder="Write a working doc, brief, or outcome summary..."
                />
                <button onClick={addDoc} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5">
                  <Plus className="h-4 w-4" />
                  Save doc
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Workspace rules</div>
                  <h3 className="text-xl font-black">Keep it simple</h3>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 space-y-3 text-sm text-text-secondary">
                <div>Free: notes and 10 todos only.</div>
                <div>Pro: add due dates and schedule task reminders.</div>
                <div>Ultra Pro: docs, status tracking, and full productivity tools.</div>
                <div>Organization: team and org work stay separate from personal productivity.</div>
              </div>
              {hasOrgTools && (
                <button
                  type="button"
                  onClick={() => navigate("/organization")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-brutal transition hover:-translate-y-0.5"
                >
                  <Shield className="h-4 w-4" />
                  Open Org tasks
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Notes board</div>
              <div className="mt-4 space-y-3">
                {workspace.notes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-border bg-gray-50 p-4">
                    <div className="font-semibold text-text-primary">{note.title}</div>
                    <p className="mt-2 text-sm text-text-secondary">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
