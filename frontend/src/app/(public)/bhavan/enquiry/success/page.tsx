"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Home, FileText } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "BV-2027-01001";

  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
        <CheckCircle2 className="w-12 h-12" />
      </div>

      <h1 className="text-3xl font-extrabold text-white">Enquiry Submitted Successfully!</h1>

      <p className="text-zinc-400 text-sm leading-relaxed">
        Thank you for submitting your Bhavan booking enquiry. Your enquiry has been registered and sent for administrative review.
      </p>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-2">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-500">Reference Number</span>
        <p className="text-3xl font-mono font-extrabold text-amber-400">{ref}</p>
        <p className="text-xs text-zinc-400 pt-2">Please keep this reference code for future communication with the Bhavan administration office.</p>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
        >
          <Home className="w-4 h-4" /> Home Page
        </Link>
        <Link
          href="/bhavan"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-400"
        >
          Explore Bhavan Facilities <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function BhavanSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-16 px-6 flex items-center justify-center">
      <Suspense fallback={<div className="text-zinc-400">Loading confirmation...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
