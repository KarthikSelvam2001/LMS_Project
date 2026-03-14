import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Eye, EyeOff, BookOpen, Users, Award, AlertCircle } from "lucide-react";

const demoCredentials = [
  {
    role: "Admin",
    email: "alice@lms.com",
    password: "Admin@123",
    color: "bg-red-100 text-red-700 border-red-200",
    badgeClass: "bg-red-100 text-red-700",
    icon: "🛡️",
  },
  {
    role: "Instructor",
    email: "bob@lms.com",
    password: "Trainer@123",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-700",
    icon: "📚",
  },
  {
    role: "Student",
    email: "eva@lms.com",
    password: "Learner@123",
    color: "bg-green-100 text-green-700 border-green-200",
    badgeClass: "bg-green-100 text-green-700",
    icon: "🎓",
  },
];

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (cred: typeof demoCredentials[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left: Branding */}
        <div className="text-white space-y-8 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">LMS Portal</h1>
              <p className="text-slate-400 text-sm">Learning Management System</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">
              Manage Learning,<br />
              <span className="text-primary">Empower Growth</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              A complete LMS platform for admins, instructors, and students to create, manage, and track learning journeys.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <Users className="w-5 h-5" />, label: "12 Users", sub: "Across all roles" },
              { icon: <BookOpen className="w-5 h-5" />, label: "12 Courses", sub: "Published & draft" },
              { icon: <Award className="w-5 h-5" />, label: "18 Enrollments", sub: "Active learning" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-primary mb-2 flex justify-center">{stat.icon}</div>
                <div className="font-bold">{stat.label}</div>
                <div className="text-slate-400 text-xs">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Demo credentials */}
          <div className="space-y-3">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Demo Credentials</p>
            {demoCredentials.map((cred) => (
              <button
                key={cred.role}
                onClick={() => fillCredentials(cred)}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-3 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cred.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{cred.role}</div>
                      <div className="text-slate-400 text-xs">{cred.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">
                    {cred.password}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="w-full">
          <Card className="shadow-2xl border-0 bg-white dark:bg-slate-900">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center gap-2 mb-2 lg:hidden">
                <GraduationCap className="w-6 h-6 text-primary" />
                <span className="text-lg font-bold">LMS Portal</span>
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to access your LMS dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Quick login buttons */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Quick Login — click to fill</p>
                <div className="grid grid-cols-3 gap-2">
                  {demoCredentials.map((cred) => (
                    <button
                      key={cred.role}
                      type="button"
                      onClick={() => fillCredentials(cred)}
                      className={`border rounded-lg p-2.5 text-left transition-all hover:scale-[1.02] hover:shadow-sm active:scale-95 ${cred.color}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base leading-none">{cred.icon}</span>
                        <span className="text-xs font-bold">{cred.role}</span>
                      </div>
                      <div className="text-[10px] font-mono opacity-80 truncate">{cred.email}</div>
                      <div className="text-[10px] font-mono opacity-70">{cred.password}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="alice@lms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter />
          </Card>
        </div>
      </div>
    </div>
  );
}
