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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Terms & Conditions Versioning</h1>
          <p className="text-xs text-zinc-500">Edit, preview, maintain, and publish Bhavan booking policy versions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400"
        >
          <Plus className="w-4 h-4" /> Create New Version
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">Loading terms history...</div>
      ) : (
        <div className="space-y-4">
          {versions.map((v) => (
            <div key={v.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-extrabold text-amber-600">{v.version_label}</span>
                  {v.is_published ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded inline-flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Published
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded">
                      Draft / Historical
                    </span>
                  )}
                </div>
                {!v.is_published && (
                  <button
                    onClick={() => handlePublishVersion(v.id)}
                    className="px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-xs hover:bg-emerald-400"
                  >
                    Publish This Version
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 whitespace-pre-line max-h-48 overflow-y-auto">
                {v.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900">Create New Terms Version</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Version Label</label>
              <input type="text" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="v1.1" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Content (Markdown / Text)</label>
              <textarea
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter Terms & Conditions content..."
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-xs">Cancel</button>
              <button onClick={handleCreateVersion} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs">Save Version</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
