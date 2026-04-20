import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, BarChart3, Settings, LogOut, Shield, Upload, Menu, X, Briefcase, Zap } from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SchedoraLogo from "@/components/SchedoraLogo";

const API = `${process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com"}/api`;

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
    { id: 'jobs', label: 'Job Posts', icon: Briefcase, path: '/jobs' },
    { id: 'accounts', label: 'Accounts', icon: Settings, path: '/settings/accounts' },
    { id: 'pricing', label: 'Pricing', icon: Zap, path: '/pricing' },
  ];

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
      <div className="mb-10 flex items-center justify-between">
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
      {/* Mobile hamburger */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white border-4 border-black rounded-xl shadow-brutal"
        data-testid="hamburger-menu"
      >
        <Menu className="w-6 h-6" />
      </motion.button>

      {/* Mobile overlay */}
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

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-72 border-r-4 border-black bg-surface p-6 z-50 transform transition-transform duration-300 ease-out shadow-brutal-lg ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 h-screen border-r-4 border-black bg-surface p-8 flex-shrink-0 overflow-hidden sticky top-0" data-testid="sidebar">
        {sidebarContent}
      </aside>
    </>
  );
}
