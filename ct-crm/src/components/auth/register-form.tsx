"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { useTheme } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, SunIcon, MoonIcon, UserIcon } from "@animateicons/react/lucide";

export function RegisterForm() {
  const firstNameIconRef = useRef<any>(null);
  const lastNameIconRef = useRef<any>(null);
  const emailIconRef = useRef<any>(null);
  const passwordIconRef = useRef<any>(null);
  const confirmPasswordIconRef = useRef<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isLoaded, signUp, setActive } = useSignUp();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Password strength calculator
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const getStrengthLabel = () => {
    if (password.length === 0) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "#ef4444"; // Red
    if (passwordStrength === 2) return "#f97316"; // Orange
    if (passwordStrength === 3) return "#eab308"; // Amber
    return "#10b981"; // Emerald Green
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Account created!");
        router.push("/dashboard");
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
        toast.success("Check your email for a verification code.", {
          duration: 5000,
        });
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Account verified!");
        router.push("/dashboard");
      } else {
        toast.error("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[520px]">
          <div className="glass-card neon-teal-border animate-pulse" style={{ minHeight: "750px" }}>
            <div className="space-y-6 p-2">
              <div className="flex justify-center mb-8">
                <div className="skeleton-pulse h-12 w-48 rounded-lg" />
              </div>
              <div className="skeleton-pulse h-8 w-48 rounded-lg mx-auto" />
              <div className="skeleton-pulse h-4 w-64 rounded-lg mx-auto" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="space-y-2">
                  <div className="skeleton-pulse h-4 w-20 rounded" />
                  <div className="skeleton-pulse h-12 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton-pulse h-4 w-20 rounded" />
                  <div className="skeleton-pulse h-12 w-full rounded-xl" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="skeleton-pulse h-4 w-24 rounded" />
                <div className="skeleton-pulse h-12 w-full rounded-xl" />
                <div className="skeleton-pulse h-4 w-20 rounded" />
                <div className="skeleton-pulse h-12 w-full rounded-xl" />
                <div className="skeleton-pulse h-4 w-28 rounded" />
                <div className="skeleton-pulse h-12 w-full rounded-xl" />
              </div>
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
          {/* Left Side: Premium CRM Presentation & SVG Dashboard Preview (Identical structure to Login for perfect consistency) */}
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
                Scale Your Sales Velocity Instantly.
              </h2>
              <p className="text-sm mt-3 max-w-lg leading-relaxed text-muted-foreground">
                Get started with the industry's most flexible lead generation and pipeline acceleration database. Tailor custom field schemas, automate task allocations, and close deals faster.
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
                &ldquo;The fastest onboarding we've ever experienced. We went from configuration to closing our first enterprise lead in 24 hours.&rdquo;
              </p>
              <span className="block text-[10px] font-semibold mt-2 uppercase tracking-[0.15em] text-[var(--graph-to)]">
                — Chief Operating Officer, InnovateLabs Group
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
            <div className="glass-card neon-teal-border w-full max-w-[520px]">
              <div className="p-2">
                {pendingVerification ? (
                  <>
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h1 className="cause-font text-2xl font-bold mb-2">Verify Your Email</h1>
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to {email}
                      </p>
                    </div>

                    {/* Verification Form */}
                    <form onSubmit={handleVerify} className="space-y-5">
                      <div className="space-y-2">
                        <Label
                          htmlFor="verificationCode"
                          className="text-sm font-semibold tracking-wide"
                          style={{ color: "var(--text-color)" }}
                        >
                          Verification Code
                        </Label>
                        <Input
                          id="verificationCode"
                          type="text"
                          inputMode="numeric"
                          placeholder="123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={isLoading}
                          className="ct-input h-12 rounded-xl text-sm text-center tracking-[0.5em]"
                          style={{
                            background: "var(--bg-color)",
                            border: "1px solid var(--card-border)",
                            color: "var(--text-color)",
                          }}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="wm-btn-storm w-full h-12 rounded-xl text-sm font-bold tracking-wide"
                        style={{
                          opacity: isLoading ? 0.7 : 1,
                          borderRadius: "12px",
                        }}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-3">
                            <div
                              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: "#f0f8fe", borderTopColor: "transparent" }}
                            />
                            <span>Verifying...</span>
                          </div>
                        ) : (
                          <span>Verify Email ⚡</span>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="cause-font text-2xl font-bold mb-2">Create Account</h1>
                  <p className="text-sm text-muted-foreground">
                    Start managing your sales pipeline
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-5">
                  {/* First & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className="text-sm font-semibold tracking-wide"
                        style={{ color: "var(--text-color)" }}
                      >
                        First Name
                      </Label>
                      <div 
                        className="relative"
                        onMouseEnter={() => firstNameIconRef.current?.startAnimation()}
                        onMouseLeave={() => firstNameIconRef.current?.stopAnimation()}
                      >
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none w-4 h-4">
                          <UserIcon ref={firstNameIconRef} size={16} />
                        </div>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onFocus={() => firstNameIconRef.current?.startAnimation()}
                          onBlur={() => firstNameIconRef.current?.stopAnimation()}
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
                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className="text-sm font-semibold tracking-wide"
                        style={{ color: "var(--text-color)" }}
                      >
                        Last Name
                      </Label>
                      <div 
                        className="relative"
                        onMouseEnter={() => lastNameIconRef.current?.startAnimation()}
                        onMouseLeave={() => lastNameIconRef.current?.stopAnimation()}
                      >
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none w-4 h-4">
                          <UserIcon ref={lastNameIconRef} size={16} />
                        </div>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onFocus={() => lastNameIconRef.current?.startAnimation()}
                          onBlur={() => lastNameIconRef.current?.stopAnimation()}
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
                  </div>

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
                    <Label
                      htmlFor="password"
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: "var(--text-color)" }}
                    >
                      Password
                    </Label>
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
                        placeholder="Min. 8 characters"
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

                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="space-y-1.5" style={{ animation: "fadeIn 0.3s ease-out" }}>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                background:
                                  passwordStrength >= level
                                    ? getStrengthColor()
                                    : "var(--card-border)",
                                opacity: passwordStrength >= level ? 1 : 0.2,
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-medium" style={{ color: getStrengthColor() }}>
                          {getStrengthLabel()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: "var(--text-color)" }}
                    >
                      Confirm Password
                    </Label>
                    <div 
                      className="relative"
                      onMouseEnter={() => confirmPasswordIconRef.current?.startAnimation()}
                      onMouseLeave={() => confirmPasswordIconRef.current?.stopAnimation()}
                    >
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground pointer-events-none w-[18px] h-[18px]">
                        <LockIcon ref={confirmPasswordIconRef} size={18} />
                      </div>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => confirmPasswordIconRef.current?.startAnimation()}
                        onBlur={() => confirmPasswordIconRef.current?.stopAnimation()}
                        disabled={isLoading}
                        className="ct-input h-12 pl-11 rounded-xl text-sm"
                        style={{
                          background: "var(--bg-color)",
                          border: `1px solid ${confirmPassword.length > 0 && confirmPassword !== password
                              ? "#ef4444"
                              : "var(--card-border)"
                            }`,
                          color: "var(--text-color)",
                        }}
                        required
                      />
                      {confirmPassword.length > 0 && confirmPassword === password && (
                        <div
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5"
                          style={{ color: "#cee7ff", animation: "fadeIn 0.3s ease-out" }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-xs" style={{ color: "#ef4444", animation: "fadeIn 0.3s ease-out" }}>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="terms"
                      checked={agreeTerms}
                      onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                      className="rounded border-2 border-[var(--text-color)] opacity-70 hover:opacity-100 checked:bg-[var(--text-color)] checked:border-[var(--text-color)] checked:opacity-100 transition-all mt-0.5"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-xs leading-relaxed cursor-pointer text-[var(--text-color)] opacity-80 hover:opacity-100 transition-opacity font-medium"
                    >
                      I agree to the{" "}
                      <span className="font-bold hover:underline" style={{ color: "var(--graph-to)" }}>
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="font-bold hover:underline" style={{ color: "var(--graph-to)" }}>
                        Privacy Policy
                      </span>
                    </Label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="wm-btn-storm w-full h-12 rounded-xl text-sm font-bold tracking-wide"
                    style={{
                      opacity: isLoading ? 0.7 : 1,
                      borderRadius: "12px",
                    }}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: "#f0f8fe", borderTopColor: "transparent" }}
                        />
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      <span>Create Account ⚡</span>
                    )}
                  </button>
                </form>

                {/* Sign In Link */}
                <div className="text-center mt-5">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-semibold transition-colors hover:underline"
                      style={{ color: "var(--graph-to)" }}
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
