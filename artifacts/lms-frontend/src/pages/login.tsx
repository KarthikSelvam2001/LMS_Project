import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, Users, Award, Sparkles } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_CLIENT_ID =
  "685512374164-703ql8tr6ql5ipg8kb204f9qpjsjroun.apps.googleusercontent.com";

export default function Login() {
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loginWithGoogle, login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: false, // CRITICAL: Fixes AbortError when FedCM is not fully enabled/supported
        error_callback: (err: any) => {
          console.error("Google GIS error_callback:", err);
          if (err.type === "display_error") {
            setError("Google One Tap could not be displayed. Please use the button below.");
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the official Google button (Visible now!)
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "filled_blue",
          size: "large",
          width: 320,
          logo_alignment: "left"
        });
      }
      
      // Attempt One Tap prompt (if allowed by browser policy)
      window.google.accounts.id.prompt();
    };

    const existingScript = document.getElementById("google-gis-script");
    if (existingScript) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, []);

  const handleCredentialResponse = async (response: any) => {
    console.log("Google GIS response received");
    setError("");
    setIsLoading(true);
    try {
      if (!response.credential) {
        throw new Error("Login cancelled or failed at Google.");
      }
      await loginWithGoogle(response.credential);
      setLocation("/");
    } catch (err: any) {
      console.error("Login with Google error:", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // We already have the official button rendered, but we can also trigger the prompt manually
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { icon: <Users className="w-5 h-5" />, label: "Multi-Role", sub: "Admin · Trainer · Learner" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", sub: "Published & tracked" },
    { icon: <Award className="w-5 h-5" />, label: "Certificates", sub: "Auto-generated PDF" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      }}
    >
      {/* Animated blobs */}
      <div
        className="absolute top-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
      />
      <div
        className="absolute bottom-[-100px] right-[-100px] w-[360px] h-[360px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
      />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Left: Branding */}
        <div className="text-white space-y-8 hidden lg:block">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg border border-white/10 p-1 bg-white/5">
              <img src="/logo.jpg" alt="LMS Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">LMS Portal</h1>
              <p className="text-indigo-300 text-sm">Learning Management System</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Premium Learning Platform</span>
            </div>
            <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
              Learn Without
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Limits.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="text-indigo-400 mb-2 flex justify-center">{s.icon}</div>
                <div className="font-bold text-sm">{s.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="w-full">
          <div
            className="rounded-3xl p-8 shadow-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.07)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {/* Header */}
            <div className="space-y-2 mb-10 text-center">
              <h2 className="text-white text-3xl font-extrabold tracking-tight">
                LMS Access 🚀
              </h2>
              <p className="text-slate-300 text-base">
                {showEmailLogin ? "Sign in with your credentials" : "Continue with Google to enter"}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="mb-8 flex flex-col items-start gap-1 rounded-xl p-4 text-sm animate-in fade-in slide-in-from-top-4 duration-300"
                style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-red-400">
                  <span>⚠</span>
                  <span>Authentication Notice</span>
                </div>
                <span>{error}</span>
              </div>
            )}

            {!showEmailLogin ? (
              <div className="flex flex-col items-center space-y-8 py-8">
                {/* Official Google Button Container */}
                <div className="relative group">
                   <div 
                     ref={googleBtnRef} 
                     className="min-h-[50px] min-w-[320px] transition-transform hover:scale-[1.02]"
                   />
                   {isLoading && (
                     <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleTraditionalLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin1@lms.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl py-4 font-bold text-white transition-all duration-200 mt-2 hover:brightness-110 disabled:opacity-60 shadow-lg"
                    style={{
                      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.3)"
                    }}
                  >
                    {isLoading ? "Signing in..." : "Log In"}
                  </button>
                </form>

                {/* Quick Demo Section (Inside Manual) */}
                <div className="pt-6 border-t border-white/10">
                  <p className="text-[10px] uppercase font-bold text-indigo-400 mb-4 tracking-widest text-center">Quick Demo Accounts</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: "Admin", email: "admin1@lms.com", pass: "Admin@123" },
                      { role: "Trainer", email: "david@lms.com", pass: "Trainer@123" },
                      { role: "Learner", email: "olivia@lms.com", pass: "Learner@123" }
                    ].map(u => (
                      <button
                        key={u.role}
                        type="button"
                        onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-1 text-[10px] font-bold text-slate-300 transition-all active:scale-95"
                      >
                        {u.role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={() => { setShowEmailLogin(false); setError(""); }}
                    className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    ← Back to Google SSO
                  </button>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-center items-center gap-6 opacity-40">
              {[
                { icon: "🔒", text: "Encrypted" },
                { icon: "🛡️", text: "Secure" },
                { icon: "☁️", text: "Verified" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5">
                  <span className="text-xs">{item.icon}</span>
                  <span className="text-[10px] text-white font-medium uppercase tracking-tight">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
