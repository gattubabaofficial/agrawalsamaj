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

export default function BhavanPage() {
  const [facilities, setFacilities] = useState(mockFacilities);

  useEffect(() => {
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
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <Building className="w-4 h-4" /> Agrasen Bhawan, Rajat Path, Mansarovar, Jaipur
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            Official Bhavan Rate List & Facilities
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-zinc-500">
            Effective from 01 January 2020. Book halls, basement, and guest rooms for weddings, social events, and family functions.
          </p>
        </div>

        {/* Official Rules & Guidelines */}
        <div className="bg-white rounded-3xl border border-amber-200/80 p-6 sm:p-8 shadow-sm space-y-6">
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

        {/* Rate List Table */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-zinc-900">Fixed Rate List for Wedding Saava Days</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700 uppercase font-semibold">
                  <th className="p-3 rounded-l-xl">Unit Description</th>
                  <th className="p-3">First Day Rate</th>
                  <th className="p-3">Two Days Rate</th>
                  <th className="p-3">Three Days Rate</th>
                  <th className="p-3 rounded-r-xl">Cleaning Charge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800 font-medium">
                <tr>
                  <td className="p-3 font-semibold text-zinc-900">First Unit (Ground Floor Hall + 5 Rooms)</td>
                  <td className="p-3 text-amber-600 font-bold">₹15,000/-</td>
                  <td className="p-3">₹25,000/-</td>
                  <td className="p-3">₹33,000/-</td>
                  <td className="p-3 text-zinc-500">₹1,000 / day</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-zinc-900">Second Unit (First Floor 11 Rooms + 3 Dormitories)</td>
                  <td className="p-3 text-amber-600 font-bold">₹14,000/-</td>
                  <td className="p-3">₹21,000/-</td>
                  <td className="p-3">₹27,000/-</td>
                  <td className="p-3 text-zinc-500">₹1,000 / day</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-zinc-900">Third Unit (Basement Hall)</td>
                  <td className="p-3 text-amber-600 font-bold">₹4,000/-</td>
                  <td className="p-3">₹8,000/-</td>
                  <td className="p-3">₹12,000/-</td>
                  <td className="p-3 text-zinc-500">₹1,000 / day</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-zinc-900">Individual AC Room (Patient Family Stay)</td>
                  <td className="p-3 text-amber-600 font-bold">₹600 / day</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3 text-zinc-500">Included</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-zinc-900">Individual Non-AC Room</td>
                  <td className="p-3 text-amber-600 font-bold">₹400 / day</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3 text-zinc-500">Included</td>
                </tr>
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
              className="p-8 rounded-3xl border border-zinc-200/50 bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="space-y-6">
                {/* Icon & Title */}
                <div className="space-y-4">
                  <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-600">
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
              <div className="pt-6 border-t border-zinc-100 flex items-center justify-between mt-6">
                <div>
                  <span className="text-3xs text-zinc-400 uppercase tracking-wider font-semibold block">Rent Rate</span>
                  <span className="text-lg font-bold text-zinc-900">₹{fac.price_per_day} <span className="text-xs font-normal text-zinc-500">/ day</span></span>
                </div>
                <Link
                  href={`/bhavan/${fac.room_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Book Facility <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
