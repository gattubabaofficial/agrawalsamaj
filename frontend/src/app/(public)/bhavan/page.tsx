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
    name: "Agrasen Maharaja AC Banquet Hall",
    type: "hall",
    capacity: 500,
    price_per_day: 15000,
    amenities: ["Centrally AC", "Stage Lighting", "Audio System", "Kitchen Facility", "Dining Area"],
    description: "Spacious luxury air-conditioned banquet hall suitable for weddings, receptions, and large community functions.",
  },
  {
    room_id: "2",
    name: "Premium Deluxe Guest Room (AC)",
    type: "room",
    capacity: 3,
    price_per_day: 1200,
    amenities: ["Double Bed", "Flat Screen TV", "Attached Bathroom", "Free Wi-Fi", "Geyser"],
    description: "Well-furnished comfortable guest room with clean linens and modular facilities for outstation guests.",
  },
  {
    room_id: "3",
    name: "Community Meeting Hall",
    type: "hall",
    capacity: 80,
    price_per_day: 4000,
    amenities: ["AC", "Projector Screen", "Whiteboard", "PA Sound System", "Seating Chairs"],
    description: "Ideal for committee meetings, business presentations, seminars, and family get-togethers.",
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            Bhavan Booking & Facilities
          </h1>
          <p className="max-w-xl mx-auto text-sm text-zinc-500">
            Book halls, rooms, and catering facilities at subsidized community rates. Actual booking requires login.
          </p>
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
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span>Capacity: {fac.capacity} Persons</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CreditCard className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span>Price: ₹{fac.price_per_day} / Day</span>
                  </div>
                </div>

                {/* Amenities Tags */}
                <div className="space-y-2 pt-4 border-t border-zinc-100">
                  <h4 className="text-2xs uppercase tracking-wider font-semibold text-zinc-400">Amenities</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {fac.amenities?.map((amenity: string) => (
                      <span
                        key={amenity}
                        className="px-2 py-0.5 rounded-lg text-3xs font-medium bg-zinc-50 border border-zinc-100 text-zinc-500"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-8 mt-8 border-t border-zinc-100">
                <Link
                  href={`/login?next=/bhavan`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all hover:scale-[1.01]"
                >
                  Request Booking
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
