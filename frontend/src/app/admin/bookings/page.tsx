"use client";

import { CheckCircle, Clock, XCircle, Search } from "lucide-react";

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Bhavan Bookings</h1>
        <p className="text-sm text-zinc-500 mt-1">Review and manage hall and room reservations.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Booking ID or User Name..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white">
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                <th className="px-6 py-4 font-medium">Booking Details</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-zinc-900">Main Hall + 2 Rooms</p>
                  <p className="text-xs text-zinc-500">ID: #BKV-8924</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-900">Ramesh Agrawal</p>
                  <p className="text-xs text-zinc-500">+91 9876543210</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-900">Nov 15 - Nov 17, 2024</p>
                  <p className="text-xs text-zinc-500">2 Days, 2 Nights</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-zinc-900">₹25,000</p>
                  <span className="text-xs text-amber-600 font-medium">Pending Cash</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded transition-colors flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded transition-colors flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
