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
  pdf_url: string | null;
  issued_at: string;
}

export default function MyReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await safeFetch(`${getApiBaseUrl()}/receipts/me`, { headers });
        const data = await res.json();
        if (res.ok) {
          setReceipts(Array.isArray(data) ? data : []);
        } else {
          setError(formatErrorMessage(data?.detail, "Failed to load your receipts"));
        }
      } catch (e: any) {
        setError(formatErrorMessage(e, "Failed to load your receipts"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
          <ReceiptIcon className="w-6 h-6 text-amber-600" /> My Receipts
        </h1>
        <p className="text-sm text-zinc-500">Download receipts for your bookings and event registrations.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : receipts.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">No receipts yet. They appear once a payment is completed or approved.</p>
      ) : (
        <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.receipt_id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-zinc-500 font-bold">{r.receipt_number}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.receipt_type?.toLowerCase() === "booking" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{r.receipt_type}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-800 mt-1">{r.description || "Samaj Payment Receipt"}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{new Date(r.issued_at).toLocaleDateString("en-IN")} · {(r.payment_mode || "").toUpperCase()}</p>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 border-zinc-100 pt-2 sm:pt-0">
                <p className="font-extrabold text-zinc-900 text-base">{inr(r.amount)}</p>
                {r.pdf_url && (
                  <a 
                    href={mediaUrl(r.pdf_url) || r.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-700 rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
