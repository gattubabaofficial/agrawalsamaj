"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, safeFetch, formatErrorMessage } from "@/utils/api";
import { mediaUrl } from "@/utils/media";
import { Loader2, Download, Receipt as ReceiptIcon } from "lucide-react";

interface Receipt {
  receipt_id: string;
  receipt_number: string;
  receipt_type: string;
  payer_name: string;
  description: string | null;
  amount: number;
  payment_mode: string | null;
  is_offline: boolean;
  issued_by_name: string | null;
  pdf_url: string | null;
  issued_at: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const url = `${getApiBaseUrl()}/receipts${filter ? `?receipt_type=${filter}` : ""}`;
        const res = await safeFetch(url, { headers });
        const data = await res.json();
        if (res.ok) {
          setReceipts(Array.isArray(data) ? data : []);
        } else {
          setError(formatErrorMessage(data?.detail, "Failed to load receipts"));
        }
      } catch (e: any) {
        setError(formatErrorMessage(e, "Failed to load receipts"));
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
          <ReceiptIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" /> Receipts
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500">All booking and event payment receipts (online & offline).</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["", "booking", "event"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`min-h-[40px] text-xs sm:text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${filter === f ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" : "border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50"}`}>
            {f === "" ? "All Receipts" : f === "booking" ? "Bhavan Bookings" : "Events"}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 sm:px-5 py-3.5 font-semibold">Receipt No.</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 font-semibold">Payer</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 font-semibold">Type</th>
                  <th className="text-right px-4 sm:px-5 py-3.5 font-semibold">Amount</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 font-semibold">Mode</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 font-semibold">Approved By</th>
                  <th className="text-right px-4 sm:px-5 py-3.5 font-semibold">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {receipts.map((r) => (
                  <tr key={r.receipt_id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 sm:px-5 py-3.5 font-mono text-xs font-semibold text-zinc-800">{r.receipt_number}</td>
                    <td className="px-4 sm:px-5 py-3.5 font-medium text-zinc-900">{r.payer_name}</td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${r.receipt_type?.toLowerCase() === "booking" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {r.receipt_type}
                      </span>
                      {r.is_offline && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">offline</span>}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-right font-bold text-zinc-900">{inr(r.amount)}</td>
                    <td className="px-4 sm:px-5 py-3.5 uppercase text-xs text-zinc-600">{r.payment_mode || "—"}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-xs text-zinc-500">{r.issued_by_name || "—"}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-right">
                      {r.pdf_url ? (
                        <a href={mediaUrl(r.pdf_url) || r.pdf_url} target="_blank" rel="noopener noreferrer" className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg">
                          <Download className="w-4 h-4" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-zinc-500 py-12">No receipts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
