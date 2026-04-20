import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import "@/index.css";
import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? "https://sechdora.onrender.com";
const API = `${BACKEND_URL}/api`;

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PostCreator from "@/pages/PostCreator";
import CalendarView from "@/pages/CalendarView";
import Analytics from "@/pages/Analytics";
import ConnectedAccounts from "@/pages/ConnectedAccounts";
import AdminDashboard from "@/pages/AdminDashboard";
import BulkUpload from "@/pages/BulkUpload";
import Onboarding from "@/pages/Onboarding";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import FeedbackModal from "@/components/FeedbackModal";
import { MessageSquare } from "lucide-react";

// Protected Route Component
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) {
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          withCredentials: true
        });
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
      }
    };

    checkAuth();
  }, [location.state]);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen bg-background text-text-primary font-heading text-xl font-black uppercase">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      <FeedbackTrigger />
    </>
  );
}

function FeedbackTrigger() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const location = useLocation();
  
  // Don't show on admin or login
  if (location.pathname === '/login' || location.pathname === '/admin') return null;

  return (
    <>
      <button 
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-6 right-6 z-40 brutal-button bg-primary text-white p-3 rounded-full flex items-center justify-center brutal-shadow-heavy hover:scale-110 active:scale-95 transition-all"
        title="Give Feedback"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/posts/new" element={<ProtectedRoute><PostCreator /></ProtectedRoute>} />
      <Route path="/posts/schedule" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="/posts/bulk-upload" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings/accounts" element={<ProtectedRoute><ConnectedAccounts /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
