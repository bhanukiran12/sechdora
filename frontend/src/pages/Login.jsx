import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import OTPInput from "@/components/OTPInput";
import SchedoraLogo from "@/components/SchedoraLogo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? "";
const API = `${BACKEND_URL}/api`;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [resending, setResending] = useState(false);

  const formatApiErrorDetail = (detail) => {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
      return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? { email, password, name } : { email, password };

      const response = await axios.post(`${API}${endpoint}`, payload, { withCredentials: true });

      if (isRegister) {
        setOtpEmail(email);
        setShowOtp(true);
        toast.info("Please check your inbox and spam folder for the verification code");
      } else {
        toast.success("Welcome back!");
        localStorage.setItem('access_token', response.data.access_token);
        
        // Check onboarding for returning users
        try {
          const statusRes = await axios.get(`${API}/onboarding/status`, {
            headers: { Authorization: `Bearer ${response.data.access_token}` },
            withCredentials: true
          });
          if (!statusRes.data.onboarding_completed) {
            navigate('/onboarding', { state: { user: response.data.user } });
            return;
          }
        } catch (e) { /* ignore */ }
        navigate('/dashboard', { state: { user: response.data.user } });
      }
    } catch (error) {
      if (!isRegister && error.response?.status === 403) {
        setOtpEmail(email);
        setShowOtp(true);
        toast.info("Please verify your email to continue");
        return;
      }
      const errorMsg = formatApiErrorDetail(error.response?.data?.detail) || error.message;
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        email: otpEmail,
        otp
      }, { withCredentials: true });

      toast.success("Email verified! Welcome to Schedora.");
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/onboarding', { state: { user: response.data.user } });
    } catch (error) {
      const errorMsg = formatApiErrorDetail(error.response?.data?.detail) || "Invalid code";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEmail) return;
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-otp`, { email: otpEmail }, { withCredentials: true });
      toast.success("Verification code resent");
    } catch (error) {
      const errorMsg = formatApiErrorDetail(error.response?.data?.detail) || "Unable to resend code";
      toast.error(errorMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="h-screen max-h-screen grid md:grid-cols-2 overflow-hidden bg-background">
      {/* Left - Auth Form */}
      <div className="flex items-center justify-center p-8 bg-background h-full">
        <div className="w-full max-w-md">
          <div className="mb-4 text-center sm:text-left">
            <div className="mb-4">
              <SchedoraLogo size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tighter mb-1" data-testid="login-heading">
              {isRegister ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-sm text-text-secondary">
              {isRegister ? "Start scheduling your content" : "Sign in to continue"}
            </p>
          </div>

          <div className="space-y-4">
            {/* Google Sign-In */}
            {!showOtp && (
              <>
                <a
                  href={`${BACKEND_URL}/api/auth/google`}
                  className="w-full brutal-button bg-white text-text-primary flex items-center justify-center gap-3 font-bold py-2 text-sm no-underline"
                >
                  <GoogleIcon />
                  {isRegister ? "Sign up with Google" : "Sign in with Google"}
                </a>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-black/10" />
                  <span className="text-xs font-bold text-text-muted">OR</span>
                  <div className="flex-1 h-px bg-black/10" />
                </div>
              </>
            )}

            {/* Email/Password Form */}
            {showOtp ? (
              <div className="space-y-6" data-testid="otp-view">
                <div className="text-center">
                  <p className="text-sm text-text-secondary mb-6">
                    Enter the 6-digit code sent to <span className="font-bold text-text-primary">{otpEmail}</span>
                  </p>
                  <OTPInput onComplete={handleVerifyOtp} disabled={loading} />
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="w-full brutal-button bg-white text-text-primary text-sm"
                  >
                    {resending ? "Resending..." : "Resend code"}
                  </button>
                  <button
                    onClick={() => setShowOtp(false)}
                    className="w-full text-xs font-bold text-text-secondary hover:underline"
                  >
                    Back to {isRegister ? "Registration" : "Login"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-3" data-testid="email-auth-form">
                {isRegister && (
                  <div>
                    <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="brutal-input w-full py-1.5 text-sm"
                      placeholder="Your name"
                      required
                      data-testid="name-input"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="brutal-input w-full py-1.5 text-sm"
                    placeholder="you@example.com"
                    required
                    data-testid="email-input"
                  />
                </div>

                <div>
                  <label className="text-xs tracking-[0.2em] uppercase font-bold text-text-muted mb-1 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="brutal-input w-full py-1.5 text-sm"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    data-testid="password-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full brutal-button bg-primary text-white py-2 font-bold"
                  data-testid="email-auth-submit"
                >
                  {loading ? "Please wait..." : (isRegister ? "Create Account" : "Sign In")}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs font-bold text-text-secondary hover:underline transition-all"
                data-testid="toggle-auth-mode"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
              data-testid="back-to-home-link"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Right - Image */}
      <div className="hidden md:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1617899644490-fbead7fb6183?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxjb250ZW50JTIwY3JlYXRvciUyMHdvcmtzcGFjZXxlbnwwfHx8fDE3NzYzNDU0NjF8MA&ixlib=rb-4.1.0&q=85"
          alt="Creator workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-12">
          <div className="text-white">
            <h2 className="text-3xl font-black font-heading mb-2">Built by Creators, for Creators</h2>
            <p className="text-lg opacity-90">Schedule smarter, not harder.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
