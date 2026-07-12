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
  pdf_url: string | null;
  issued_at: string;
}

const fileBase = () => getApiBaseUrl().replace(/\/api\/v1$/, "");

export default function MyReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/receipts/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setReceipts(res.data);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load your receipts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2 mb-1">
        <ReceiptIcon className="w-6 h-6 text-amber-600" /> My Receipts
      </h1>
      <p className="text-sm text-zinc-500 mb-5">Download receipts for your bookings and event registrations.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
      ) : receipts.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">No receipts yet. They appear once a payment is completed or approved.</p>
      ) : (
        <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.receipt_id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{r.receipt_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.receipt_type === "booking" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{r.receipt_type}</span>
                </div>
                <p className="text-sm text-zinc-800 mt-1">{r.description}</p>
                <p className="text-xs text-zinc-400">{new Date(r.issued_at).toLocaleDateString("en-IN")} · {(r.payment_mode || "").toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-zinc-900">{inr(r.amount)}</p>
                {r.pdf_url && (
                  <a href={`${fileBase()}${r.pdf_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1">
                    <Download className="w-3.5 h-3.5" /> Download PDF
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
