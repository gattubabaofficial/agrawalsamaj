"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
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

// The backend serves PDFs from /static; strip the /api/v1 suffix from the API base.
const fileBase = () => getApiBaseUrl().replace(/\/api\/v1$/, "");

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const url = `${getApiBaseUrl()}/receipts${filter ? `?receipt_type=${filter}` : ""}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        setReceipts(res.data);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load receipts");
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
        <ReceiptIcon className="w-6 h-6 text-amber-600" /> Receipts
      </h1>
      <p className="text-sm text-zinc-500 mb-5">All booking and event payment receipts (online & offline).</p>

      <div className="flex gap-2 mb-4">
        {["", "booking", "event"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg border ${filter === f ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600"}`}>
            {f === "" ? "All" : f === "booking" ? "Bhavan" : "Events"}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Receipt No.</th>
                <th className="text-left px-4 py-3">Payer</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Mode</th>
                <th className="text-left px-4 py-3">Approved By</th>
                <th className="text-right px-4 py-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.receipt_id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-mono text-xs">{r.receipt_number}</td>
                  <td className="px-4 py-3">{r.payer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.receipt_type === "booking" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {r.receipt_type}
                    </span>
                    {r.is_offline && <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">offline</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(r.amount)}</td>
                  <td className="px-4 py-3 uppercase text-xs">{r.payment_mode}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.issued_by_name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {r.pdf_url ? (
                      <a href={`${fileBase()}${r.pdf_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700">
                        <Download className="w-4 h-4" />
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr><td colSpan={7} className="text-center text-zinc-500 py-10">No receipts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
