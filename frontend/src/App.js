import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import "@/index.css";
import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? "/api";
const API = `/api`;

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PostCreator from "@/pages/PostCreator";
import CalendarView from "@/pages/CalendarView";
import ProductivityHub from "@/pages/ProductivityHub";
import Analytics from "@/pages/Analytics";
import OrganizationView from "@/pages/OrganizationView";
import ConnectedAccounts from "@/pages/ConnectedAccounts";
import AdminDashboard from "@/pages/AdminDashboard";
import BulkUpload from "@/pages/BulkUpload";
import Onboarding from "@/pages/Onboarding";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import PricingPage from "@/pages/PricingPage";
import AuthCallback from "@/pages/AuthCallback";
import TokenDashboard from "@/pages/TokenDashboard";
import FormsDashboard from "@/pages/FormsDashboard";
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

function AdminRoute({ children }) {
  const [status, setStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get(`${API}/user/plan`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          withCredentials: true
        });
        setStatus(res.data?.isAdmin ? 'admin' : 'denied');
      } catch {
        setStatus('denied');
      }
    };
    check();
  }, [location]);

  if (status === null) return <div className="flex items-center justify-center min-h-screen bg-background font-heading text-xl font-black">Loading...</div>;
  if (status === 'denied') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
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
        className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center rounded-full border border-border bg-primary p-3 text-white shadow-brutal-lg transition hover:-translate-y-0.5 active:translate-y-0"
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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/productivity" element={<ProtectedRoute><ProductivityHub /></ProtectedRoute>} />
      <Route path="/posts/new" element={<ProtectedRoute><PostCreator /></ProtectedRoute>} />
      <Route path="/organization" element={<ProtectedRoute><OrganizationView /></ProtectedRoute>} />
      <Route path="/posts/schedule" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="/posts/bulk-upload" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings/accounts" element={<ProtectedRoute><ConnectedAccounts /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/forms" element={<ProtectedRoute><FormsDashboard /></ProtectedRoute>} />
      <Route path="/tokens" element={<ProtectedRoute><TokenDashboard /></ProtectedRoute>} />
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
