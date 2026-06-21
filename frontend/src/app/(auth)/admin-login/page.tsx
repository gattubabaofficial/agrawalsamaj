"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${getApiBaseUrl()}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.access_token) {
        if (response.data.role !== "ADMIN") {
          setErrorMsg("Access Denied: You are not an administrator.");
          setIsLoading(false);
          return;
        }

        localStorage.setItem("token", response.data.access_token);
        localStorage.setItem("userRole", response.data.role);
        
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get("next") || "/admin/dashboard";
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
          <h2 className="text-2xl font-bold text-zinc-900">Admin Panel</h2>
          <p className="text-xs text-zinc-500">Sign in to manage the portal.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 text-sm">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01] flex justify-center items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Signing In..." : "Sign In to Admin"}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 pt-2">
          Are you a member?{" "}
          <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700">
            User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
