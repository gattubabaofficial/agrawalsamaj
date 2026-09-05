"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Shield, ArrowLeft } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";

interface AuditLogRow {
  log_id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id?: string;
  old_value?: any;
  new_value?: any;
  timestamp: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/bhavan/audit-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Bhavan Audit Log Trail</h1>
        <p className="text-xs text-zinc-500">Full auditable log of administrative mutations, status changes, and rule overrides</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">Loading audit trail...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">No audit log entries recorded yet.</div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase border-b border-zinc-200">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Table</th>
                <th className="p-4">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.log_id} className="hover:bg-zinc-50/50">
                  <td className="p-4 font-mono text-[11px] text-zinc-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-zinc-500">{log.target_table}</td>
                  <td className="p-4 font-mono text-[11px] text-zinc-600 max-w-xs truncate">
                    {log.new_value ? JSON.stringify(log.new_value) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-4 border-t border-zinc-200 flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>
      </div>
    </div>
  );
}
