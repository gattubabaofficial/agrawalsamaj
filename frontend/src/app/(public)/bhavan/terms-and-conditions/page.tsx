"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface TermsResponse {
  version_label: string;
  content: string;
  published_at?: string;
}

export default function BhavanTermsPage() {
  const [terms, setTerms] = useState<TermsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/bhavan/terms`);
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch (err) {
      console.error("Failed to load Terms:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
              <ShieldCheck className="h-4 w-4" /> Terms & Conditions
            </div>
            <h1 className="text-3xl font-extrabold text-white">Bhavan Booking Policy</h1>
            {terms?.version_label && (
              <p className="text-xs text-zinc-400 mt-1">Current Version: {terms.version_label}</p>
            )}
          </div>
          <Link
            href="/bhavan/booking"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Booking
          </Link>
        </div>

        {loading ? (
          <div className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-zinc-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {terms?.content}
          </div>
        )}
      </div>
    </div>
  );
}
