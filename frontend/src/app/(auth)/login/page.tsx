"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

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
        const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const role = data.role || localStorage.getItem("userRole") || "guest";
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next");
          window.location.href = next || (role === "admin" ? "/admin/dashboard" : "/dashboard");
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

    // Also sync NextAuth session if present
    const syncSession = async () => {
      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        if (session && (session as any).accessToken) {
          const token = (session as any).accessToken;
          const role = (session as any).role || "guest";
          localStorage.setItem("token", token);
          localStorage.setItem("userRole", role);
          const params = new URLSearchParams(window.location.search);
          let redirectUrl = params.get("next");
          if (!redirectUrl) {
            redirectUrl = role === "admin" ? "/admin/dashboard" : "/dashboard";
          }
          window.location.href = redirectUrl;
        }
      } catch (error) {
        console.error("Error syncing NextAuth session:", error);
      }
    };
    syncSession();
  }, []);

  const handleSendOtp = async () => {
    if (mobile.length >= 10) {
      try {
        setIsLoading(true);
        setErrorMsg("");
        await axios.post(`${getApiBaseUrl()}/auth/phone/send-otp`, { phone: mobile });
        setOtpSent(true);
        setResendCountdown(30); // 30s cooldown
      } catch (error: any) {
        setErrorMsg(error.response?.data?.detail || "Failed to send OTP");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      let response;
      if (method === "password") {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        response = await axios.post(`${getApiBaseUrl()}/auth/login`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        response = await axios.post(`${getApiBaseUrl()}/auth/phone/verify-otp`, {
          phone: mobile,
          otp: otp
        });
      }

      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        localStorage.setItem("userRole", response.data.role || "guest");
        // Store name if returned (some backends include it in token response)
        if (response.data.first_name) {
          localStorage.setItem("userName", `${response.data.first_name} ${response.data.surname || ""}`);
        }

        const params = new URLSearchParams(window.location.search);
        let redirectUrl = params.get("next");
        if (!redirectUrl) {
          redirectUrl = response.data.role === "admin" ? "/admin/dashboard" : "/dashboard";
        }
        window.location.href = redirectUrl;
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMsg(error.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/10 left-1/10 w-90 h-90 bg-amber-500/5 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/10 right-1/10 w-90 h-90 bg-rose-500/5 rounded-full blur-3xl z-0" />

      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-zinc-200/50 bg-white shadow-xl relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-2xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent">
            Agrawal Samaj
          </Link>
          <h2 className="text-2xl font-bold text-zinc-900">Sign in to your account</h2>
          <p className="text-xs text-zinc-500">Welcome back! Please enter your details.</p>
        </div>

        {/* Method Tabs */}
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setMethod("password")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              method === "password"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Email & Password
          </button>
          <button
            onClick={() => setMethod("otp")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              method === "otp"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Mobile & OTP
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

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
                  <a href="#" className="text-2xs font-semibold text-amber-600 hover:text-amber-700">Forgot?</a>
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
                <label className="font-semibold text-zinc-700">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={mobile.length < 10 || isLoading || resendCountdown > 0}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none transition-colors min-w-[90px] text-center"
                  >
                    {resendCountdown > 0 ? `${resendCountdown}s` : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Enter OTP</label>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01] flex justify-center items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {method === "otp" && !otpSent ? "Send OTP First" : (isLoading ? "Signing In..." : "Sign In")}
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
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.422 2.106 15.607 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c7.058 0 11.755-4.965 11.755-11.96 0-.807-.087-1.427-.193-2.023l-11.562-.212z"/>
          </svg>
          Google Sign In
        </button>

        <div className="text-center text-xs text-zinc-500 pt-2">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-amber-600 hover:text-amber-700">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
