"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building, Calendar, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface AccommodationType {
  id: string;
  name: string;
  kind: string;
  description: string;
  capacity_per_unit: number;
  base_price_per_night: number;
  images: { id: string; path: string }[];
}

interface Amenity {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: string;
}

export default function BhavanLandingPage() {
  const [types, setTypes] = useState<AccommodationType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [contactPhone, setContactPhone] = useState<string>("");
  const [introText, setIntroText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/bhavan/config`);
      if (res.ok) {
        const data = await res.json();
        setTypes(data.accommodation_types || []);
        setAmenities(data.amenities || []);
        setContactPhone(data.contact_phone || "");
        setIntroText(data.intro_text || "");
      }
    } catch (err) {
      console.error("Failed to load Bhavan config:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-20 px-6 sm:px-12 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-6">
            <Sparkles className="h-4 w-4" /> Agrawal Samaj Bhavan · Jaipur
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            Premier Accommodation & Facility Booking
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {introText || "Book pristine AC rooms, non-AC rooms, dormitories, and event amenities for your weddings, social gatherings, and community events."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/bhavan/booking"
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
            >
              Start Booking Enquiry <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/bhavan/terms-and-conditions"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-6 py-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400" /> View Terms & Conditions
            </Link>
          </div>
        </div>
      </section>

      {/* Accommodation Cards */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Accommodation Types</h2>
          <p className="text-zinc-400">Explore comfortable rooms and spacious dormitories</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {types.map((type) => (
              <div
                key={type.id}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div>
                  <div className="h-40 rounded-xl bg-zinc-900 border border-zinc-800 mb-5 overflow-hidden flex items-center justify-center">
                    {type.images && type.images.length > 0 ? (
                      <img src={type.images[0].path} alt={type.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Building className="h-12 w-12 text-zinc-700" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md">
                    {type.kind}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-3 mb-2">{type.name}</h3>
                  <p className="text-xs text-zinc-400 mb-4">{type.description || `Capacity: ${type.capacity_per_unit} guest(s) per unit`}</p>
                </div>

                <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Starting from</span>
                    <p className="text-lg font-bold text-amber-400">₹{type.base_price_per_night} <span className="text-xs font-normal text-zinc-400">/ night</span></p>
                  </div>
                  <Link
                    href="/bhavan/booking"
                    className="p-2.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-amber-500 hover:text-white transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Amenities Grid */}
      <section className="py-16 px-6 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Additional Facilities & Amenities</h2>
            <p className="text-zinc-400">Chairs, coolers, tables, mattresses, and event services</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {amenities.map((amenity) => (
              <div key={amenity.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <CheckCircle2 className="h-5 w-5 text-amber-400 mb-2" />
                <h4 className="font-semibold text-white text-sm mb-1">{amenity.name}</h4>
                <p className="text-xs text-amber-400 font-medium">₹{amenity.price} <span className="text-[10px] text-zinc-500">({amenity.pricing_type.replace("_", " ")})</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & CTA Banner */}
      <section className="py-16 px-6 text-center max-w-4xl mx-auto">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Have Questions or Prefer Direct Contact?</h2>
          <p className="text-zinc-400 mb-6">Our office staff is available to assist you with special event inquiries and walk-in requests.</p>
          {contactPhone && (
            <p className="text-amber-400 font-bold text-lg mb-8 inline-flex items-center gap-2">
              <Phone className="h-5 w-5" /> {contactPhone}
            </p>
          )}
          <div>
            <Link
              href="/bhavan/booking"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all"
            >
              Check Availability & Submit Enquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
