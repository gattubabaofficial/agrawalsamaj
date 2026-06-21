"use client";

import { Save, Shield, Bell, CreditCard } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Platform Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure global application settings.</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-zinc-500" />
            <h3 className="font-semibold text-zinc-900">General</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1.5 max-w-md">
              <label className="text-sm font-semibold text-zinc-700">Platform Name</label>
              <input 
                type="text" 
                defaultValue="Agrawal Samaj Portal"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
              />
            </div>
            
            <div className="space-y-1.5 max-w-md">
              <label className="text-sm font-semibold text-zinc-700">Support Email</label>
              <input 
                type="email" 
                defaultValue="support@agrawalsamaj.org"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-zinc-500" />
            <h3 className="font-semibold text-zinc-900">Payment Gateway</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1.5 max-w-md">
              <label className="text-sm font-semibold text-zinc-700">Razorpay Key ID</label>
              <input 
                type="password" 
                defaultValue="rzp_test_1234567890"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
