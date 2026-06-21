"use client";

import { Users, Calendar, Home, CreditCard, ArrowUpRight, ArrowDownRight, UserCheck } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Key metrics and statistics for the Agrawal Samaj portal.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">1,245</h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">Total Members</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              8%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">3,490</h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">Total Users (Non-Members)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">3</h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">Active Events</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <Home className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              2%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-zinc-900">14</h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">Bhavan Bookings (This Month)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart / Stats Area */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
            <div>
              <h3 className="font-semibold text-zinc-900">Donation Statistics</h3>
              <p className="text-xs text-zinc-500">Revenue over the last 6 months</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="p-6">
            {/* Visual placeholder for a chart */}
            <div className="h-64 w-full flex items-end justify-between gap-2 px-2">
              {[40, 70, 45, 90, 65, 100].map((height, i) => (
                <div key={i} className="w-full flex flex-col items-center gap-2 group">
                  <div 
                    className="w-full bg-amber-500/20 group-hover:bg-amber-500 rounded-t-lg transition-colors relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{height * 1200}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">Month {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
            <h3 className="font-semibold text-zinc-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-zinc-100 p-6 space-y-4">
            <div className="flex gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-zinc-900">New member registration: <span className="font-medium">Ramesh Agrawal</span></p>
                <p className="text-xs text-zinc-500 mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-zinc-900">Donation received: <span className="font-medium">₹11,000</span></p>
                <p className="text-xs text-zinc-500 mt-1">5 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-zinc-900">Event passes sold out: <span className="font-medium">Diwali Milan Samaroh</span></p>
                <p className="text-xs text-zinc-500 mt-1">1 day ago</p>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-rose-500 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-zinc-900">Bhavan booking cancellation</p>
                <p className="text-xs text-zinc-500 mt-1">2 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
