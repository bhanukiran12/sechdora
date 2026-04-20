import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Check, X, AlertCircle, ExternalLink, 
  Loader2, ShieldCheck, Share2, Info 
} from "lucide-react";
import { PLATFORMS } from "@/constants/platforms";

const API = `${process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com"}/api`;

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);

  useEffect(() => {
    fetchAccounts();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/social-accounts`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const disconnectAccount = async (accountId) => {
    setDisconnecting(accountId);
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API}/social-accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      toast.success('Account disconnected');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleConnect = async (platformId) => {
    setConnecting(platformId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/social-accounts/oauth-url/${platformId}`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start OAuth');
      setConnecting(null);
    }
  };

  const isConnected = (platformId) => accounts.some(acc => acc.platform === platformId);

  if (loading) {
    return (
      <div className="flex bg-background min-h-screen">
        <Sidebar active="accounts" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 font-black uppercase tracking-widest text-xs">Loading Channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar active="accounts" />
      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-5xl font-black font-heading tracking-tighter mb-2">Social Channels</h1>
          <p className="text-text-secondary">Manage where your content gets published.</p>
        </div>

        {/* Empty State vs Connected List */}
        {accounts.length === 0 ? (
          <div className="brutal-card p-12 text-center bg-white mb-12 border-dashed border-4 border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-black mb-3">No accounts connected yet</h2>
            <p className="text-text-secondary max-w-md mx-auto mb-8">
              Connect your first social media channel to start scheduling posts and analyzing your reach.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => document.getElementById('platforms-grid').scrollIntoView({ behavior: 'smooth' })}
                className="brutal-button bg-primary text-white px-8 py-3 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Connect Your First Account
              </button>
            </div>
          </div>
        ) : (
          <div className="brutal-card p-8 bg-white mb-12 shadow-brutal">
            <div className="flex items-center gap-3 mb-8 border-b-4 border-black pb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
              <h2 className="text-3xl font-black">Connected Channels</h2>
            </div>
            <div className="grid gap-4">
              {accounts.map((account) => {
                const platform = PLATFORMS.find(p => p.id === account.platform);
                return (
                  <div key={account.account_id} className="flex items-center justify-between border-4 border-black rounded-none p-6 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 ${platform?.color || 'bg-gray-400'} border-4 border-black flex items-center justify-center ${platform?.textColor || 'text-white'} text-xl font-black shadow-brutalSoft`}>
                        {platform?.iconText || '?'}
                      </div>
                      <div>
                        <div className="font-black text-lg">{platform?.name || account.platform}</div>
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">{account.username || 'Connected'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-2 text-xs font-black uppercase text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
                      </span>
                      <button 
                        onClick={() => disconnectAccount(account.account_id)} 
                        disabled={disconnecting === account.account_id}
                        className="brutal-button bg-white text-red-500 hover:bg-red-50"
                      >
                        {disconnecting === account.account_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Platforms Grid */}
        <div id="platforms-grid" className="space-y-8">
          <div className="flex items-center gap-3">
            <Plus className="w-8 h-8" />
            <h2 className="text-3xl font-black">Available Platforms</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLATFORMS.map((platform) => {
              const connected = isConnected(platform.id);
              const isLoading = connecting === platform.id;
              
              return (
                <div key={platform.id} className={`brutal-card p-8 flex flex-col items-center text-center group transition-all ${
                  platform.comingSoon ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-brutal-hover'
                }`}>
                  <div className={`w-20 h-20 ${platform.color} border-4 border-black shadow-brutal flex items-center justify-center ${platform.textColor} text-3xl font-black mb-6 group-hover:rotate-6 transition-transform`}>
                    {platform.iconText}
                  </div>
                  <h3 className="text-xl font-black mb-2">{platform.name}</h3>
                  <p className="text-xs text-text-muted mb-8 font-medium">
                    {platform.comingSoon ? "Integration in development" : `Schedule unlimited ${platform.name} posts.`}
                  </p>
                  
                  {platform.comingSoon ? (
                    <span className="text-[10px] font-black uppercase tracking-tighter bg-black text-white px-4 py-1">Coming Soon</span>
                  ) : connected ? (
                    <div className="space-y-3 w-full">
                      <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 px-6 py-2 border-2 border-green-700 font-black text-xs uppercase">
                        <Check className="w-4 h-4" /> Connected
                      </div>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={isLoading}
                        className="brutal-button bg-white text-black w-full flex items-center justify-center gap-2 px-8"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isLoading ? 'Connecting...' : `Connect Another`}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isLoading}
                      className="brutal-button bg-primary text-white w-full flex items-center justify-center gap-2 px-8"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      {isLoading ? 'Connecting...' : `Connect`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 brutal-card p-8 bg-aiAccent border-4 border-black relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Info className="w-10 h-10" />
              <div>
                <h3 className="text-xl font-black mb-1">Having trouble connecting?</h3>
                <p className="text-sm opacity-80">Check our integration guides or contact support for help.</p>
              </div>
            </div>
            <button className="brutal-button bg-white text-black whitespace-nowrap">View Documentation</button>
          </div>
        </div>
      </main>
    </div>
  );
}
