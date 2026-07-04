"use client";

import { useState, useEffect } from "react";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import PaymentGateway from "@/components/PaymentGateway";

export default function DonatePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [amount, setAmount] = useState("");
  
  // Guest fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMobile, setGuestMobile] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await axios.get(`${getApiBaseUrl()}/donations/categories`);
        if (catRes.data && catRes.data.length > 0) {
          setCategories(catRes.data);
          setSelectedCat(catRes.data[0].category_id);
        }
      } catch (err) {
        console.error("Failed to load categories.");
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          await axios.get(`${getApiBaseUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsLoggedIn(true);
        } catch (err) {
          setIsLoggedIn(false);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!isLoggedIn && (!guestName || !guestMobile || !guestEmail)) {
      alert("Please fill in your name, email, and mobile number.");
      return;
    }
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentGateway(false);
    try {
      if (isLoggedIn) {
        const token = localStorage.getItem("token");
        await axios.post(
          `${getApiBaseUrl()}/donations/`,
          { category_id: selectedCat, amount: parseFloat(amount), message: "Public Website Donation" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${getApiBaseUrl()}/donations/guest`, {
          category_id: selectedCat,
          amount: parseFloat(amount),
          message: "Public Guest Donation",
          guest_name: guestName,
          guest_email: guestEmail,
          guest_mobile: guestMobile
        });
      }
      alert("Thank you! Your donation was successful.");
      setAmount("");
      setGuestName("");
      setGuestEmail("");
      setGuestMobile("");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Donation failed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            Donation & Charity Support
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-500">
            Contribute to Samaj welfare, educational funds, and medical aids. Secure online payment with PDF receipts.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCat(cat.category_id)}
              className={`p-6 text-left rounded-2xl border transition-all duration-200 ${
                selectedCat === cat.category_id
                  ? "border-amber-500 bg-amber-500/5 shadow-sm shadow-amber-500/5 ring-1 ring-amber-500"
                  : "border-zinc-200/50 bg-white hover:bg-zinc-50"
              }`}
            >
              <h3 className={`font-bold ${selectedCat === cat.category_id ? "text-amber-600" : "text-zinc-900"}`}>
                {cat.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {cat.description}
              </p>
            </button>
          ))}
        </div>

        {/* Donation Form */}
        <form onSubmit={handleProceed} className="p-8 rounded-3xl border border-zinc-200/50 bg-white max-w-xl mx-auto space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h3 className="text-lg font-bold text-zinc-900">Online Donation Form</h3>
          </div>

          {!isLoggedIn && (
            <div className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Guest Details</p>
              <div className="space-y-3">
                <input required type="text" placeholder="Full Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input required type="email" placeholder="Email Address" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <input required type="tel" placeholder="Mobile Number" value={guestMobile} onChange={(e) => setGuestMobile(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700">Enter Amount (₹)</label>
              <input
                required
                type="number"
                placeholder="Enter amount, e.g. 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {[500, 1100, 2100, 5100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="px-4 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold"
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01]">
              Proceed to Donate
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

      {showPaymentGateway && (
        <PaymentGateway
          amount={parseFloat(amount)}
          purpose={`Donation - ${categories.find(c => c.category_id === selectedCat)?.name || 'General'}`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}
    </div>
  );
}
