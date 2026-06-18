"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { LogIn, KeyRound, Smartphone, Mail, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";

  const [mode, setMode] = useState<"MOBILE" | "EMAIL">("MOBILE");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      alert("Please enter a valid Mobile Number.");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_or_phone: phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
      setOtpSent(true);
      alert(`OTP sent! ${data.test_otp ? `(Test OTP: ${data.test_otp})` : ""}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_or_phone: phone, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");
      performLogin(data.access_token, data.user.role);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter both Email and Password.");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid email or password");
      performLogin(data.access_token, data.user.role);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    alert(`Connecting with ${provider} OAuth integration...`);
    // Fallback or skip for now since it's mock
  };

  const performLogin = (token: string, role: string) => {
    setIsSuccess(true);
    localStorage.setItem("token", token);
    localStorage.setItem("userRole", role);
    setTimeout(() => {
      if (redirectPath === "bhavan") {
        router.push("/bhavan");
      } else {
        router.push("/dashboard"); // Redirect to Dashboard on login
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow flex items-center justify-center py-16 px-6 bg-gradient-to-b from-orange-50/30 to-white">
        <div className="w-full max-w-md bg-white border border-light-border rounded-3xl p-8 md:p-10 shadow-xl">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center gap-6 py-6">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-2xl text-gray-900">Login Successful</h3>
                <p className="text-sm text-gray-500 font-semibold mt-1">
                  Loading portal dashboard credentials...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight text-gray-900">Member Portal</h2>
                <p className="text-sm text-muted-text mt-1 font-medium">Access your Agrawal Samaj profile and bookings</p>
              </div>

              {/* Toggle Login Mode Tab */}
              <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("MOBILE");
                    setOtpSent(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    mode === "MOBILE" ? "bg-white text-bhagwa shadow-sm" : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile OTP
                </button>
                <button
                  type="button"
                  onClick={() => setMode("EMAIL")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    mode === "EMAIL" ? "bg-white text-bhagwa shadow-sm" : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email & Password
                </button>
              </div>

              {/* Login Modes Form Rendering */}
              {mode === "MOBILE" ? (
                !otpSent ? (
                  <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+91</span>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-bhagwa/10"
                    >
                      Request Verification OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Enter 6-Digit OTP Code</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold tracking-widest focus:outline-none focus:border-bhagwa text-black"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">We sent an OTP to {phone}. Check your messages.</p>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-bhagwa/10"
                    >
                      Verify & Access Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-bhagwa font-bold hover:underline self-center"
                    >
                      Change Mobile Number
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Password</label>
                      <a href="#" className="text-[10px] text-bhagwa font-bold hover:underline">Forgot?</a>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-bhagwa z-10 cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-bhagwa/10 mt-2"
                  >
                    Login to Account
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-px bg-gray-100 flex-1" />
                <span>Or Connect With</span>
                <span className="h-px bg-gray-100 flex-1" />
              </div>

              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("Google")}
                  className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 py-3 rounded-xl text-xs font-bold transition-all text-black"
                >
                  <LogIn className="w-3.5 h-3.5 text-red-600" />
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("Yahoo")}
                  className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 py-3 rounded-xl text-xs font-bold transition-all text-black"
                >
                  <LogIn className="w-3.5 h-3.5 text-purple-600" />
                  Yahoo Mail
                </button>
              </div>

              {/* Register Callout */}
              <div className="text-center text-xs text-gray-500 font-semibold border-t border-gray-100 pt-6 mt-2">
                New to the community?{" "}
                <a href="/register" className="text-bhagwa hover:underline font-bold">
                  Register a Family Profile
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-black flex flex-col justify-between antialiased">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-bhagwa animate-spin" />
          <p className="font-bold text-muted-text text-sm">Loading login portal...</p>
        </div>
        <Footer />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
