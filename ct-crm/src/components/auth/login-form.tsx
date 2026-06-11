"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useTheme } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, SunIcon, MoonIcon } from "@animateicons/react/lucide";

export function LoginForm() {
  const emailIconRef = useRef<any>(null);
  const passwordIconRef = useRef<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { isLoaded, signIn, setActive } = useSignIn();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Welcome back!");
        // Redirect to intended page (from ?from= param) or dashboard
        const from = searchParams.get("from");
        router.replace(from && from.startsWith("/") && !from.startsWith("/login") && !from.startsWith("/register") ? from : "/dashboard");
      } else {
        toast.error("Additional verification required");
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || "Failed to initialize Google login");
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <div className="glass-card neon-teal-border animate-pulse" style={{ minHeight: "600px" }}>
            <div className="space-y-6 p-2">
              {/* Logo skeleton */}
              <div className="flex justify-center mb-8">
                <div className="skeleton-pulse h-12 w-48 rounded-lg" />
              </div>
              {/* Title skeleton */}
              <div className="skeleton-pulse h-8 w-40 rounded-lg mx-auto" />
              <div className="skeleton-pulse h-4 w-64 rounded-lg mx-auto" />
              {/* Input skeletons */}
              <div className="space-y-4 mt-8">
                <div className="skeleton-pulse h-4 w-20 rounded" />
                <div className="skeleton-pulse h-12 w-full rounded-xl" />
                <div className="skeleton-pulse h-4 w-20 rounded" />
                <div className="skeleton-pulse h-12 w-full rounded-xl" />
              </div>
              {/* Button skeleton */}
              <div className="skeleton-pulse h-12 w-full rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-[5%] py-8">
        <div className="flex flex-col items-start select-none">
          <span className="brand-logo-text select-none" style={{ fontSize: "1.45rem", marginBottom: "0.08rem" }}>CT-CRM</span>
          <span className="brand-logo-subtitle select-none text-left" style={{ fontSize: "0.42rem", letterSpacing: "0.22em", marginLeft: "0.05em" }}>Enterprise Platform</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-[45px] h-[45px] rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-[15deg]"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-color)",
            backdropFilter: "blur(10px)",
          }}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <SunIcon size={20} />
          ) : (
            <MoonIcon size={20} />
          )}
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-[5%] pb-12 w-full">
        <div className="w-full max-w-[1050px] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Side: Premium CRM Presentation & SVG Dashboard Preview */}
        <div 
          className="lg:col-span-6 flex flex-col justify-center space-y-8 pr-0 lg:pr-8"
          style={{ animation: "fadeInUp 0.8s ease-out forwards" }}
        >
          {/* Header section */}
          <div>
            <div className="flex flex-col items-start mb-6 select-none">
              <div className="brand-logo-text select-none">
                CT-CRM
              </div>
              <div className="brand-logo-subtitle select-none">
                Enterprise Platform
              </div>
            </div>
            <h2 className="cause-font text-3xl font-bold leading-tight max-w-md text-[var(--text-color)]">
              Next-Gen AI-Native Sales Engine.
            </h2>
            <p className="text-sm mt-3 max-w-lg leading-relaxed text-muted-foreground">
              Empower your sales operations with a highly performant, glassmorphic pipeline management engine. Track leads, auto-predict conversion velocity, and scale deals effortlessly.
            </p>
          </div>

          <div className="relative w-full max-w-[480px] h-[220px] rounded-2xl overflow-hidden p-6 glass-card border-[var(--card-border)] bg-[rgba(255,255,255,0.45)] dark:bg-[rgba(26,26,26,0.35)] backdrop-blur-md shadow-2xl flex flex-col justify-between">
            {/* Pulsing Grid Lines */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                backgroundImage: "linear-gradient(var(--graph-grid) 1px, transparent 1px), linear-gradient(90deg, var(--graph-grid) 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}
            />
            
            {/* Header of dashboard preview */}
            <div className="flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--graph-to)] animate-pulse" />
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-color)] opacity-85">Live CRM Pipeline</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-1 bg-[var(--card-border)] rounded-full" />
                <div className="w-6 h-1 bg-[var(--graph-to)] rounded-full" />
              </div>
            </div>

            {/* Simulated Animated Graph */}
            <div className="relative h-[80px] w-full flex items-end justify-between px-2 z-10">
              {[40, 65, 35, 80, 50, 95, 75].map((val, idx) => (
                <div 
                  key={idx} 
                  className="w-[8%] rounded-t"
                  style={{
                    height: `${val}%`,
                    background: "linear-gradient(to top, var(--graph-from), var(--graph-to))",
                    animation: `pulse-glow 2s infinite ease-in-out alternate`,
                    animationDelay: `${idx * 0.2}s`
                  }}
                />
              ))}
              {/* Connecting laser path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
                <path 
                  d="M 10 50 Q 80 20, 150 60 T 320 10" 
                  fill="none" 
                  stroke="var(--graph-to)" 
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  className="animate-[dash_8s_linear_infinite]"
                  style={{
                    animation: "dash 8s linear infinite"
                  }}
                />
                <circle cx="320" cy="10" r="4" fill="var(--graph-to)" className="animate-ping" />
              </svg>
            </div>

            {/* Bottom active metrics */}
            <div className="flex justify-between items-center z-10 border-t border-[rgba(115,116,120,0.15)] pt-4">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Conversion Velocity</span>
                <span className="cause-font text-lg font-bold text-[var(--graph-to)]">+42.8%</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Active Leads Stage</span>
                <span className="cause-font text-lg font-bold text-[var(--text-color)]">Stage A-3</span>
              </div>
            </div>
          </div>

          {/* Testimonial slider / quote */}
          <div className="border-l-2 border-[var(--card-border)] pl-4 max-w-lg">
            <p className="text-xs italic text-[var(--text-color)] opacity-85">
              &ldquo;CT-CRM transformed our sales pipeline velocity, boosting quarterly conversions by 42% in under six months.&rdquo;
            </p>
            <span className="block text-[10px] font-semibold mt-2 uppercase tracking-[0.15em] text-[var(--graph-to)]">
              — VP of Sales Operations, TechCorp Enterprise
            </span>
          </div>
        </div>

        {/* Right Side: Form Card Column (Centered in its grid space) */}
        <div 
          className="lg:col-span-6 flex items-center justify-center w-full"
          style={{
            animation: "fadeInUp 0.8s ease-out forwards",
            animationDelay: "0.2s"
          }}
        >
          <div className="glass-card neon-teal-border w-full max-w-[480px]">
            <div className="p-2">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="cause-font text-2xl font-bold mb-2">Welcome Back</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to your enterprise workspace
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "var(--text-color)" }}
                  >
                    Email Address
                  </Label>
                  <div 
                    className="relative"
                    onMouseEnter={() => emailIconRef.current?.startAnimation()}
                    onMouseLeave={() => emailIconRef.current?.stopAnimation()}
                  >
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none w-[18px] h-[18px]">
                      <MailIcon ref={emailIconRef} size={18} />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => emailIconRef.current?.startAnimation()}
                      onBlur={() => emailIconRef.current?.stopAnimation()}
                      disabled={isLoading}
                      className="ct-input h-12 pl-11 rounded-xl text-sm"
                      style={{
                        background: "var(--bg-color)",
                        border: "1px solid var(--card-border)",
                        color: "var(--text-color)",
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: "var(--text-color)" }}
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs font-medium transition-colors hover:underline"
                      style={{ color: "var(--blob-2)" }}
                      onClick={() => toast.info("Password reset coming soon")}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div 
                    className="relative"
                    onMouseEnter={() => passwordIconRef.current?.startAnimation()}
                    onMouseLeave={() => passwordIconRef.current?.stopAnimation()}
                  >
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none w-[18px] h-[18px]">
                      <LockIcon ref={passwordIconRef} size={18} />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => passwordIconRef.current?.startAnimation()}
                      onBlur={() => passwordIconRef.current?.stopAnimation()}
                      disabled={isLoading}
                      className="ct-input h-12 pl-11 pr-11 rounded-xl text-sm"
                      style={{
                        background: "var(--bg-color)",
                        border: "1px solid var(--card-border)",
                        color: "var(--text-color)",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground h-5 w-5"
                    >
                      {showPassword ? (
                        <EyeOffIcon size={18} />
                      ) : (
                        <EyeIcon size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="rounded border-2 border-[var(--text-color)] opacity-70 hover:opacity-100 checked:bg-[var(--text-color)] checked:border-[var(--text-color)] checked:opacity-100 transition-all"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm cursor-pointer text-[var(--text-color)] opacity-80 hover:opacity-100 transition-opacity font-medium"
                  >
                    Keep me signed in
                  </Label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="wm-btn wm-btn-slide w-full h-12 rounded-xl text-sm font-bold tracking-wide uppercase relative overflow-hidden"
                  style={{
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "var(--text-color)", borderTopColor: "transparent" }}
                      />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-[1px]" style={{ background: "var(--card-border)", opacity: 0.3 }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--card-border)" }}>
                  or
                </span>
                <div className="flex-1 h-[1px]" style={{ background: "var(--card-border)", opacity: 0.3 }} />
              </div>

              {/* Social Login Button */}
              <button
                type="button"
                className="wm-btn wm-btn-neu w-full h-12 rounded-xl text-sm font-semibold"
                onClick={handleGoogleLogin}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Sign Up Link */}
              <div className="text-center mt-5">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold transition-colors hover:underline"
                    style={{ color: "var(--graph-to)" }}
                  >
                    Create Account
                  </Link>
                </p>
              </div>

              {/* Footer Badge */}
              <div className="text-center mt-5 pt-3" style={{ borderTop: "1px solid var(--card-border)", opacity: 0.7 }}>
                <p className="text-xs text-muted-foreground">
                  🔒 Enterprise-grade security powered by Clerk
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
