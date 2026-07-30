"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, ArrowRight, Loader2, CheckCircle, XCircle, CreditCard, Sparkles, Shield, IndianRupee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

interface Category {
  category_id: string;
  name: string;
  description: string;
  is_active: boolean;
}

const PRESET_AMOUNTS = [501, 1100, 2100, 5100, 11000, 21000];

const CATEGORY_ICONS: Record<string, string> = {
  default: "🙏",
  education: "📚",
  medical: "🏥",
  temple: "🛕",
  food: "🍱",
  welfare: "🤝",
  disaster: "🆘",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower.includes(key)) return CATEGORY_ICONS[key];
  }
  return CATEGORY_ICONS.default;
}

export default function DonatePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [amount, setAmount] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMobile, setGuestMobile] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Razorpay script
  const razorpayLoaded = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Load categories
      try {
        const catRes = await axios.get(`${getApiBaseUrl()}/donations/categories`);
        if (catRes.data?.length > 0) {
          setCategories(catRes.data);
          setSelectedCat(catRes.data[0].category_id);
        }
      } catch {
        // ignore
      }

      // Check auth
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await axios.get(`${getApiBaseUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setIsLoggedIn(true);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          setIsLoggedIn(false);
        }
      }
      setIsLoading(false);
    };
    init();

    // Preload Razorpay SDK
    if (!(window as any).Razorpay && !razorpayLoaded.current) {
      razorpayLoaded.current = true;
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Please enter a valid amount."); return; }
    if (amt < 1) { setError("Minimum donation amount is ₹1."); return; }
    if (!isLoggedIn && (!guestName.trim() || !guestMobile.trim() || !guestEmail.trim())) {
      setError("Please fill in your name, email, and mobile number.");
      return;
    }
    setShowPayment(true);
  };

  const submitDonation = async (paymentId: string) => {
    setIsProcessing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const amt = parseFloat(amount);
      const catName = categories.find(c => c.category_id === selectedCat)?.name || "General";

      if (isLoggedIn && token) {
        await axios.post(
          `${getApiBaseUrl()}/donations/`,
          { category_id: selectedCat, amount: amt, message: `Payment ID: ${paymentId}` },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${getApiBaseUrl()}/donations/guest`, {
          category_id: selectedCat,
          amount: amt,
          message: `Payment ID: ${paymentId}`,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_mobile: guestMobile.trim(),
        });
      }

      setShowPayment(false);
      setSuccess(true);
      // Reset form
      setAmount("");
      setGuestName("");
      setGuestEmail("");
      setGuestMobile("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Donation submission failed. Please try again.");
      setShowPayment(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpay = () => {
    if (!(window as any).Razorpay) {
      setError("Razorpay is loading. Please try 'Simulate' option below.");
      return;
    }
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
      amount: Math.round(parseFloat(amount) * 100),
      currency: "INR",
      name: "Agrawal Samaj Mansrovar Jaipur Portal",
      description: `Donation - ${categories.find(c => c.category_id === selectedCat)?.name || "General"}`,
      handler: (response: any) => submitDonation(response.razorpay_payment_id),
      prefill: {
        name: isLoggedIn ? "" : guestName,
        contact: isLoggedIn ? "" : guestMobile,
        email: isLoggedIn ? "" : guestEmail,
      },
      theme: { color: "#f59e0b" },
      modal: { ondismiss: () => {} },
    };
    try {
      new (window as any).Razorpay(options).open();
    } catch {
      setError("Could not open Razorpay. Use 'Simulate Payment' for testing.");
    }
  };

  const handleSimulate = () => {
    const mockId = "pay_mock_" + Math.random().toString(36).substring(2, 10);
    submitDonation(mockId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/20">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-rose-900 via-zinc-900 to-zinc-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-sm font-medium mb-5">
              <Heart className="w-4 h-4 fill-rose-400" /> Donate with Purpose
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Give Back to the Community
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Your donation directly supports Samaj welfare, education, medical aid, and cultural events.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4"
            >
              <CheckCircle className="w-10 h-10 text-emerald-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-emerald-800 text-lg">Thank you for your donation! 🙏</h3>
                <p className="text-emerald-600 text-sm mt-1">Your generous contribution has been recorded successfully.</p>
              </div>
              <button onClick={() => setSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                <XCircle className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Selection */}
        {categories.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Choose a Cause</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <motion.button
                  key={cat.category_id}
                  onClick={() => setSelectedCat(cat.category_id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
                    selectedCat === cat.category_id
                      ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-zinc-200 bg-white hover:border-amber-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getCategoryIcon(cat.name)}</span>
                    <h3 className={`font-bold text-base ${selectedCat === cat.category_id ? "text-amber-600" : "text-zinc-900"}`}>
                      {cat.name}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{cat.description}</p>
                  {selectedCat === cat.category_id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> Selected
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Donation Form */}
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleProceed} className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Donation Form</h3>
                <p className="text-xs text-zinc-500">
                  {categories.find(c => c.category_id === selectedCat)?.name || "Select a category above"}
                </p>
              </div>
            </div>

            {/* Guest fields */}
            {!isLoggedIn && (
              <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Your Details</p>
                <input
                  required
                  type="text"
                  placeholder="Full Name *"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    type="email"
                    placeholder="Email *"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Mobile *"
                    value={guestMobile}
                    onChange={e => setGuestMobile(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Or{" "}
                  <a href="/login" className="text-amber-600 font-semibold hover:underline">login</a>
                  {" "}for a faster experience.
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-zinc-700">Donation Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300"
                />
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      amount === String(preset)
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    ₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:scale-[1.01] disabled:opacity-60"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><Heart className="w-5 h-5 fill-white" /> Proceed to Donate <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Shield className="w-3.5 h-3.5" />
              100% Secure · Your data is protected
            </div>
          </form>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-zinc-200"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white text-center">
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-bold text-lg">Secure Payment</h3>
                <p className="text-amber-100 text-sm mt-1">
                  {categories.find(c => c.category_id === selectedCat)?.name || "Donation"}
                </p>
              </div>

              <div className="p-6 text-center">
                <p className="text-4xl font-bold text-zinc-900 mb-1">
                  ₹{parseFloat(amount).toLocaleString("en-IN")}
                </p>
                <p className="text-zinc-400 text-sm mb-6">Total donation amount</p>

                {isProcessing ? (
                  <div className="py-6">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-medium animate-pulse">Recording your donation...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleRazorpay}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" /> Pay via Razorpay
                    </button>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="flex-1 border-t border-zinc-200" />
                      <span>or for development/testing</span>
                      <div className="flex-1 border-t border-zinc-200" />
                    </div>

                    <button
                      onClick={handleSimulate}
                      className="w-full py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm border border-emerald-200"
                    >
                      <Sparkles className="w-4 h-4" /> Simulate Successful Payment
                    </button>

                    <button
                      onClick={() => setShowPayment(false)}
                      className="w-full py-3 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-medium rounded-2xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
