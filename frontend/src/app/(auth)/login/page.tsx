"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

function getRoleHomeUrl(data: any) {
  if (!data) return "/dashboard";
  const role = typeof data === "string" ? data : (data.role || "");
  const r = role.toLowerCase();
  if (r === "admin" || r === "super_admin") return "/admin/dashboard";
  if (r === "volunteer") return "/admin/scan";
  if (typeof data === "object" && (data.custom_role_id || (data.custom_role && data.custom_role.permissions?.length > 0))) {
    return "/admin/dashboard";
  }
  return "/dashboard";
}

export default function LoginPage() {
  const [method, setMethod] = useState("password"); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Redirect if already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const { getApiBaseUrl } = await import("@/utils/api");
        const res = await safeFetch(`${getApiBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next");
          window.location.href = next || getRoleHomeUrl(data);
        } else {
          // Token invalid — clear it
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
        }
      } catch {
        // Network error — stay on login page
      }
    };
    checkExistingSession();
  }, []);

  const handleSendOtp = async () => {
    const cleanMobile = mobile.trim();
    if (cleanMobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await safeFetch(`${getApiBaseUrl()}/auth/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanMobile }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setResendCountdown(30); // 30s cooldown
      } else {
        setErrorMsg(data.detail || "Failed to send OTP");
      }
    } catch (error: any) {
      setErrorMsg("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (method === "otp" && !otpSent) {
      handleSendOtp();
      return;
    }

    if (method === "otp" && (!otp || otp.trim().length < 4)) {
      setErrorMsg("Please enter the 6-digit OTP code sent to your WhatsApp.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      let res;
      if (method === "password") {
        const formData = new URLSearchParams();
        formData.append('username', email.trim());
        formData.append('password', password);

        res = await safeFetch(`${getApiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });
      } else {
        res = await safeFetch(`${getApiBaseUrl()}/auth/phone/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: mobile.trim(),
            otp: otp.trim()
          })
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userRole", data.role || "guest");
        if (data.first_name) {
          localStorage.setItem("userName", `${data.first_name} ${data.surname || ""}`);
        }

        const params = new URLSearchParams(window.location.search);
        let redirectUrl = params.get("next");
        if (!redirectUrl) {
          redirectUrl = getRoleHomeUrl(data);
        }
        window.location.href = redirectUrl;
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMsg("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" suppressHydrationWarning>
      {/* Background decoration */}
      <div className="absolute top-1/10 left-1/10 w-90 h-90 bg-amber-500/5 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/10 right-1/10 w-90 h-90 bg-rose-500/5 rounded-full blur-3xl z-0" />

      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-zinc-200/50 bg-white shadow-xl relative z-10" suppressHydrationWarning>
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-2xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent">
            Mansrovar Agrawal Samaj Jaipur
          </Link>
          <h2 className="text-2xl font-bold text-zinc-900">Welcome Back</h2>
          <p className="text-xs text-zinc-500">Sign in to your member account.</p>
        </div>

        {/* Tab Toggle: Password vs OTP */}
        <div className="flex p-1 bg-zinc-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setMethod("password"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              method === "password"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => { setMethod("otp"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              method === "otp"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Mobile &amp; OTP
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 text-sm">
          {method === "password" ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-zinc-700">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700">Mobile no (WhatsApp no)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={mobile.trim().length < 10 || isLoading || resendCountdown > 0}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none transition-colors min-w-[90px] text-center"
                  >
                    {resendCountdown > 0 ? `${resendCountdown}s` : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Enter WhatsApp OTP</label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01] flex justify-center items-center gap-2 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {method === "otp" && !otpSent ? "Send OTP" : (isLoading ? "Signing In..." : "Sign In")}
          </button>
        </form>

        <div className="relative flex py-2 items-center text-2xs text-zinc-400">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-4">or continue with</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google")}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="text-center text-xs text-zinc-500">
          Admin or Coordinator?{" "}
          <Link href="/admin-login" className="font-semibold text-amber-600 hover:text-amber-700 underline">
            Admin Login
          </Link>
        </p>
      </div>
    </div>
  );
}
