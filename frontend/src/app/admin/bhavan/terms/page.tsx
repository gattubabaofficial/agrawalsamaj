"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, Plus, CheckCircle, Eye, ArrowLeft } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface TermsVersion {
  id: string;
  version_label: string;
  content: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export default function AdminTermsPage() {
  const [versions, setVersions] = useState<TermsVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const [versionLabel, setVersionLabel] = useState("v1.1");
  const [content, setContent] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/terms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVersions(await res.json());
      }
    } catch (err) {
      console.error("Fetch terms error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/terms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          version_label: versionLabel,
          content,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setContent("");
        fetchTerms();
      }
    } catch (err) {
      console.error("Create terms error:", err);
    }
  };

  const handlePublishVersion = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/terms/${id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTerms();
      }
    } catch (err) {
      console.error("Publish terms error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Terms & Conditions Versioning</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Edit, preview, maintain, and publish Bhavan booking policy versions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="min-h-[44px] w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Version
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200">Loading terms history...</div>
      ) : (
        <div className="space-y-4">
          {versions.map((v) => (
            <div key={v.id} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-extrabold text-amber-600">{v.version_label}</span>
                  {v.is_published ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" /> Published
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-lg border border-zinc-200">
                      Draft / Historical
                    </span>
                  )}
                </div>
                {!v.is_published && (
                  <button
                    onClick={() => handlePublishVersion(v.id)}
                    className="min-h-[38px] px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-xs hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    Publish This Version
                  </button>
                )}
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 whitespace-pre-line max-h-48 overflow-y-auto font-mono">
                {v.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs sm:text-sm font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>

        <button
          onClick={() => setShowModal(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Version
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">Create New Terms Version</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Version Label</label>
              <input type="text" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="v1.1" className="w-full min-h-[44px] px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Content (Markdown / Text)</label>
              <textarea
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter Terms & Conditions content..."
                className="w-full p-3.5 border rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="min-h-[44px] px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-semibold hover:bg-zinc-50 w-full sm:w-auto">Cancel</button>
              <button onClick={handleCreateVersion} className="min-h-[44px] px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-amber-400 transition-colors shadow-sm w-full sm:w-auto">Save Version</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
