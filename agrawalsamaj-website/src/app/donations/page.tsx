"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { HeartHandshake, CheckCircle2, QrCode, FileText, ArrowRight, ShieldCheck } from "lucide-react";

export default function Donations() {
  const [amount, setAmount] = useState(1100);
  const [category, setCategory] = useState("Building Fund");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptNum, setReceiptNum] = useState("");

  const presets = [500, 1100, 2100, 5100, 11000, 21000, 51000];

  const categories = [
    { name: "Building Fund", desc: "Support the expansion and infrastructure upkeep of Agrawal Samaj Bhavan facilities." },
    { name: "Charity & Welfare Fund", desc: "Contribute to medical camps, student scholarships, and food distribution programs." },
    { name: "Event Sponsorship", desc: "Co-sponsor upcoming community festivals, business conclaves, and sports tournaments." },
    { name: "General Donation", desc: "Unrestricted support used for immediate community welfare and emergency response." }
  ];

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Please fill in your Name and Contact Number.");
      return;
    }
    // Generate mock receipt number
    const num = `AS-REC-${Math.floor(100000 + Math.random() * 900000)}`;
    setReceiptNum(num);
    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-orange-50/50 to-white px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              Charitable <span className="text-bhagwa">Donations</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Support welfare initiatives, Bhavan constructions, and community festivals. Secure transactions with instant digital tax-deductible receipts.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 max-w-6xl mx-auto grid lg:grid-cols-12 gap-12">
          {/* Info Card Columns */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="bg-orange-50/50 border border-orange-100/70 rounded-3xl p-8 flex flex-col gap-6">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-orange-100 flex items-center justify-center text-bhagwa">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-2xl text-gray-900">Why Contribute?</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed mt-2">
                  All donations are directed toward projects that improve community assets and offer educational assistance to families in need. Together we can build a strong network.
                </p>
              </div>
              <div className="flex flex-col gap-4 text-sm font-semibold border-t border-orange-200/40 pt-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-bhagwa shrink-0" />
                  <span>Secure 256-bit Encrypted Checkout</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-bhagwa shrink-0" />
                  <span>Immediate PDF Receipt Downloads</span>
                </div>
              </div>
            </div>

            {/* Donation categories detail */}
            <div className="flex flex-col gap-4">
              <h4 className="font-extrabold text-lg uppercase tracking-wider text-muted-text text-xs">Donation Schemes</h4>
              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCategory(c.name)}
                    className={`p-4 border rounded-2xl text-left transition-all ${
                      category === c.name 
                        ? "border-bhagwa bg-orange-50/30 shadow-sm" 
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Columns */}
          <div className="lg:col-span-7 bg-white border border-light-border rounded-3xl p-8 md:p-10 shadow-sm">
            {!isSuccess ? (
              <form onSubmit={handleDonate} className="flex flex-col gap-6">
                <h3 className="font-extrabold text-2xl text-gray-900 mb-2">Contribution Form</h3>

                {/* Amount presets */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Select Preset Amount (INR)</label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setAmount(p)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          amount === p 
                            ? "bg-bhagwa border-bhagwa text-white shadow-md shadow-bhagwa/10" 
                            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Custom Contribution Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₹</span>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3.5 text-lg font-black focus:outline-none focus:border-bhagwa text-black"
                    />
                  </div>
                </div>

                {/* Donor details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Donor Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Agrawal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Contact Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15 mt-2 flex items-center justify-center gap-2"
                >
                  Proceed to Payment Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-6 py-6">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl text-gray-900">Contribution Confirmed</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    Thank you for your generous support of the Agrawal Samaj community.
                  </p>
                </div>

                {/* Detailed Receipt Card */}
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col gap-4 w-full text-left">
                  <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3 text-bhagwa">
                    <FileText className="w-5 h-5" />
                    <span className="font-extrabold text-sm uppercase tracking-wider">Payment Invoice Receipt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-muted-text uppercase tracking-wider">
                    <div>
                      <p className="opacity-75">Receipt Number</p>
                      <p className="font-bold text-gray-900 mt-0.5">{receiptNum}</p>
                    </div>
                    <div>
                      <p className="opacity-75">Fund Scheme</p>
                      <p className="font-bold text-gray-900 mt-0.5">{category}</p>
                    </div>
                    <div>
                      <p className="opacity-75">Contributed By</p>
                      <p className="font-bold text-gray-900 mt-0.5">{name}</p>
                    </div>
                    <div>
                      <p className="opacity-75">Amount Paid</p>
                      <p className="font-bold text-bhagwa text-sm mt-0.5">₹{amount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="flex-1 border border-light-border hover:bg-gray-50 text-gray-700 py-3.5 rounded-xl text-sm font-bold"
                  >
                    Contribute More
                  </button>
                  <button
                    onClick={() => {
                      alert("PDF Invoice download successfully started.");
                    }}
                    className="flex-1 bg-black text-white hover:bg-gray-800 py-3.5 rounded-xl text-sm font-bold"
                  >
                    Download Invoice Receipt
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
