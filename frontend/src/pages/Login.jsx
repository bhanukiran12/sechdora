import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import OTPInput from "@/components/OTPInput";
import SchedoraLogo from "@/components/SchedoraLogo";

const BACKEND_URL = "/api";
const API = "/api";

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
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-border bg-white shadow-brutal-lg lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-cyan-400" />
            <SchedoraLogo size="sm" />
            <div className="mt-10 max-w-md">
              <div className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted shadow-brutal">
                Welcome to Schedora
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-text-primary md:text-5xl" data-testid="login-heading">
                {isRegister ? "Create your workspace" : "Welcome back"}
              </h1>
              <p className="mt-4 text-sm leading-6 text-text-secondary md:text-base">
                Social scheduling, team tasks, and content publishing in one clean place.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { title: "Connect Account", note: "Bring channels into one calm dashboard." },
                { title: "Create First Post", note: "Draft with AI and polish before publishing." },
                { title: "Schedule", note: "Ship on time and keep the team aligned." },
              ].map((step, index) => (
                <div key={step.title} className="flex items-start gap-4 rounded-2xl border border-border bg-white p-4 shadow-brutal">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">{step.title}</div>
                    <div className="text-sm text-text-secondary">{step.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-md">
              {!showOtp ? (
                <div className="mb-6">
                  <div className="mb-4 text-center sm:text-left">
                    <h2 className="text-2xl font-black tracking-tight text-text-primary" data-testid="login-heading-secondary">
                      {isRegister ? "Get started" : "Sign in"}
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      {isRegister ? "Set up your account in under a minute." : "Continue into your dashboard."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {!showOtp && (
                  <>
                    <a
                      href={`/api/auth/google`}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary shadow-brutal transition hover:-translate-y-0.5 no-underline"
                    >
                      <GoogleIcon />
                      {isRegister ? "Continue with Google" : "Sign in with Google"}
                    </a>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-text-muted">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                {showOtp ? (
                  <div className="space-y-6" data-testid="otp-view">
                    <div className="rounded-2xl border border-border bg-gray-50 p-5 text-center shadow-brutal">
                      <p className="text-sm text-text-secondary">
                        Enter the 6-digit code sent to <span className="font-semibold text-text-primary">{otpEmail}</span>
                      </p>
                      <div className="mt-6">
                        <OTPInput onComplete={handleVerifyOtp} disabled={loading} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleResendOtp}
                        disabled={resending}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary shadow-brutal transition hover:-translate-y-0.5"
                      >
                        {resending ? "Resending..." : "Resend code"}
                      </button>
                      <button
                        onClick={() => setShowOtp(false)}
                        className="text-sm font-medium text-text-secondary transition hover:text-text-primary"
                      >
                        Back to {isRegister ? "registration" : "login"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleEmailAuth} className="space-y-4" data-testid="email-auth-form">
                    {isRegister && (
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                          Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="brutal-input w-full py-3 text-sm"
                          placeholder="Your name"
                          required
                          data-testid="name-input"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="brutal-input w-full py-3 text-sm"
                        placeholder="you@example.com"
                        required
                        data-testid="email-input"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="brutal-input w-full py-3 text-sm"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        data-testid="password-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-brutal transition hover:-translate-y-0.5"
                      data-testid="email-auth-submit"
                    >
                      {loading ? "Please wait..." : (isRegister ? "Get started" : "Sign in")}
                    </button>
                  </form>
                )}

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-sm font-medium text-text-secondary transition hover:text-text-primary"
                    data-testid="toggle-auth-mode"
                  >
                    {isRegister ? "Already have an account? Sign in" : "Don't have an account? Create one"}
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => navigate('/')}
                    className="text-sm text-text-muted transition hover:text-text-primary"
                    data-testid="back-to-home-link"
                  >
                    ← Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
