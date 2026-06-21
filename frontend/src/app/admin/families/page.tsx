"use client";

import { Users, Search, Component, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<any[]>([]);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/family/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFamilies(res.data);
    } catch (error) {
      console.error("Error fetching families:", error);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Families Directory</h1>
        <p className="text-sm text-zinc-500 mt-1">Browse all registered families in the Agrawal Samaj.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Family Name or Code..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                <th className="px-6 py-4 font-medium">Family Details</th>
                <th className="px-6 py-4 font-medium">Head of Family</th>
                <th className="px-6 py-4 font-medium">Total Members</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {families.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    <Component className="w-8 h-8 mx-auto text-zinc-300 mb-3" />
                    No families registered yet.
                  </td>
                </tr>
              ) : (
                families.map((fam) => (
                  <tr key={fam.family_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-zinc-900">{fam.family_name}</p>
                      <p className="text-xs text-zinc-500 font-mono">Code: {fam.family_code}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                          H
                        </div>
                        <span className="text-zinc-900 font-medium">ID: {fam.head_user_id || "None"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-full">
                        <Users className="w-3.5 h-3.5" /> {fam.member_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1 text-sm">
                        View Members <ArrowRight className="w-4 h-4" />
                      </button>
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
