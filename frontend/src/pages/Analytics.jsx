import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { TrendingUp, Eye, Heart, MessageCircle, Download, Lock, Zap } from "lucide-react";
import usePlan from "@/hooks/usePlan";
import UpgradeModal from "@/components/UpgradeModal";
import { useNavigate } from "react-router-dom";

const API = `/api`;

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, message: "" });
  const { canAnalyticsDetailed, planType, loading: planLoading } = usePlan();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!canAnalyticsDetailed) {
      setUpgradeModal({ open: true, message: "Upgrade to Pro or Business to export your analytics data." });
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API}/analytics/export?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schedora-analytics.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Analytics exported!');
    } catch {
      toast.error('Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar active="analytics" />
        <div className="flex-1 p-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex" data-testid="analytics-container">
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, message: "" })}
        message={upgradeModal.message}
      />
      <Sidebar active="analytics" />

      <main className="flex-1 bg-background p-6 md:p-12">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-2" data-testid="analytics-heading">
              Analytics
            </h1>
            <p className="text-base text-text-secondary">Track your social media performance</p>
          </div>
          <button
            onClick={handleExport}
            className={`brutal-button flex items-center gap-2 px-5 py-2.5 font-black text-sm ${canAnalyticsDetailed ? 'bg-primary text-white' : 'bg-white text-text-muted border-dashed'}`}
          >
            {canAnalyticsDetailed ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {canAnalyticsDetailed ? 'Export CSV' : 'Export (Pro)'}
          </button>
        </div>

        {!canAnalyticsDetailed && !planLoading && (
          <div className="brutal-card p-4 mb-8 bg-pastel-yellow border-4 border-black flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
              <p className="font-bold text-sm">
                You're on the <span className="uppercase">{planType}</span> plan. Upgrade to Pro or Business to unlock detailed analytics, platform breakdowns, and CSV export.
              </p>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="brutal-button bg-primary text-white px-4 py-2 text-xs font-black flex items-center gap-1 whitespace-nowrap"
            >
              <Zap className="w-3 h-3" strokeWidth={3} /> Upgrade
            </button>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="brutal-card p-6" data-testid="metric-impressions">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pastel-blue border-2 border-border rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5" strokeWidth={3} />
              </div>
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">Impressions</div>
            </div>
            <div className="text-3xl font-black font-heading">{analytics?.total_impressions?.toLocaleString() || 0}</div>
            <div className="text-xs text-text-muted mt-2">Total views across all platforms</div>
          </div>

          <div className="brutal-card p-6" data-testid="metric-engagement">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pastel-pink border-2 border-border rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5" strokeWidth={3} />
              </div>
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">Engagement</div>
            </div>
            <div className="text-3xl font-black font-heading">{analytics?.total_engagement?.toLocaleString() || 0}</div>
            <div className="text-xs text-text-muted mt-2">Likes + Comments + Shares</div>
          </div>

          <div className="brutal-card p-6" data-testid="metric-avg-rate">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pastel-yellow border-2 border-border rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" strokeWidth={3} />
              </div>
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">Avg Rate</div>
            </div>
            <div className="text-3xl font-black font-heading">{analytics?.avg_engagement_rate || 0}%</div>
            <div className="text-xs text-text-muted mt-2">Average engagement rate</div>
          </div>

          <div className="brutal-card p-6" data-testid="metric-posts">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-aiAccent border-2 border-border rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5" strokeWidth={3} />
              </div>
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted">Total Posts</div>
            </div>
            <div className="text-3xl font-black font-heading">{analytics?.total_posts || 0}</div>
            <div className="text-xs text-text-muted mt-2">Published posts</div>
          </div>
        </div>

        {/* Best Performing Posts */}
        <div className="brutal-card p-6 mb-8" data-testid="best-posts-section">
          <h2 className="text-2xl font-bold font-heading mb-6">Top Performing Posts</h2>
          {analytics?.best_posts?.length > 0 ? (
            <div className="space-y-4">
              {analytics.best_posts.slice(0, 5).map((post, index) => (
                <div
                  key={post.analytics_id || index}
                  className="border-2 border-border rounded-xl p-4 hover:bg-pastel-blue/10 transition-colors"
                  data-testid={`best-post-${index}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs tracking-[0.2em] uppercase font-bold bg-pastel-yellow px-2 py-1 border border-border rounded">
                      {post.platform}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {post.engagement_rate}% engagement
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <div className="text-xs text-text-muted">Impressions</div>
                      <div className="font-bold">{post.impressions?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Likes</div>
                      <div className="font-bold">{post.likes?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Comments</div>
                      <div className="font-bold">{post.comments?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No analytics data yet</p>
              <p className="text-sm">Publish posts to see performance metrics</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="brutal-card p-6 bg-aiAccent mb-8" data-testid="ai-insights-section">
          <h2 className="text-2xl font-bold font-heading mb-4">AI Insights</h2>
          <div className="space-y-4">
            {analytics?.insights?.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 bg-white border-2 border-border rounded-xl p-4">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-medium">{insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Posting Times */}
        <div className="brutal-card p-6" data-testid="best-times-section">
          <h2 className="text-2xl font-bold font-heading mb-4">Best Posting Times</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border-2 border-border rounded-xl p-4">
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2">Weekdays</div>
              <div className="text-2xl font-black font-heading">9-11 AM</div>
              <div className="text-xs text-text-muted mt-1">Highest engagement</div>
            </div>
            <div className="border-2 border-border rounded-xl p-4">
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2">Evenings</div>
              <div className="text-2xl font-black font-heading">7-9 PM</div>
              <div className="text-xs text-text-muted mt-1">Second best</div>
            </div>
            <div className="border-2 border-border rounded-xl p-4">
              <div className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-2">Weekends</div>
              <div className="text-2xl font-black font-heading">10 AM-2 PM</div>
              <div className="text-xs text-text-muted mt-1">Consistent reach</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
