"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarRange, FileText, Building, Heart, Settings, ShieldCheck,
  History, Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, ArrowLeft
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface OverviewData {
  pending_enquiries: number;
  today_enquiries: number;
  approved_enquiries: number;
  available_units: number;
  active_rules: number;
}

export default function AdminBhavanDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" suppressHydrationWarning>
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Portal
        </Link>
        <h1 className="text-3xl font-extrabold text-zinc-900">Bhavan Booking Management</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of enquiries, rule engine profiles, availability calendar, and inventory</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-3">
            <Clock className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded">Pending</span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900">{overview?.pending_enquiries ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Enquiries awaiting review</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-500 mb-3">
            <FileText className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Today</span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900">{overview?.today_enquiries ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">New requests today</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-500 mb-3">
            <CheckCircle className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Approved</span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900">{overview?.approved_enquiries ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Committed bookings</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-purple-500 mb-3">
            <Building className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded">Inventory</span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900">{overview?.available_units ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Active units available</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-500 mb-3">
            <CalendarRange className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-0.5 rounded">Rule Engine</span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900">{overview?.active_rules ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Active rule profiles</p>
        </div>
      </div>

      {/* Module Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <Link href="/admin/bhavan/enquiries" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-amber-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Enquiry Management</h3>
          <p className="text-xs text-zinc-500 mb-4">View, filter, review, approve, or reject online and manual enquiries.</p>
          <span className="text-xs font-bold text-amber-600 inline-flex items-center gap-1">Manage Enquiries <ArrowRight className="w-4 h-4" /></span>
        </Link>

        <Link href="/admin/bhavan/calendar" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CalendarRange className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Availability Calendar</h3>
          <p className="text-xs text-zinc-500 mb-4">View effective daily rules & inspect layer-by-layer priority stack per date.</p>
          <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">Open Calendar <ArrowRight className="w-4 h-4" /></span>
        </Link>

        <Link href="/admin/bhavan/rules" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-rose-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Rules & 1-Click Vouchers</h3>
          <p className="text-xs text-zinc-500 mb-4">Define Wedding Peak and Maintenance rules with direct dates, plus 1-click checkout vouchers.</p>
          <span className="text-xs font-bold text-rose-600 inline-flex items-center gap-1">Configure Rules & Vouchers <ArrowRight className="w-4 h-4" /></span>
        </Link>

        <Link href="/admin/bhavan/accommodation" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-purple-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Accommodation Inventory</h3>
          <p className="text-xs text-zinc-500 mb-4">Manage AC/Non-AC rooms, dormitories, bulk unit creation (101-112), and photos.</p>
          <span className="text-xs font-bold text-purple-600 inline-flex items-center gap-1">Manage Inventory <ArrowRight className="w-4 h-4" /></span>
        </Link>

        <Link href="/admin/bhavan/amenities" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Amenities & Facilities</h3>
          <p className="text-xs text-zinc-500 mb-4">Configure chairs, coolers, mattresses, pricing types, and stock limits.</p>
          <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">Manage Amenities <ArrowRight className="w-4 h-4" /></span>
        </Link>

        <Link href="/admin/bhavan/terms" className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-teal-500 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Terms & Conditions</h3>
          <p className="text-xs text-zinc-500 mb-4">Markdown editor for Bhavan booking terms, version history, and publishing.</p>
          <span className="text-xs font-bold text-teal-600 inline-flex items-center gap-1">Manage Terms <ArrowRight className="w-4 h-4" /></span>
        </Link>

      </div>
    </div>
  );
}
