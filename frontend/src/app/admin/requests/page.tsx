"use client";

import { CheckCircle, XCircle, Search, UserPlus, Home, Users, Edit3, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<"membership" | "profile_updates">("membership");
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [resMem, resProf] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/membership/requests`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${getApiBaseUrl()}/membership/update-profile/requests`, { headers }).catch(() => ({ data: [] }))
      ]);

      setMembershipRequests(resMem.data || []);
      setProfileRequests(resProf.data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMembershipAction = async (id: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/membership/requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to ${action} request.`);
    }
  };

  const handleProfileUpdateAction = async (id: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/membership/update-profile/requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to ${action} profile update.`);
    }
  };

  const filteredMembership = membershipRequests.filter((req) =>
    (req.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.family_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProfileRequests = profileRequests.filter((req) =>
    (req.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.user?.samaj_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Admin Approvals Hub</h1>
        <p className="text-sm text-zinc-500 mt-1">Review, cross-check, and approve member registrations and profile edit requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-6">
        <button
          onClick={() => setActiveTab("membership")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "membership" ? "text-amber-600 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <UserPlus className="w-4 h-4" /> Membership Applications
          {membershipRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 font-bold rounded-full">
              {membershipRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("profile_updates")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "profile_updates" ? "text-amber-600 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Edit3 className="w-4 h-4" /> Profile Edit Requests
          {profileRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 font-bold rounded-full">
              {profileRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={activeTab === "membership" ? "Search by applicant name or family..." : "Search by member name or Samaj ID..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
        />
      </div>

      {/* TAB 1: MEMBERSHIP APPLICATIONS */}
      {activeTab === "membership" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Applicant Details</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Message</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredMembership.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      <UserPlus className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
                      No pending membership applications.
                    </td>
                  </tr>
                ) : (
                  filteredMembership.map((req) => (
                    <tr key={req.request_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        {req.request_type === "family_creation" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            <Home className="w-3 h-3" /> New Family
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Users className="w-3 h-3" /> Membership
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">{req.user?.name}</p>
                        {req.family_name && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                            Family: {req.family_name}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-zinc-900">{req.user?.email || "—"}</p>
                        <p className="text-xs text-zinc-500">{req.user?.mobile || "N/A"}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-zinc-600 truncate max-w-xs">{req.message || "No message provided"}</p>
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleMembershipAction(req.request_id, "approve")}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleMembershipAction(req.request_id, "reject")}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
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
      )}

      {/* TAB 2: PROFILE UPDATE CROSS-CHECK REQUESTS */}
      {activeTab === "profile_updates" && (
        <div className="space-y-4">
          {filteredProfileRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500">
              <Edit3 className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
              No pending profile update requests to review.
            </div>
          ) : (
            filteredProfileRequests.map((req) => {
              const oldD = req.old_details || {};
              const newD = req.new_details || {};

              return (
                <div key={req.request_id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
                  {/* Member Info Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-zinc-900">{req.user?.name}</h3>
                        {req.user?.samaj_id && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            {req.user.samaj_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">Submitted on {new Date(req.created_at).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleProfileUpdateAction(req.request_id, "approve")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve Edits
                      </button>
                      <button
                        onClick={() => handleProfileUpdateAction(req.request_id, "reject")}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Reject Request
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side Cross-Check Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-semibold">
                          <th className="py-2.5 px-4">Field</th>
                          <th className="py-2.5 px-4 text-zinc-600">Old Details (Current)</th>
                          <th className="py-2.5 px-4 text-amber-700">New Requested Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {/* Name */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Full Name</td>
                          <td className="py-2.5 px-4 text-zinc-600">{oldD.first_name} {oldD.surname}</td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            `${oldD.first_name} ${oldD.surname}` !== `${newD.first_name} ${newD.surname}`
                              ? "text-amber-700 bg-amber-50/50"
                              : "text-zinc-800"
                          }`}>
                            {newD.first_name} {newD.surname}
                          </td>
                        </tr>

                        {/* Profession */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Profession / Business</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.profession || "—"} {oldD.profession_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.profession !== newD.profession || oldD.profession_private !== newD.profession_private ? "text-amber-700 bg-amber-50/50" : "text-zinc-800"
                          }`}>
                            {newD.profession || "—"} {newD.profession_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>

                        {/* Native Place */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Native Place / Origin</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.native_place || "—"} {oldD.native_place_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.native_place !== newD.native_place || oldD.native_place_private !== newD.native_place_private ? "text-amber-700 bg-amber-50/50" : "text-zinc-800"
                          }`}>
                            {newD.native_place || "—"} {newD.native_place_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>

                        {/* Bio */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">About Me / Bio</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.bio || "—"} {oldD.bio_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.bio !== newD.bio || oldD.bio_private !== newD.bio_private ? "text-amber-700 bg-amber-50/50" : "text-zinc-800"
                          }`}>
                            {newD.bio || "—"} {newD.bio_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>

                        {/* Phone */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Mobile Number</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.mobile || "—"} {oldD.mobile_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.mobile !== newD.mobile || oldD.mobile_private !== newD.mobile_private
                              ? "text-amber-700 bg-amber-50/50"
                              : "text-zinc-800"
                          }`}>
                            {newD.mobile || "—"} {newD.mobile_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>

                        {/* Email */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Email Address</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.email || "—"} {oldD.email_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.email !== newD.email || oldD.email_private !== newD.email_private
                              ? "text-amber-700 bg-amber-50/50"
                              : "text-zinc-800"
                          }`}>
                            {newD.email || "—"} {newD.email_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>

                        {/* Address */}
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-zinc-700">Address</td>
                          <td className="py-2.5 px-4 text-zinc-600">
                            {oldD.address || "—"} {oldD.address_private ? "(🔒 Private)" : "(Public)"}
                          </td>
                          <td className={`py-2.5 px-4 font-semibold ${
                            oldD.address !== newD.address || oldD.address_private !== newD.address_private
                              ? "text-amber-700 bg-amber-50/50"
                              : "text-zinc-800"
                          }`}>
                            {newD.address || "—"} {newD.address_private ? "🔒 Private" : "👁️ Public"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
