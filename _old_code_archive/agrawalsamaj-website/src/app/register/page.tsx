"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { CheckCircle2, ArrowRight, Eye, EyeOff, Lock, UserCheck, ShieldCheck } from "lucide-react";
import { getApiUrl } from "../../config";

export default function Register() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !password || !confirmPassword) {
      alert("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please verify.");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email || undefined,
          password: password,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // Auto login after registration using password endpoint
      const loginRes = await fetch(getApiUrl("/api/v1/auth/login/password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || phone, password: password }) // This might fail if email is empty and backend expects email login. Wait, backend login requires email. If they only provide phone, we can't login with password!
      });
      
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        // If password login fails (because backend password login only checks email), redirect to login page
        alert("Registration successful! Please login.");
        router.push("/login");
        return;
      }
      
      setIsSuccess(true);
      localStorage.setItem("token", loginData.access_token);
      localStorage.setItem("userRole", loginData.user.role);

      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);

    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow flex items-center justify-center py-16 px-6 bg-gradient-to-b from-orange-50/30 to-white">
        <div className="w-full max-w-md bg-white border border-light-border rounded-3xl p-8 md:p-10 shadow-xl">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-black text-2xl text-gray-900">Account Created!</h3>
                <p className="text-sm text-gray-500 font-semibold max-w-xs leading-relaxed">
                  Your login credentials have been registered. Redirecting to the portal dashboard...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-bhagwa animate-pulse mt-2">
                <span>Loading Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight text-gray-900">Join Agrawal Samaj</h2>
                <p className="text-sm text-muted-text mt-1 font-medium">Quick sign-up to access community services</p>
              </div>

              {/* Notice that remaining details are inside Dashboard */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-bhagwa shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-600 font-semibold leading-relaxed">
                  Start with a simple login setup. You will be able to complete your profile details and register your family inside the dashboard panel.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Agrawal"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                  />
                </div>
              </div>

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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                />
              </div>

              {/* Password field with toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Choose Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                    onClick={() => {
                      console.log("Password visibility toggle clicked! Current showPassword state:", showPassword);
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-bhagwa z-10 cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password field with toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-sm font-semibold focus:outline-none focus:border-bhagwa text-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Confirm Password visibility toggle clicked! Current showConfirmPassword state:", showConfirmPassword);
                      setShowConfirmPassword(!showConfirmPassword);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-bhagwa z-10 cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100/60 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15 mt-2"
              >
                Create Account & Sign In
              </button>

              <div className="text-center text-xs text-gray-500 font-semibold border-t border-gray-100 pt-4 mt-2">
                Already have an account?{" "}
                <a href="/login" className="text-bhagwa hover:underline font-bold">
                  Login here
                </a>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
