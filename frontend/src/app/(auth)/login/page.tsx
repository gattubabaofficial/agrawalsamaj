"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [method, setMethod] = useState("password"); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleSendOtp = () => {
    if (mobile.length >= 10) {
      setOtpSent(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Proceed to redirect or mock token set
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get("next") || "/dashboard";
    window.location.href = redirectUrl;
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
                    disabled={mobile.length < 10}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    {otpSent ? "Resend" : "Send OTP"}
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
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01]"
          >
            {method === "otp" && !otpSent ? "Send OTP First" : "Sign In"}
          </button>
        </form>

        <div className="relative flex py-2 items-center text-2xs text-zinc-400">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-4">or continue with</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold transition-colors">
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
