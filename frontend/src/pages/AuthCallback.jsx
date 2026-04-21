import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API = `/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Check for Google OAuth redirect (?token=...&provider=google)
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get("token");
        const provider = queryParams.get("provider");
        const loginError = queryParams.get("error");

        if (loginError) {
          const msgs = {
            google_denied: "Google sign-in was cancelled.",
            token_exchange: "Google authentication failed. Please try again.",
            userinfo: "Could not retrieve your Google account info.",
            no_email: "No email found in your Google account.",
          };
          toast.error(msgs[loginError] || "Authentication failed.");
          navigate("/login", { replace: true });
          return;
        }

        if (token && provider === "google") {
          localStorage.setItem("access_token", token);
          toast.success("Signed in with Google!");

          // Check onboarding
          try {
            const statusRes = await axios.get(`${API}/onboarding/status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!statusRes.data.onboarding_completed) {
              navigate("/onboarding", { replace: true });
              return;
            }
          } catch (e) { /* ignore */ }

          navigate("/dashboard", { replace: true });
          return;
        }

        // Legacy flow: session_id in hash
        const hash = location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const sessionId = hashParams.get("session_id");

        if (!sessionId) throw new Error("No session ID found");

        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId,
        }, { withCredentials: true });

        const { access_token, user } = response.data;
        localStorage.setItem("access_token", access_token);

        try {
          const statusRes = await axios.get(`${API}/onboarding/status`, {
            headers: { Authorization: `Bearer ${access_token}` },
            withCredentials: true,
          });
          if (!statusRes.data.onboarding_completed) {
            navigate("/onboarding", { replace: true, state: { user } });
            return;
          }
        } catch (e) { /* ignore */ }

        navigate("/dashboard", { replace: true, state: { user } });
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Authentication failed. Please try again.");
        navigate("/login", { replace: true });
      }
    };

    processSession();
  }, [navigate, location]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="mb-4 text-4xl font-black font-heading animate-pulse">Signing you in...</div>
        <div className="text-text-muted">Please wait</div>
      </div>
    </div>
  );
}
