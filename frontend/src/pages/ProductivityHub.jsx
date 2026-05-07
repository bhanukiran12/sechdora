import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import usePlan from "@/hooks/usePlan";
import { NotebookPen, StickyNote, Plus, CalendarDays, CheckCircle2, FileText, ArrowRight, Shield, ListTodo, Trash2, Edit2, X } from "lucide-react";
import { getDocs, createDoc, updateDoc, deleteDoc } from "@/utils/docs";

const STORAGE_KEY = "schedora_productivity_hub";

const emptyState = {
  notes: [
    { id: "note-1", title: "Client call", body: "Capture next actions and deliverables." },
  ],
  todos: [
    { id: "todo-1", title: "Plan next task batch", status: "todo", dueDate: "" },
  ],
};

export default function ProductivityHub() {
  const navigate = useNavigate();
  const { planType, canTodoScheduling, canDocs, hasOrgTools } = usePlan();
  const [hydrated, setHydrated] = useState(false);
  const [activeSection, setActiveSection] = useState("notes");
  const [draftNote, setDraftNote] = useState("");
  const [draftTodo, setDraftTodo] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftDoc, setDraftDoc] = useState("");
  const [draftDocTitle, setDraftDocTitle] = useState("");
  const [workspace, setWorkspace] = useState(emptyState);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingDocTitle, setEditingDocTitle] = useState("");
  const [editingDocContent, setEditingDocContent] = useState("");

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

  // Load docs from backend when canDocs becomes true
  useEffect(() => {
    if (!canDocs) return;
    loadDocs();
  }, [canDocs]);

  const loadDocs = async () => {
    try {
      setDocsLoading(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in to manage docs");
        return;
      }
      const fetchedDocs = await getDocs(token);
      setDocs(fetchedDocs);
    } catch (error) {
      console.error("Error loading docs:", error);
      toast.error("Failed to load docs");
    } finally {
      setDocsLoading(false);
    }
  };

  const todoLimit = planType === "free" ? 10 : planType === "pro" ? 50 : null;
  const remainingTodos = todoLimit === null ? null : Math.max(0, todoLimit - workspace.todos.length);

  const addDoc = async () => {
    if (!draftDocTitle.trim() || !draftDoc.trim()) {
      toast.error("Please provide both title and content");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in to save docs");
        return;
      }
      await createDoc({
        title: draftDocTitle.trim(),
        content: draftDoc.trim(),
        description: "",
        tags: []
      }, token);
      setDraftDoc("");
      setDraftDocTitle("");
      toast.success("Doc saved");
      loadDocs();
    } catch (error) {
      console.error("Error saving doc:", error);
      toast.error(error.response?.data?.detail || "Failed to save doc");
    }
  };

  const handleEditDoc = (doc) => {
    setEditingDocId(doc.id);
    setEditingDocTitle(doc.title);
    setEditingDocContent(doc.content);
  };

  const saveEditedDoc = async () => {
    if (!editingDocTitle.trim() || !editingDocContent.trim()) {
      toast.error("Please provide both title and content");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in");
        return;
      }
      await updateDoc(editingDocId, {
        title: editingDocTitle.trim(),
        content: editingDocContent.trim()
      }, token);
      setEditingDocId(null);
      toast.success("Doc updated");
      loadDocs();
    } catch (error) {
      console.error("Error updating doc:", error);
      toast.error(error.response?.data?.detail || "Failed to update doc");
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this doc?")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in");
        return;
      }
      await deleteDoc(docId, token);
      toast.success("Doc deleted");
      loadDocs();
      setSelectedDoc(null);
    } catch (error) {
      console.error("Error deleting doc:", error);
      toast.error(error.response?.data?.detail || "Failed to delete doc");
    }
  };

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

        {/* Section Navigation */}
        <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-brutal flex gap-3 flex-wrap">
          <button
            onClick={() => setActiveSection("notes")}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
              activeSection === "notes"
                ? "bg-primary text-white border-black shadow-brutal"
                : "border-transparent text-text-secondary hover:border-black hover:bg-gray-50"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Notes
          </button>
          <button
            onClick={() => setActiveSection("todos")}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
              activeSection === "todos"
                ? "bg-primary text-white border-black shadow-brutal"
                : "border-transparent text-text-secondary hover:border-black hover:bg-gray-50"
            }`}
          >
            <ListTodo className="h-4 w-4" />
            Todos
          </button>
          {canDocs && (
            <button
              onClick={() => setActiveSection("docs")}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
                activeSection === "docs"
                  ? "bg-primary text-white border-black shadow-brutal"
                  : "border-transparent text-text-secondary hover:border-black hover:bg-gray-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              Docs
            </button>
          )}
        </div>

        {/* Content Sections */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            {activeSection === "notes" && (
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
            )}

            {activeSection === "todos" && (
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
            )}

            {canDocs && activeSection === "docs" && (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Docs</div>
                    <h2 className="text-2xl font-black">Notion-like docs</h2>
                  </div>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {editingDocId ? (
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={editingDocTitle}
                      onChange={(e) => setEditingDocTitle(e.target.value)}
                      className="brutal-input w-full py-3"
                      placeholder="Document title..."
                    />
                    <textarea
                      value={editingDocContent}
                      onChange={(e) => setEditingDocContent(e.target.value)}
                      className="brutal-input w-full min-h-36 resize-none"
                      placeholder="Write a working doc, brief, or outcome summary..."
                    />
                    <div className="flex gap-3">
                      <button onClick={saveEditedDoc} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5">
                        <Plus className="h-4 w-4" />
                        Update doc
                      </button>
                      <button onClick={() => setEditingDocId(null)} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-black shadow-brutal transition hover:-translate-y-0.5">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        value={draftDocTitle}
                        onChange={(e) => setDraftDocTitle(e.target.value)}
                        className="brutal-input w-full py-3"
                        placeholder="Document title..."
                      />
                      <textarea
                        value={draftDoc}
                        onChange={(e) => setDraftDoc(e.target.value)}
                        className="brutal-input w-full min-h-36 resize-none"
                        placeholder="Write a working doc, brief, or outcome summary..."
                      />
                    </div>
                    <button onClick={addDoc} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5">
                      <Plus className="h-4 w-4" />
                      Save doc
                    </button>
                  </>
                )}
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

            {activeSection === "notes" && (
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
            )}
            {canDocs && activeSection === "docs" && (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-brutal">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Docs board</div>
                {docsLoading ? (
                  <div className="mt-4 text-sm text-text-secondary">Loading docs...</div>
                ) : docs.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {docs.map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-border bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-text-primary">{doc.title}</div>
                            <p className="mt-2 text-sm text-text-secondary line-clamp-2">{doc.content}</p>
                            <div className="mt-2 text-xs text-text-muted line-clamp-1">{new Date(doc.updated_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              handleEditDoc(doc);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs font-semibold shadow-brutal transition hover:-translate-y-0.5"
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-brutal transition hover:-translate-y-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-border bg-gray-50 p-4 text-sm text-text-secondary">
                    No saved docs yet. Use the Docs section to add a new one.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
