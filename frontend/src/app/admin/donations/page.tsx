"use client";

import { useEffect, useState } from "react";
import { Heart, Search, Loader2, FileText, CheckCircle } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

const formatDateTime12Hour = (dateTimeStr: string) => {
  if (!dateTimeStr) return "";
  const date = new Date(dateTimeStr);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/donations/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDonations(res.data);
    } catch (error) {
      console.error("Failed to fetch all donations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

  const filteredDonations = donations.filter((d) => {
    const q = searchQuery.toLowerCase();
    const name = d.user_id ? d.user_name : d.guest_name;
    const email = d.user_id ? d.user_email : d.guest_email;
    return (name?.toLowerCase() || "").includes(q) || (email?.toLowerCase() || "").includes(q);
  });

  const handleExportCSV = () => {
    const headers = ["Donor Name", "Donor Type", "Email", "Mobile", "Category", "Amount", "Status", "Date", "Message"];
    const rows = filteredDonations.map(d => {
      const type = d.user_id ? "Member" : "Guest";
      const name = d.user_id ? d.user_name : d.guest_name;
      const email = d.user_id ? d.user_email : d.guest_email;
      const mobile = d.user_id ? d.user_mobile : d.guest_mobile;
      return [
        `"${name || ''}"`,
        type,
        `"${email || ''}"`,
        `"${mobile || ''}"`,
        `"${d.category_name || ''}"`,
        d.amount,
        d.payment_status,
        `"${formatDateTime12Hour(d.donated_at)}"`,
        `"${d.message || ''}"`
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Donation Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Review all logged-in and guest contributions.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <Heart className="w-5 h-5 text-emerald-500 fill-emerald-500" />
          <div className="text-sm font-semibold text-emerald-800">
            Total Raised: <span className="text-lg">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Donor Name or Email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                <th className="px-6 py-4 font-medium">Donor Details</th>
                <th className="px-6 py-4 font-medium">Category / Note</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No donations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.donation_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      {d.user_id ? (
                        <>
                          <div className="font-semibold text-zinc-900 flex items-center gap-2">
                            {d.user_name}
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-2xs font-bold rounded uppercase">Member</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">{d.user_mobile || "No Mobile"}</div>
                          <div className="text-xs text-zinc-500">{d.user_email || "No Email"}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-zinc-900 flex items-center gap-2">
                            {d.guest_name}
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-2xs font-bold rounded uppercase">Guest</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">{d.guest_mobile}</div>
                          <div className="text-xs text-zinc-500">{d.guest_email}</div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-900 font-medium">{d.category_name}</div>
                      {d.message && <div className="text-xs text-zinc-500 mt-1 italic">"{d.message}"</div>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-emerald-600">₹{d.amount.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                        d.payment_status === 'paid' || d.payment_status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {d.payment_status === 'paid' || d.payment_status === 'completed' ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                        {d.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {formatDateTime12Hour(d.donated_at)}
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
