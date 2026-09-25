"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, safeFetch, formatErrorMessage } from "@/utils/api";
import { Loader2, Shield, IndianRupee, CheckCircle2, Home, Calendar } from "lucide-react";

interface AdminStats {
  bookings_approved: number;
  booking_cash_amount: number;
  booking_total_amount: number;
  events_approved: number;
  event_cash_amount: number;
  event_total_amount: number;
  total_approvals: number;
  total_cash_generated: number;
  total_amount_generated: number;
}

export default function MyPerformancePage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await safeFetch(`${getApiBaseUrl()}/admin/me/stats`, { headers });
        const data = await res.json();
        if (res.ok) {
          setStats(data);
        } else {
          setError(formatErrorMessage(data?.detail, "Failed to load your performance stats"));
        }
      } catch (e: any) {
        setError(formatErrorMessage(e, "Failed to load your performance stats"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  if (error) return <div className="p-8"><div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div></div>;
  if (!stats) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" /> My Performance
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500">Approvals you have handled and the cash you have collected & verified.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
        <BigStat icon={<CheckCircle2 className="w-5 h-5" />} label="Total Approvals" value={stats.total_approvals} />
        <BigStat icon={<IndianRupee className="w-5 h-5" />} label="Cash Generated" value={inr(stats.total_cash_generated)} accent />
        <div className="sm:col-span-2 lg:col-span-1">
          <BigStat icon={<IndianRupee className="w-5 h-5" />} label="Total Amount Verified" value={inr(stats.total_amount_generated)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2 mb-3 text-sm sm:text-base"><Home className="w-4 h-4 text-amber-600" /> Bhavan Bookings</h2>
          <Row label="Approved" value={stats.bookings_approved} />
          <Row label="Cash collected" value={inr(stats.booking_cash_amount)} />
          <Row label="Total value" value={inr(stats.booking_total_amount)} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2 mb-3 text-sm sm:text-base"><Calendar className="w-4 h-4 text-amber-600" /> Event Bookings</h2>
          <Row label="Approved" value={stats.events_approved} />
          <Row label="Cash collected" value={inr(stats.event_cash_amount)} />
          <Row label="Total value" value={inr(stats.event_total_amount)} />
        </div>
      </div>
    </div>
  );
}

function BigStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200"}`}>
      <div className={`flex items-center gap-2 text-sm ${accent ? "text-amber-700" : "text-zinc-500"}`}>{icon}{label}</div>
      <p className={`text-3xl font-bold mt-2 ${accent ? "text-amber-700" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-zinc-50 last:border-0 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-800">{value}</span>
    </div>
  );
}
