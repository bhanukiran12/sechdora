import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Users, Mail, Shield, Trash2, CheckCircle, XCircle } from "lucide-react";

const API = `/api`;

export default function AdminPanel() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [userRes, membersRes, postsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { headers }),
        axios.get(`${API}/teams/members`, { headers }),
        axios.get(`${API}/posts?review_status=pending`, { headers })
      ]);

      setUser(userRes.data);
      setTeamMembers(membersRes.data);
      setPendingPosts(postsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${API}/teams/invite`,
        { email: inviteEmail, role: inviteRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Invitation sent! Share this link: ' + window.location.origin + '/accept-invite?token=' + response.data.token);
      setInviteEmail("");
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  const handleReviewPost = async (postId, action) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API}/posts/${postId}/review?action=${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Post ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to review post');
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar active="admin" />
        <div className="flex-1 p-12">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'owner') {
    return (
      <div className="flex">
        <Sidebar active="admin" />
        <div className="flex-1 p-12">
          <div className="brutal-card p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-text-secondary">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex" data-testid="admin-panel-container">
      <Sidebar active="admin" />

      <main className="flex-1 bg-background p-6 md:p-12">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-2" data-testid="admin-heading">
            Admin Panel
          </h1>
          <p className="text-base text-text-secondary">Manage your team and content</p>
        </div>

        {/* Team Invitations */}
        <div className="brutal-card p-6 mb-8" data-testid="invite-section">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6" strokeWidth={3} />
            <h2 className="text-2xl font-bold font-heading">Invite Team Member</h2>
          </div>

          <form onSubmit={handleInvite} className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="brutal-input w-full"
                required
                data-testid="invite-email-input"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="brutal-input flex-1"
                data-testid="invite-role-select"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                className="brutal-button bg-primary text-white"
                data-testid="send-invite-button"
              >
                Invite
              </button>
            </div>
          </form>
        </div>

        {/* Team Members */}
        <div className="brutal-card p-6 mb-8" data-testid="team-members-section">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6" strokeWidth={3} />
            <h2 className="text-2xl font-bold font-heading">Team Members ({teamMembers.length})</h2>
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-center py-8 text-text-muted">No team members yet. Invite your first member above.</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between border-2 border-border rounded-xl p-4"
                  data-testid={`member-${member._id}`}
                >
                  <div>
                    <div className="font-bold">{member.name}</div>
                    <div className="text-sm text-text-muted">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs tracking-[0.2em] uppercase font-bold px-3 py-1 border border-border rounded ${
                      member.role === 'admin' ? 'bg-primary text-white' :
                      member.role === 'editor' ? 'bg-pastel-blue' :
                      'bg-pastel-yellow'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Posts Review */}
        <div className="brutal-card p-6" data-testid="pending-posts-section">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6" strokeWidth={3} />
            <h2 className="text-2xl font-bold font-heading">Pending Posts ({pendingPosts.length})</h2>
          </div>

          {pendingPosts.length === 0 ? (
            <p className="text-center py-8 text-text-muted">No posts pending review</p>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <div
                  key={post.post_id}
                  className="border-2 border-border rounded-xl p-4"
                  data-testid={`pending-post-${post.post_id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      {post.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="text-xs tracking-[0.2em] uppercase font-bold bg-pastel-yellow px-2 py-1 border border-border rounded"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-text-muted">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-text-secondary mb-4 line-clamp-3">{post.content}</p>

                  {post.scheduled_time && (
                    <p className="text-xs text-text-muted mb-4">
                      Scheduled for: {new Date(post.scheduled_time).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReviewPost(post.post_id, 'approve')}
                      className="brutal-button bg-green-500 text-white flex items-center gap-2"
                      data-testid={`approve-${post.post_id}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewPost(post.post_id, 'reject')}
                      className="brutal-button bg-red-500 text-white flex items-center gap-2"
                      data-testid={`reject-${post.post_id}`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
