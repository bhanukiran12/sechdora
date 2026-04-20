import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  Twitter, 
  Linkedin, 
  Facebook, 
  Instagram, 
  Youtube,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const [statsRes, feedbackRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${BACKEND_URL}/api/admin/feedback`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats(statsRes.data);
        setFeedback(feedbackRes.data);
      } catch (err) {
        console.error("Admin access error:", err);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <BarChart3 className="w-12 h-12 text-primary animate-bounce" />
      </div>
    );
  }

  const platformIcons = {
    twitter: Twitter,
    linkedin: Linkedin,
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-text-primary">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 mb-6 font-bold text-sm hover:translate-x-[-4px] transition-transform"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </button>
        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase mb-2">
          Admin Control
        </h1>
        <p className="text-text-secondary font-bold">System pulse and user satisfaction</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Stats Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-primary/10 border-4 border-text-primary p-6 brutal-shadow-dark">
              <Users className="w-10 h-10 mb-4" />
              <div className="text-4xl font-black">{stats?.total_users}</div>
              <div className="font-bold opacity-70">Total Users</div>
              <div className="text-xs font-black text-primary mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {stats?.verified_users} Verified
              </div>
            </div>
            <div className="bg-secondary/10 border-4 border-text-primary p-6 brutal-shadow-dark">
              <BarChart3 className="w-10 h-10 mb-4" />
              <div className="text-4xl font-black">{stats?.total_posts}</div>
              <div className="font-bold opacity-70">Total Live Posts</div>
              <div className="text-xs font-black text-secondary mt-2">
                Processed via real APIs
              </div>
            </div>
          </div>

          {/* Social Connectivity */}
          <div className="bg-white border-4 border-text-primary p-6 brutal-shadow-dark">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Platform Connectivity
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Object.entries(stats?.platform_stats || {}).map(([platform, count]) => {
                const Icon = platformIcons[platform] || Settings;
                return (
                  <div key={platform} className="flex flex-col items-center justify-center p-4 border-2 border-text-primary bg-background brutal-shadow-sm">
                    <Icon className="w-6 h-6 mb-2" />
                    <div className="text-lg font-black">{count}</div>
                    <div className="text-[10px] uppercase font-black opacity-50">{platform}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback Column */}
        <div className="space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6" /> User Feedback
          </h3>
          <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {feedback.length === 0 && (
              <div className="p-12 border-4 border-dashed border-border text-center grayscale opacity-50">
                <p className="font-bold">No feedback received yet</p>
              </div>
            )}
            {feedback.map((f, i) => (
              <div key={i} className="bg-white border-4 border-text-primary p-4 brutal-shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={`text-xs ${s <= f.rating ? 'text-primary' : 'text-border'}`}>★</span>
                    ))}
                  </div>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                     f.type === 'bug' ? 'bg-red-100 text-red-600' : 
                     f.type === 'feature' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {f.type}
                  </span>
                </div>
                <p className="text-sm font-bold mb-2 break-words">"{f.comment}"</p>
                <div className="flex items-center gap-2 mt-4 pt-2 border-t border-dotted border-border text-[10px] font-bold text-text-secondary">
                  <Clock className="w-3 h-3" />
                  {new Date(f.timestamp).toLocaleDateString()}
                  <span className="ml-auto opacity-50">{f.user_email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
