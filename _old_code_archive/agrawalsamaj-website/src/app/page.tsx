"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  Calendar, 
  Users, 
  Building2, 
  HeartHandshake, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Lock
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      {/* 1. Header Navigation */}
      <Header />

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/50 to-white px-6 py-20 md:py-32 flex flex-col items-center text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          {/* Welcome Tag */}
          <div className="inline-flex items-center gap-2 bg-orange-100/70 border border-orange-200/50 px-4 py-1.5 rounded-full text-xs font-bold text-bhagwa tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Unified Digital Community
          </div>

          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-gray-900">
            Empowering the <span className="text-bhagwa">Agrawal Samaj</span> with Modern Connectivity
          </h2>
          
          <p className="max-w-2xl text-lg text-gray-600 font-medium leading-relaxed">
            A centralized system for digital family directory registration, verified membership mapping, online Bhavan room bookings, and hassle-free event pass payments.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <Link 
              href="/register" 
              className="flex items-center justify-center gap-2 bg-bhagwa hover:bg-bhagwa-hover text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-bhagwa/20 group"
            >
              Register Family Profile
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/bhavan" 
              className="flex items-center justify-center gap-2 border-2 border-black hover:bg-black hover:text-white font-bold px-8 py-4 rounded-xl transition-all"
            >
              <Building2 className="w-5 h-5" />
              Book Bhavan
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Community Stats Section */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-3xl md:text-5xl font-black text-bhagwa">95%</p>
            <p className="text-xs font-bold text-muted-text mt-1 uppercase tracking-wider">Samaj Records Digitized</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-5xl font-black text-bhagwa">100%</p>
            <p className="text-xs font-bold text-muted-text mt-1 uppercase tracking-wider">Dynamic QR Event Passes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-5xl font-black text-bhagwa">0%</p>
            <p className="text-xs font-bold text-muted-text mt-1 uppercase tracking-wider">Gateway Commission Fees</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-5xl font-black text-bhagwa">24/7</p>
            <p className="text-xs font-bold text-muted-text mt-1 uppercase tracking-wider">Online Bhavan Bookings</p>
          </div>
        </div>
      </section>

      {/* 4. Core Features Teaser Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h3 className="text-3xl font-extrabold tracking-tight">Everything You Need In One Portal</h3>
          <p className="text-muted-text font-medium">Bypass manual record books, paper tokens, and double-booking risks with our integrated modules.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1: Directory */}
          <div className="border border-light-border rounded-2xl p-8 hover:shadow-xl hover:border-bhagwa/30 transition-all flex flex-col gap-6 bg-white">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-bhagwa">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Verified Members Directory</h4>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Registered Samaj Members undergo admin verification before appearing in the public catalog. Outside users can interact with services but remain private.
              </p>
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-accent bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                <Lock className="w-3.5 h-3.5" />
                Admin Approved Only
              </span>
            </div>
          </div>

          {/* Card 2: Bhavan */}
          <div className="border border-light-border rounded-2xl p-8 hover:shadow-xl hover:border-bhagwa/30 transition-all flex flex-col gap-6 bg-white">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-bhagwa">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Bhavan Facility Bookings</h4>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Check room, hall, and ground availability in real-time. View floor plans, select suitabilities, and complete payments seamlessly online or confirm cash offline.
              </p>
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bhagwa bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                No Double Bookings
              </span>
            </div>
          </div>

          {/* Card 3: Events */}
          <div className="border border-light-border rounded-2xl p-8 hover:shadow-xl hover:border-bhagwa/30 transition-all flex flex-col gap-6 bg-white">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-bhagwa">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2">Event Passes & QR Validation</h4>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                View upcoming community schedules and program timelines. Secure passes online and receive unique, secure QR tickets scanned for instant check-in.
              </p>
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bhagwa bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dynamic Verification
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Donation CTA Section */}
      <section className="bg-orange-50/50 border-t border-b border-orange-100/50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-red-accent">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight">Support Community Projects & Funds</h3>
          <p className="max-w-2xl text-gray-600 font-medium leading-relaxed">
            Make contributions directly to the Agrawal Samaj Building Fund, Charity Fund, or Event Sponsorships. Safe transactions with dynamic invoicing and instant receipt generation.
          </p>
          <Link 
            href="/donations" 
            className="bg-bhagwa hover:bg-bhagwa-hover text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-bhagwa/15 flex items-center gap-2"
          >
            Contribute Donation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 6. Contact and Address Footer */}
      <Footer />
    </div>
  );
}
