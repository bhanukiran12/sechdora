import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, BarChart3, Settings, LogOut, Shield, Upload, Menu, X, Briefcase, Zap, Coins, GitBranch } from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SchedoraLogo from "@/components/SchedoraLogo";
import SchedoraCoin from "@/components/SchedoraCoin";

const API = `/api`;

function TokenBadge({ tokens, isAdmin }) {
  const display = isAdmin ? "∞" : (tokens ?? 0);
  const postsLeft = Math.floor((tokens ?? 0) / 3);
  return (
    <div
      className="relative group"
      title={isAdmin ? "Admin — unlimited Schedora coins" : `${tokens ?? 0} Schedora coins (~${postsLeft} standard posts)`}
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-black bg-gradient-to-r from-fuchsia-50 via-orange-50 to-yellow-50 shadow-sm cursor-default select-none">
        <SchedoraCoin size={20} animated glow whiteBg />
        <span className="font-black text-sm text-text-primary">{display}</span>
      </div>
      <div className="absolute bottom-full left-0 mb-2 w-56 bg-black text-white text-xs font-bold rounded-xl px-3 py-2 shadow-brutal pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
        {isAdmin ? (
          <>Admin — unlimited Schedora coins<br /><span className="font-normal text-white/70">No limits on any feature</span></>
        ) : (
          <>{tokens ?? 0} Schedora coins<br /><span className="font-normal text-white/70">~{postsLeft} standard posts left</span></>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ active }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }, withCredentials: true
        });
        setUser(response.data);
      } catch (error) { /* silent */ }
    };
    fetchUser();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'schedule', label: 'Calendar', icon: Calendar, path: '/posts/schedule' },
    { id: 'bulk', label: 'Bulk Upload', icon: Upload, path: '/posts/bulk-upload' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'accounts', label: 'Accounts', icon: Settings, path: '/settings/accounts' },
    { id: 'tokens', label: 'Credits', icon: Coins, path: '/tokens' },
    { id: 'pricing', label: 'Pricing', icon: Zap, path: '/pricing' },
  ];

  if (user?.role !== 'employee') {
    menuItems.splice(1, 0, { id: 'organization', label: 'Org View', icon: GitBranch, path: '/organization' });
  }

  if (user?.role === 'admin' || user?.role === 'owner') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin' });
  }

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }, withCredentials: true
      });
    } catch (error) { /* silent */ }
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <motion.div
          initial={{ rotate: -4, y: -4, scale: 0.96 }}
          animate={{ rotate: 0, y: 0, scale: 1 }}
          whileHover={{ rotate: -1, y: -1 }}
          className="relative bg-white border-4 border-black p-3 px-4 shadow-brutal-lg rounded-xl rotate-[-2deg] overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-orange-400 to-yellow-300" />
          <SchedoraLogo size="sm" />
        </motion.div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 hover:bg-black/5 rounded-full" data-testid="close-sidebar">
          <X className="w-5 h-5" />
        </button>
      </div>

      {user && (
        <div className="mb-4">
          <TokenBadge tokens={user.tokens} isAdmin={user?.role === 'admin' || user?.role === 'owner'} />
        </div>
      )}

      <nav className="flex-1 space-y-3 overflow-y-auto pr-1 pb-4">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ x: 2 }}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border-2 ${
                isActive
                  ? 'bg-primary text-white border-black shadow-brutal translate-x-1'
                  : 'text-text-secondary border-transparent hover:border-black hover:bg-white hover:shadow-brutal-hover'
              }`}
              data-testid={`sidebar-${item.id}`}
            >
              <Icon className="w-5 h-5" strokeWidth={3} />
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 pt-4">
        {user && (
          <div className="mb-3 space-y-2">
            <div className="px-4 py-2 rounded-xl bg-white border-2 border-border text-xs font-bold text-text-muted truncate">
              {user.name || user.email}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-black bg-pastel-yellow text-[10px] font-black uppercase tracking-widest">
              <GitBranch className="w-3 h-3" />
              {user.role || 'employee'} role
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-text-muted hover:bg-red-50 hover:text-red-600 hover:border-red-600 border-2 border-transparent transition-all"
          data-testid="logout-button"
        >
          <LogOut className="w-5 h-5" strokeWidth={3} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white border-4 border-black rounded-xl shadow-brutal"
        data-testid="hamburger-menu"
      >
        <Menu className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
            data-testid="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-72 border-r-4 border-black bg-surface p-6 z-50 transform transition-transform duration-300 ease-out shadow-brutal-lg ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-sidebar"
      >
        {sidebarContent}
      </aside>

      <aside className="hidden lg:block w-72 h-screen border-r-4 border-black bg-surface p-8 flex-shrink-0 overflow-hidden sticky top-0" data-testid="sidebar">
        {sidebarContent}
      </aside>
    </>
  );
}
