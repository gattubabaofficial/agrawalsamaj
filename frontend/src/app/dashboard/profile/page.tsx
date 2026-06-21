"use client";

import { User, Mail, Phone, MapPin, Briefcase } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your personal information and privacy settings.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold text-3xl shadow-inner">
            U
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-zinc-900">Your Profile</h2>
            <p className="text-zinc-500 font-medium mt-1">Family ID: FAM-8921</p>
            <span className="inline-block mt-3 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
              Registered Member
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <p className="text-zinc-900 font-medium">user@gmail.com</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Mobile Number
              </label>
              <p className="text-zinc-900 font-medium">+91 98765 43210</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" /> Profession
              </label>
              <p className="text-zinc-900 font-medium">Software Engineer</p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Address
              </label>
              <p className="text-zinc-900 font-medium">123, Patrakar Colony, Jaipur, Rajasthan</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-200">
            <button className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
