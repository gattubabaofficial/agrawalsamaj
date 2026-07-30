"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Mail, Phone, Lock, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  // Traditional Signup Inputs
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [identifier, setIdentifier] = useState(""); // Email or Mobile
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");

  // UI / Flow States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // OTP Sending States
  const [otpSent, setOtpSent] = useState(false);
  const [identifierVerified, setIdentifierVerified] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null); // For developer convenience in dev mode
  const [resendCountdown, setResendCountdown] = useState(0);

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

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
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
    if (!identifier.trim()) {
      setError("Please enter your email address or mobile number first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDevOtp(null);

    const isEmail = identifier.includes("@");
    const endpoint = isEmail ? "/auth/email/send-otp" : "/auth/register/send-otp";
    const payload = isEmail ? { email: identifier.trim() } : { identifier: identifier.trim() };

    try {
      const response = await axios.post(`${getApiBaseUrl()}${endpoint}`, payload);

      if (response.data.status === "success") {
        setOtpSent(true);
        setResendCountdown(30); // 30s cooldown
        if (response.data.otp) setDevOtp(response.data.otp);
      }
    } catch (err: any) {
      console.error("OTP send error:", err);
      setError(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const isEmail = identifier.includes("@");
    if (!isEmail) {
      // For mobile, verification happens at final registration in current backend setup
      setIdentifierVerified(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/email/verify-otp`, {
        email: identifier.trim(),
        otp: otpCode,
      });

      if (response.data.status === "success") {
        setVerificationToken(response.data.email_verification_token);
        setIdentifierVerified(true);
        setError(null);
      }
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setError(err.response?.data?.detail || "Invalid OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierVerified) return;

    setIsLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes("@");
      const payload: any = {
        first_name: firstName,
        surname: surname,
        identifier: identifier.trim(),
        password: password,
      };

      if (isEmail) {
        payload.verification_token = verificationToken;
      } else {
        payload.otp_code = otpCode;
      }

      if (familyCode.trim()) {
        payload.family_code = familyCode.trim();
        payload.family_relation = familyRelation || "Member";
      }

      const response = await axios.post(`${getApiBaseUrl()}/auth/register`, payload);

      if (response.data.status === "success" || response.status === 201) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute top-1/10 left-1/10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-1/10 right-1/10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl z-0" />

      {/* Main card */}
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-zinc-200/50 bg-white shadow-xl relative z-10 transition-all duration-300">
        
        {success ? (
          /* SUCCESS SCREEN */
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">Registration Successful!</h2>
              <p className="text-sm text-zinc-500">
                Welcome to the Agrawal Samaj Mansrovar Jaipur community portal. Your account is ready.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-zinc-450">
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
                Agrawal Samaj Mansrovar Jaipur
              </Link>
              <h2 className="text-2xl font-bold text-zinc-900">Create your account</h2>
              <p className="text-xs text-zinc-500">Register through email or mobile number with instant OTP validation.</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/50 flex gap-2.5 items-start text-xs text-rose-700">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                <span className="leading-normal">{error}</span>
              </div>
            )}

            {/* Dev OTP Box */}
            {devOtp && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/50 flex gap-2.5 items-center text-xs text-amber-700">
                <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0 text-amber-500" />
                <span><strong>Developer Mode Info:</strong> Use OTP code: <span className="font-mono font-bold tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-amber-200">{devOtp}</span></span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-sm">
              {/* Step 1: Identifier & OTP */}
              {!identifierVerified ? (
                <>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700">Email Address or Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="rahul@example.com or 9876543210"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:bg-zinc-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading || !identifier.trim() || resendCountdown > 0}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors border border-zinc-200/20 min-w-[90px] text-center"
                      >
                        {resendCountdown > 0 ? `${resendCountdown}s` : otpSent ? "Resend" : "Verify"}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-semibold text-zinc-700">Enter OTP Verification Code</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="6-digit verification code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono tracking-widest text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isLoading || otpCode.length < 6}
                          className="px-4 py-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Step 2: Details */
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">{identifier} verified.</span>
                    </div>
                    <button type="button" onClick={() => { setIdentifierVerified(false); setOtpSent(false); setOtpCode(""); }} className="text-emerald-600 font-semibold hover:underline">Change</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-700">First Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Rahul"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-700">Surname</label>
                      <input
                        type="text"
                        required
                        placeholder="Garg"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-700">Family Code (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. FAM-P4E40W"
                        value={familyCode}
                        onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-700">Relation to Head</label>
                      <select
                        value={familyRelation}
                        onChange={(e) => setFamilyRelation(e.target.value)}
                        required={familyCode.trim().length > 0}
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="">Select Relation...</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700">Create Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-transparent text-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01] mt-4 flex items-center justify-center gap-2"
                  >
                    {isLoading ? "Registering..." : "Complete Registration"}
                  </button>
                </div>
              )}
            </form>

            <div className="relative flex py-2 items-center text-2xs text-zinc-400">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-4">or continue with</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.422 2.106 15.607 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c7.058 0 11.755-4.965 11.755-11.96 0-.807-.087-1.427-.193-2.023l-11.562-.212z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => signIn("yahoo")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="font-extrabold text-purple-650 italic text-sm">Y!</span>
                Yahoo
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700">
                Sign In here
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
