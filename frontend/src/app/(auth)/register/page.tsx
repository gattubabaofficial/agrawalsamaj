"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Mail, Phone, Lock, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function RegisterPage() {
  // Traditional Signup Inputs
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [identifier, setIdentifier] = useState(""); // Email or Mobile
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // UI / Flow States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // OTP Sending States
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null); // For developer convenience in dev mode

  // OAuth Simulation States
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<"google" | "yahoo" | null>(null);
  const [oauthEmail, setOauthEmail] = useState("");
  const [oauthFirstName, setOauthFirstName] = useState("");
  const [oauthSurname, setOauthSurname] = useState("");

  // Countdown timer to redirect to login on success
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      window.location.href = "/login";
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [success, countdown]);

  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email address or mobile number first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDevOtp(null);

    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/register/send-otp`, {
        identifier: identifier.trim(),
      });

      if (response.data.status === "success") {
        setOtpSent(true);
        // Expose generated OTP in response for development convenience
        if (response.data.otp) {
          setDevOtp(response.data.otp);
        }
      }
    } catch (err: any) {
      console.error("OTP send error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        "Failed to send OTP. Please check your connection.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      setError("Please send and verify the OTP code first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/register`, {
        first_name: firstName,
        surname: surname,
        identifier: identifier.trim(),
        password: password,
        otp_code: otpCode,
      });

      if (response.data.status === "success" || response.status === 201) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Register verification error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        "Registration failed. Please double-check details or code.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialClick = (provider: "google" | "yahoo") => {
    setOauthProvider(provider);
    setOauthEmail("");
    setOauthFirstName("");
    setOauthSurname("");
    setError(null);
    setShowOAuthModal(true);
  };

  const handleOAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthProvider) return;

    setIsLoading(true);
    setError(null);

    const mockProviderId = `${oauthProvider}_id_${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/register/oauth`, {
        first_name: oauthFirstName.trim(),
        surname: oauthSurname.trim(),
        email: oauthEmail.trim(),
        provider: oauthProvider,
        provider_id: mockProviderId,
      });

      if (response.data.status === "success" || response.status === 201) {
        setShowOAuthModal(false);
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Social register error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        "Social registration failed. This account may already be registered.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute top-1/10 left-1/10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/10 right-1/10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl z-0" />

      {/* Main card */}
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 shadow-xl relative z-10 transition-all duration-300">
        
        {success ? (
          /* SUCCESS SCREEN */
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Registration Successful!</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Welcome to the Agrawal Samaj community portal. Your account is ready.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-450 dark:text-zinc-400">
                Redirecting to login page in <span className="font-semibold text-amber-500">{countdown}</span> seconds...
              </p>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-md shadow-amber-500/25 hover:shadow-orange-600/30 transition-all hover:scale-[1.01]"
              >
                Go to Login Immediately
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <>
            <div className="text-center space-y-2">
              <Link href="/" className="inline-block text-2xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent">
                Agrawal Samaj
              </Link>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Create your account</h2>
              <p className="text-xs text-zinc-500">Register through email or mobile number with instant OTP validation.</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 flex gap-2.5 items-start text-xs text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                <span className="leading-normal">{error}</span>
              </div>
            )}

            {/* Dev OTP Box */}
            {devOtp && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 flex gap-2.5 items-center text-xs text-amber-700 dark:text-amber-400">
                <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" />
                <span><strong>Developer Mode Info:</strong> Use OTP code: <span className="font-mono font-bold tracking-widest text-sm bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">{devOtp}</span></span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-sm">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">First Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Rahul"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Surname</label>
                  <input
                    type="text"
                    required
                    placeholder="Garg"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Email or Mobile Field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Email Address or Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      disabled={otpSent}
                      placeholder="rahul@example.com or 9876543210"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || !identifier.trim()}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors border border-zinc-200/20"
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* OTP Code */}
              {otpSent && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Enter OTP Verification Code</label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6-digit verification code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono tracking-widest text-center"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !otpSent}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01] mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Registering...</span>
                  </>
                ) : (
                  "Register Account"
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center text-2xs text-zinc-400">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4">or continue with</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialClick("google")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.422 2.106 15.607 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c7.058 0 11.755-4.965 11.755-11.96 0-.807-.087-1.427-.193-2.023l-11.562-.212z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialClick("yahoo")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="font-extrabold text-purple-650 dark:text-purple-400 italic text-sm">Y!</span>
                Yahoo
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700">
                Sign In here
              </Link>
            </div>
          </>
        )}
      </div>

      {/* SOCIAL OAUTH SIMULATOR MODAL */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white mb-1">
                {oauthProvider === "google" ? (
                  <svg className="w-6 h-6 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.422 2.106 15.607 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c7.058 0 11.755-4.965 11.755-11.96 0-.807-.087-1.427-.193-2.023l-11.562-.212z"/>
                  </svg>
                ) : (
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 italic text-xl">Yahoo!</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">
                Authorize {oauthProvider} registration
              </h3>
              <p className="text-xs text-zinc-500">
                Simulator: Provide mock profile details to register in the portal.
              </p>
            </div>

            <form onSubmit={handleOAuthSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={oauthFirstName}
                    onChange={(e) => setOauthFirstName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Surname</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={oauthSurname}
                    onChange={(e) => setOauthSurname(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@gmail.com"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOAuthModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-750 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  Authorize & Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
