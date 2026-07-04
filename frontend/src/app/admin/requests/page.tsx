"use client";

import { CheckCircle, XCircle, Search, UserPlus, Home, Users } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function AdminMembershipRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/membership/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/membership/requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to ${action} request.`);
      console.error(`Error ${action}ing request:`, error);
    }
  };

  const filteredRequests = requests.filter((req) =>
    req.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.family_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Membership Applications</h1>
        <p className="text-sm text-zinc-500 mt-1">Review and approve membership and family creation requests.</p>
      </div>

      {/* Summary Badges */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
          {requests.filter(r => r.request_type === "family_creation").length} Family Creation Requests
        </div>
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 font-medium">
          {requests.filter(r => r.request_type === "membership").length} Membership Requests
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or family..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Applicant Details</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <UserPlus className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
                    No pending applications at this time.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-zinc-50 transition-colors">
                    {/* Type badge */}
                    <td className="px-6 py-4">
                      {req.request_type === "family_creation" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                          <Home className="w-3 h-3" />
                          New Family
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="w-3 h-3" />
                          Membership
                        </span>
                      )}
                    </td>

                    {/* Applicant details */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-zinc-900">{req.user.name}</p>
                      {req.request_type === "family_creation" ? (
                        <div className="mt-1 space-y-0.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Family: {req.family_name}
                          </span>
                          {req.member_count > 1 && (
                            <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                              {req.member_count} member{req.member_count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ) : req.family_name ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Joining {req.family_name} as {req.family_relation || "Member"}
                          </span>
                        </div>
                      ) : null}
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <p className="text-zinc-900">{req.user.email || "—"}</p>
                      <p className="text-xs text-zinc-500">{req.user.mobile || "N/A"}</p>
                    </td>

                    {/* Message */}
                    <td className="px-6 py-4">
                      <p className="text-zinc-600 truncate max-w-xs">{req.message || "No message provided"}</p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction(req.request_id, "approve")}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.request_id, "reject")}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
