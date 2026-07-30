"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building, Users, CreditCard, Sparkles, Map, Info, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

const mockFacilities = [
  {
    room_id: "1",
    name: "First Unit (Ground Floor Hall & 5 Rooms)",
    type: "hall",
    capacity: 600,
    price_per_day: 15000,
    two_days_rate: 25000,
    three_days_rate: 33000,
    amenities: ["Ground Floor Hall", "5 Attached Rooms", "Outer Hall", "1 Commercial Kitchen"],
    description: "Includes the main ground-floor hall, 5 guest rooms, outer hall, and dedicated commercial kitchen for grand wedding ceremonies and events.",
  },
  {
    room_id: "2",
    name: "Second Unit (First Floor Rooms & Dormitories)",
    type: "room",
    capacity: 200,
    price_per_day: 14000,
    two_days_rate: 21000,
    three_days_rate: 27000,
    amenities: ["11 First-Floor Rooms", "3 Large Dormitory Halls", "1 Kitchen"],
    description: "Includes 11 furnished guest rooms on the 1st floor, 3 spacious dormitory halls, and 1 kitchen. Ideal for large family stay during functions.",
  },
  {
    room_id: "3",
    name: "Third Unit (Basement Hall & Kitchen)",
    type: "hall",
    capacity: 150,
    price_per_day: 4000,
    two_days_rate: 8000,
    three_days_rate: 12000,
    amenities: ["Basement Hall", "1 Kitchen", "Air Ventilation"],
    description: "Includes spacious basement hall and 1 kitchen. Perfect for dining arrangements, exhibitions, or small gatherings.",
  },
  {
    room_id: "4",
    name: "Individual AC Guest Room",
    type: "room",
    capacity: 3,
    price_per_day: 600,
    amenities: ["Air Conditioned", "Double Bed", "Attached Bathroom", "Geyser"],
    description: "Comfortable AC guest room. Intended primarily for outstation family members and hospital visitor stays.",
  },
  {
    room_id: "5",
    name: "Individual Non-AC Guest Room",
    type: "room",
    capacity: 4,
    price_per_day: 400,
    amenities: ["Ceiling Fan", "Double Bed", "Attached Bathroom"],
    description: "Economical non-AC room for outstation family members and visitors.",
  }
];

const DEFAULT_RATE_LISTS: Record<string, any[]> = {
  saava: [
    { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹15,000/-", day2: "₹25,000/-", day3: "₹33,000/-", cleaning: "₹1,000 / day" },
    { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹14,000/-", day2: "₹21,000/-", day3: "₹27,000/-", cleaning: "₹1,000 / day" },
    { unit: "Third Unit (Basement Hall)", day1: "₹4,000/-", day2: "₹8,000/-", day3: "₹12,000/-", cleaning: "₹1,000 / day" },
    { unit: "Individual AC Room (Patient Family Stay)", day1: "₹600 / day", day2: "-", day3: "-", cleaning: "Included" },
    { unit: "Individual Non-AC Room", day1: "₹400 / day", day2: "-", day3: "-", cleaning: "Included" },
  ],
  other_days: [
    { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹12,000/-", day2: "₹20,000/-", day3: "₹28,000/-", cleaning: "₹1,000 / day" },
    { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹11,000/-", day2: "₹18,000/-", day3: "₹24,000/-", cleaning: "₹1,000 / day" },
    { unit: "Third Unit (Basement Hall)", day1: "₹3,500/-", day2: "₹7,000/-", day3: "₹10,000/-", cleaning: "₹1,000 / day" },
    { unit: "Individual AC Room (Patient Family Stay)", day1: "₹550 / day", day2: "-", day3: "-", cleaning: "Included" },
    { unit: "Individual Non-AC Room", day1: "₹350 / day", day2: "-", day3: "-", cleaning: "Included" },
  ],
  social: [
    { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "₹8,000/-", day2: "₹14,000/-", day3: "₹20,000/-", cleaning: "₹800 / day" },
    { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "₹7,000/-", day2: "₹12,000/-", day3: "₹16,000/-", cleaning: "₹800 / day" },
    { unit: "Third Unit (Basement Hall)", day1: "₹2,500/-", day2: "₹4,500/-", day3: "₹6,500/-", cleaning: "₹500 / day" },
    { unit: "Individual AC Room (Patient Family Stay)", day1: "₹450 / day", day2: "-", day3: "-", cleaning: "Included" },
    { unit: "Individual Non-AC Room", day1: "₹300 / day", day2: "-", day3: "-", cleaning: "Included" },
  ],
  free: [
    { unit: "First Unit (Ground Floor Hall + 5 Rooms)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
    { unit: "Second Unit (First Floor 11 Rooms + 3 Dormitories)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
    { unit: "Third Unit (Basement Hall)", day1: "FREE (₹0)", day2: "FREE (₹0)", day3: "FREE (₹0)", cleaning: "Included" },
    { unit: "Individual AC Room (Patient Family Stay)", day1: "FREE (₹0)", day2: "-", day3: "-", cleaning: "Included" },
    { unit: "Individual Non-AC Room", day1: "FREE (₹0)", day2: "-", day3: "-", cleaning: "Included" },
  ],
};

export default function BhavanPage() {
  const [facilities, setFacilities] = useState(mockFacilities);
  const [rateCategory, setRateCategory] = useState<"saava" | "other_days" | "social" | "free">("saava");
  const [customRateLists, setCustomRateLists] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Load custom rates if edited by admin
    const storedRates = localStorage.getItem("bhavan_custom_rates");
    if (storedRates) {
      try {
        setCustomRateLists(JSON.parse(storedRates));
      } catch (e) {
        console.error(e);
      }
    }

    const fetchFacilities = async () => {
      try {
        const response = await axios.get(`${getApiBaseUrl()}/bookings/rooms`);
        if (response.data && response.data.length > 0) {
          setFacilities(response.data);
        }
      } catch (err) {
        console.log("Could not fetch facilities from server, using fallback data.");
      }
    };
    fetchFacilities();
  }, []);

  return (
    <div className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen overflow-hidden">
      <div className="absolute inset-0 animated-gradient-mesh opacity-20 -z-10" />
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-amber-800 text-xs font-bold uppercase tracking-wider shadow-md">
            <Building className="w-4 h-4" /> Agrasen Bhawan, Rajat Path, Mansarovar, Jaipur
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gradient-vivid">
            Official Bhavan Rate List & Facilities
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-zinc-600">
            Effective from 01 January 2020. Book halls, basement, and guest rooms for weddings, social events, and family functions.
          </p>
        </div>

        {/* Official Rules & Guidelines */}
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-600" /> Agrasen Bhawan Booking Guidelines
            </h2>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
              Effective 01 January 2020
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block text-sm">Pure Vegetarian Only</span>
              <p className="text-zinc-600">Strictly no non-vegetarian food, eggs, alcohol, smoking, or gambling allowed on premises.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block text-sm">Check-in / Check-out</span>
              <p className="text-zinc-600">Check-in: 12:00 PM | Check-out: 11:00 AM (Next Day). Music cutoff at 10:00 PM.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block text-sm">Cleaning Charge</span>
              <p className="text-zinc-600">Mandatory cleaning fee of ₹1,000 per unit per day applies to all facility bookings.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block text-sm">Electricity Fee</span>
              <p className="text-zinc-600">Electricity charged at ₹15 per kWh based on meter reading settled at the venue.</p>
            </div>
          </div>
        </div>

        {/* Rate List Table with Category Filter Tabs */}
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">
                {rateCategory === "saava" && "Fixed Rate List for Wedding Saava Days (सावा दिवस)"}
                {rateCategory === "other_days" && "Rate List for Other Days (अन्य सामान्य दिवस)"}
                {rateCategory === "social" && "Rate List for Social Functions (सामाजिक कार्यक्रम)"}
                {rateCategory === "free" && "Free & Welfare Charitable Usage (निःशुल्क सेवा कार्य)"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {rateCategory === "saava" && "Applicable during peak wedding saava dates."}
                {rateCategory === "other_days" && "Standard rates applicable on regular non-saava booking days."}
                {rateCategory === "social" && "Special discounted rates for birthday, engagement, pooja, & samaj meetings."}
                {rateCategory === "free" && "Complimentary venue usage for medical camps & charitable welfare."}
              </p>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-100/80 rounded-2xl border border-zinc-200/60">
              <button
                type="button"
                onClick={() => setRateCategory("saava")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rateCategory === "saava"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                }`}
              >
                💍 Wedding Saava Days
              </button>
              <button
                type="button"
                onClick={() => setRateCategory("other_days")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rateCategory === "other_days"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                }`}
              >
                🗓️ Other Days
              </button>
              <button
                type="button"
                onClick={() => setRateCategory("social")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rateCategory === "social"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                }`}
              >
                👥 Social Functions
              </button>
              <button
                type="button"
                onClick={() => setRateCategory("free")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rateCategory === "free"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                }`}
              >
                🎁 Free / Welfare Use
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-rose-500 text-white uppercase font-semibold">
                  <th className="p-3.5 rounded-l-xl">Unit Description</th>
                  <th className="p-3.5">First Day Rate</th>
                  <th className="p-3.5">Two Days Rate</th>
                  <th className="p-3.5">Three Days Rate</th>
                  <th className="p-3.5 rounded-r-xl">Cleaning Charge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800 font-medium">
                {(customRateLists[rateCategory] || DEFAULT_RATE_LISTS[rateCategory]).map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3.5 font-semibold text-zinc-900">{item.unit}</td>
                    <td className="p-3.5 text-amber-600 font-bold">{item.day1}</td>
                    <td className="p-3.5">{item.day2}</td>
                    <td className="p-3.5">{item.day3}</td>
                    <td className="p-3.5 text-zinc-500">{item.cleaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {facilities.map((fac, idx) => (
            <motion.div
              key={fac.room_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative p-8 rounded-[2rem] glass-panel flex flex-col justify-between shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 transition-shadow duration-300 group overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 opacity-10 blur-2xl group-hover:opacity-25 transition-opacity duration-300" />
              <div className="space-y-6 relative">
                {/* Icon & Title */}
                <div className="space-y-4">
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xs uppercase tracking-wider font-semibold text-zinc-400">
                      {fac.type}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-900 group-hover:text-amber-500 transition-colors">
                      {fac.name}
                    </h3>
                  </div>
                </div>

                {/* Info List */}
                <div className="space-y-2.5 text-sm text-zinc-500">
                  <p className="text-xs leading-relaxed line-clamp-3">{fac.description}</p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>Capacity: {fac.capacity || "N/A"} Persons</span>
                  </div>
                  {(fac as any).deposit && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Security Deposit: ₹{(fac as any).deposit} (Refundable)</span>
                    </div>
                  )}
                </div>

                {/* Amenities Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {fac.amenities && (Array.isArray(fac.amenities) ? fac.amenities : Object.keys(fac.amenities)).slice(0, 4).map((item: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-3xs font-medium rounded-lg">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price & Action */}
              <div className="relative pt-6 border-t border-white/60 flex items-center justify-between mt-6">
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider font-semibold block">Rent Rate</span>
                  <span className="text-lg font-bold text-zinc-900">₹{fac.price_per_day} <span className="text-xs font-normal text-zinc-500">/ day</span></span>
                </div>
                <Link
                  href={`/bhavan/${fac.room_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-amber-500/40 active:scale-95"
                >
                  Book Facility <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
