import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Calendar as CalendarIcon, PlusCircle, GripVertical, RefreshCw, PencilLine, Trash2, X, Loader2, RotateCcw, BarChart3, Upload, Settings } from "lucide-react";

const BACKEND_URL = "/api";
const API = "/api";

export default function CalendarView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({
    content: "",
    scheduled_time: "",
    platforms: [],
    media_urls: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);

  useEffect(() => { fetchPosts(); }, []);

  useEffect(() => {
    const editPostId = location.state?.editPostId;
    if (!editPostId || allPosts.length === 0) return;
    const targetPost = allPosts.find((post) => post.post_id === editPostId);
    if (targetPost) {
      openEditModal(targetPost);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [allPosts, location.pathname, location.state, navigate]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/posts`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setAllPosts(response.data);
      setPosts(response.data.filter(p => p.status === 'scheduled' || p.status === 'published'));
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load posts');
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay() };
  };

  const getPostsForDay = (day) => {
    return posts.filter((post) => {
      const d = post.scheduled_time || post.published_at;
      if (!d) return false;
      const postDate = new Date(d);
      return postDate.getDate() === day && postDate.getMonth() === currentMonth.getMonth() && postDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const getWeekDays = (baseDate) => {
    const current = new Date(baseDate);
    const day = current.getDay();
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - day);
    return Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      return dayDate;
    });
  };

  const getPostsForDate = (date) => {
    return posts.filter((post) => {
      const d = post.scheduled_time || post.published_at;
      if (!d) return false;
      const postDate = new Date(d);
      return postDate.getDate() === date.getDate()
        && postDate.getMonth() === date.getMonth()
        && postDate.getFullYear() === date.getFullYear();
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  // Drag and drop handlers
  const handleDragStart = (e, post) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', post.post_id);
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = async (e, day) => {
    e.preventDefault();
    setDragOverDay(null);

    if (!draggedPost) return;

    const oldDate = new Date(draggedPost.scheduled_time || draggedPost.created_at);
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, oldDate.getHours(), oldDate.getMinutes());

    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API}/posts/${draggedPost.post_id}`, {
        ...draggedPost,
        scheduled_time: newDate.toISOString()
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });

      toast.success(`Post moved to ${newDate.toLocaleDateString()}`);
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reschedule post');
    }
    setDraggedPost(null);
  };

  const statusColors = {
    scheduled: 'bg-primary text-white',
    published: 'bg-green-500 text-white',
    failed: 'bg-red-500 text-white',
    draft: 'bg-gray-300 text-gray-700'
  };

  const recurrenceLabel = (r) => {
    if (!r || r === 'none') return null;
    return <span className="ml-1"><RefreshCw className="w-2.5 h-2.5 inline" /></span>;
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setEditForm({
      content: post.content || "",
      scheduled_time: post.scheduled_time ? new Date(post.scheduled_time).toISOString().slice(0, 16) : "",
      platforms: post.platforms || [],
      media_urls: (post.media_urls || []).join("; ")
    });
  };

  const closeEditModal = () => {
    setEditingPost(null);
    setEditForm({ content: "", scheduled_time: "", platforms: [], media_urls: "" });
  };

  const parseMediaUrls = (value) => {
    if (!value) return [];
    return String(value)
      .split(/[;,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  };

  const toggleEditPlatform = (platformId) => {
    setEditForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const saveEditedPost = async () => {
    if (!editingPost) return;
    if (!editForm.content.trim()) {
      toast.error("Enter post content");
      return;
    }
    if (editForm.platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (editingPost.status !== "draft" && editingPost.status !== "failed" && !editForm.scheduled_time) {
      toast.error("Pick a schedule time");
      return;
    }

    setSavingEdit(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`${API}/posts/${editingPost.post_id}`, {
        content: editForm.content,
        platforms: editForm.platforms,
        platform_captions: editingPost.platform_captions || {},
        target_accounts: editingPost.target_accounts || {},
        media_urls: parseMediaUrls(editForm.media_urls),
        scheduled_time: editForm.scheduled_time ? new Date(editForm.scheduled_time).toISOString() : editingPost.scheduled_time,
        status: editingPost.status,
        recurrence: editingPost.recurrence || "none",
        auto_retry: editingPost.auto_retry ?? true
      }, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      toast.success("Post updated");
      closeEditModal();
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteScheduledPost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    setDeletingPostId(postId);
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      toast.success("Post deleted");
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete post");
    } finally {
      setDeletingPostId(null);
    }
  };

  const retryFailedPost = async (postId) => {
    setDeletingPostId(postId);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API}/posts/${postId}/retry`, {}, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      toast.success("Retry started");
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to retry post");
    } finally {
      setDeletingPostId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar active="schedule" />
        <div className="flex-1 p-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex" data-testid="calendar-view-container">
      <Sidebar active="schedule" />
      <main className="flex-1 bg-background p-4 md:p-8 lg:p-12">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tighter mb-1" data-testid="calendar-heading">
              Content Calendar
            </h1>
            <p className="text-sm text-text-secondary">Keep publishing, bulk uploads, analytics, and accounts in one schedule workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-brutal">
              {["month", "week"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    viewMode === mode ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/posts/new')} className="brutal-button bg-primary text-white flex items-center gap-2" data-testid="new-post-button">
              <PlusCircle className="w-5 h-5" /> New Post
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-white p-4 shadow-brutal">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Schedule sidebar</div>
              <h2 className="text-lg font-black tracking-tight">Social controls</h2>
            </div>
            <div className="text-xs text-text-secondary">Quick access, no clutter</div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[
              { label: "Bulk Upload", path: "/posts/bulk-upload", icon: Upload },
              { label: "Analytics", path: "/analytics", icon: BarChart3 },
              { label: "Accounts", path: "/settings/accounts", icon: Settings },
              { label: "Calendar", path: "/posts/schedule", icon: CalendarIcon },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-gray-50 px-4 py-2 text-sm font-semibold text-text-primary shadow-brutal transition hover:-translate-y-0.5"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {viewMode === "week" && (
          <div className="mb-4 brutal-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">Weekly view</div>
                <h2 className="text-xl font-black font-heading">This week</h2>
              </div>
              <div className="text-xs text-text-secondary">Tasks and posts share one timeline</div>
            </div>
            <div className="grid grid-cols-7 gap-3 overflow-x-auto min-w-[700px]">
              {getWeekDays(currentMonth).map((dayDate) => {
                const dayPosts = getPostsForDate(dayDate);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                return (
                  <div key={dayDate.toISOString()} className={`rounded-2xl border border-border bg-white p-3 shadow-brutal ${isToday ? "ring-2 ring-primary/20" : ""}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">{dayDate.toLocaleDateString([], { weekday: "short" })}</div>
                      <div className="text-sm font-black">{dayDate.getDate()}</div>
                    </div>
                    <div className="space-y-2">
                      {dayPosts.slice(0, 4).map((post) => (
                        <div
                          key={post.post_id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post)}
                          className={`rounded-xl px-2 py-2 text-[10px] font-semibold shadow-sm ${statusColors[post.status] || 'bg-gray-100 text-text-primary'}`}
                          title={`${post.content} (${post.status})`}
                        >
                          <div className="truncate">{post.platforms[0]}</div>
                          <div className="mt-0.5 truncate opacity-80">
                            {new Date(post.scheduled_time || post.published_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar Header */}
        <div className={`brutal-card p-4 mb-4 ${viewMode === "week" ? "hidden" : ""}`}>
          <div className="flex justify-between items-center">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="brutal-button bg-white text-text-primary text-sm px-4 py-2" data-testid="prev-month-button">
              &larr; Prev
            </button>
            <h2 className="text-lg sm:text-2xl font-bold font-heading">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="brutal-button bg-white text-text-primary text-sm px-4 py-2" data-testid="next-month-button">
              Next &rarr;
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`brutal-card p-2 sm:p-4 overflow-x-auto ${viewMode === "week" ? "hidden" : ""}`} data-testid="calendar-grid">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-px min-w-[700px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-bold text-xs text-text-muted py-2 bg-pastel-yellow border border-border">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px min-w-[700px]">
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="bg-gray-50 border border-border min-h-[90px] sm:min-h-[110px]" />
            ))}

            {days.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
              const isDragOver = dragOverDay === day;

              return (
                <div
                  key={day}
                  className={`border border-border min-h-[90px] sm:min-h-[110px] p-1 sm:p-2 transition-colors ${
                    isDragOver ? 'bg-primary/10 border-primary' : isToday ? 'bg-pastel-blue/20' : 'bg-white hover:bg-gray-50'
                  }`}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                  data-testid={`calendar-day-${day}`}
                >
                  <div className={`font-bold text-xs sm:text-sm mb-1 ${isToday ? 'text-primary' : ''}`}>
                    {day}
                    {isToday && <span className="ml-1 text-[10px] bg-primary text-white px-1 rounded">today</span>}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.post_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post)}
                        className={`group text-[10px] sm:text-xs ${statusColors[post.status] || 'bg-gray-200'} px-1.5 py-1 rounded-xl border border-border/30 truncate cursor-grab active:cursor-grabbing flex items-center gap-0.5`}
                        title={`${post.content} (${post.status})`}
                        data-testid={`cal-post-${post.post_id}`}
                      >
                        <GripVertical className="w-3 h-3 flex-shrink-0 opacity-50" />
                        <span className="truncate">
                          {post.platforms[0]}
                          {recurrenceLabel(post.recurrence)}
                          {' '}{new Date(post.scheduled_time || post.published_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {post.status !== "published" && (
                          <div className="ml-auto hidden group-hover:flex items-center gap-1">
                            {post.status === "failed" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  retryFailedPost(post.post_id);
                                }}
                                disabled={deletingPostId === post.post_id}
                                className="rounded-full bg-white/90 p-1 text-green-700 hover:bg-green-50 disabled:opacity-60"
                                title="Retry post"
                              >
                                {deletingPostId === post.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEditModal(post);
                              }}
                              className="rounded-full bg-white/90 p-1 text-text-primary hover:bg-white"
                              title="Edit post"
                            >
                              <PencilLine className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteScheduledPost(post.post_id);
                              }}
                              disabled={deletingPostId === post.post_id}
                              className="rounded-full bg-white/90 p-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                              title="Delete post"
                            >
                              {deletingPostId === post.post_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-text-muted font-bold">+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary" /> Scheduled</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /> Published</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /> Failed</div>
          <div className="flex items-center gap-2"><GripVertical className="w-3 h-3" /> Drag to reschedule</div>
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12 text-text-muted mt-4">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No scheduled posts yet</p>
            <button onClick={() => navigate('/posts/new')} className="mt-4 brutal-button bg-primary text-white">Create Your First Post</button>
          </div>
        )}

        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEditModal}>
            <div className="w-full max-w-2xl brutal-card bg-white p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-black font-heading">Edit Scheduled Post</h3>
                  <p className="text-sm text-text-secondary">Update the content, platforms, or schedule.</p>
                </div>
                <button onClick={closeEditModal} className="rounded-full border-2 border-border p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Post Content</label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="brutal-input w-full h-40 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {['twitter', 'linkedin'].map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => toggleEditPlatform(platform)}
                        className={`rounded-xl border-2 border-border px-4 py-2 text-sm font-bold capitalize transition-all ${
                          editForm.platforms.includes(platform) ? 'bg-primary text-white' : 'bg-white text-text-primary'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Schedule Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.scheduled_time}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, scheduled_time: e.target.value }))}
                      onClick={(e) => {
                        try {
                          if (typeof e.currentTarget.showPicker === "function") {
                            e.currentTarget.showPicker();
                          }
                        } catch (error) {
                          // Some browsers only allow showPicker from direct pointer/keyboard actions.
                        }
                      }}
                      onFocus={(e) => {
                        try {
                          if (typeof e.currentTarget.showPicker === "function") {
                            e.currentTarget.showPicker();
                          }
                        } catch (error) {
                          // Some browsers only allow showPicker from direct pointer/keyboard actions.
                        }
                      }}
                      className="brutal-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Media URLs</label>
                    <input
                      type="text"
                      value={editForm.media_urls}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, media_urls: e.target.value }))}
                      className="brutal-input w-full"
                      placeholder="https://...; https://..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={closeEditModal} className="brutal-button bg-white text-text-primary">
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedPost}
                    disabled={savingEdit}
                    className="brutal-button bg-primary text-white flex items-center gap-2"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilLine className="w-4 h-4" />}
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
