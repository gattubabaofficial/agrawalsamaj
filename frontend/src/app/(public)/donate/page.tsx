"use client";

import { useState, useEffect } from "react";
import { Heart, Landmark, ShieldAlert, Award, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

const mockCategories = [
  {
    category_id: "1",
    name: "Education Support Fund",
    description: "Providing scholarships, books, uniforms, and digital devices to deserving students of the Samaj.",
  },
  {
    category_id: "2",
    name: "Medical Welfare & Healthcare",
    description: "Financing surgeries, health checkup camps, ambulance services, and medicines for families in need.",
  },
  {
    category_id: "3",
    name: "Bhavan Maintenance & Expansion",
    description: "Supporting structural upgrades, temple renovations, and facility expansions of Agrawal Bhavans.",
  }
];

export default function DonatePage() {
  const [categories, setCategories] = useState(mockCategories);
  const [selectedCat, setSelectedCat] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${getApiBaseUrl()}/donation-categories`);
        if (response.data && response.data.length > 0) {
          setCategories(response.data);
          setSelectedCat(response.data[0].category_id);
        } else {
          setSelectedCat(mockCategories[0].category_id);
        }
      } catch (err) {
        console.log("Could not fetch donation categories, using fallback.");
        setSelectedCat(mockCategories[0].category_id);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-900/20 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            Donation & Charity Support
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-500 dark:text-zinc-400">
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
                  : "border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <h3 className={`font-bold ${selectedCat === cat.category_id ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-white"}`}>
                {cat.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                {cat.description}
              </p>
            </button>
          ))}
        </div>

        {/* Donation Form */}
        <div className="p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 max-w-xl mx-auto space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Online Donation Form</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Enter Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter amount, e.g. 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {[500, 1100, 2100, 5100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold"
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                window.location.href = `/login?next=/donate&amount=${amount}&category=${selectedCat}`;
              }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01]"
            >
              Proceed to Donate
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
