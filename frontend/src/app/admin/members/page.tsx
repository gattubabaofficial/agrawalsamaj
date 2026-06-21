"use client";

import { Users, Search, MoreVertical, Edit, Trash2 } from "lucide-react";

export default function AdminMembersPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Members Directory</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage registered members and users.</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
          Add New Member
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search members by name, email or phone..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white">
              <option>All Types</option>
              <option>Registered Member</option>
              <option>Non-Member</option>
            </select>
            <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      RA
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">Ramesh Agrawal</p>
                      <p className="text-xs text-zinc-500">Fam ID: FAM-102</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-900">ramesh@example.com</p>
                  <p className="text-xs text-zinc-500">+91 98765 43210</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">Member</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Active</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                  <button className="p-1.5 text-zinc-400 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      SA
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">Suresh Agrawal</p>
                      <p className="text-xs text-zinc-500">No Family ID</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-900">suresh@example.com</p>
                  <p className="text-xs text-zinc-500">+91 87654 32109</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full">Non-Member</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Active</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                  <button className="p-1.5 text-zinc-400 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
