import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');

        if (!sessionId) throw new Error('No session ID found');

        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId
        }, { withCredentials: true });

        const { access_token, user } = response.data;

        localStorage.setItem('access_token', access_token);

        // Check onboarding status
        try {
          const statusRes = await axios.get(`${API}/onboarding/status`, {
            headers: { Authorization: `Bearer ${access_token}` },
            withCredentials: true
          });
          if (!statusRes.data.onboarding_completed) {
            navigate('/onboarding', { replace: true, state: { user } });
            return;
          }
        } catch (e) {
          // If onboarding endpoint fails, go to dashboard
        }

        navigate('/dashboard', { replace: true, state: { user } });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login', { replace: true });
      }
    };

    processSession();
  }, [navigate, location]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="mb-4 text-4xl font-black font-heading">Authenticating...</div>
        <div className="text-text-muted">Please wait</div>
      </div>
    </div>
  );
}
