"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Briefcase, Lock, Unlock, Loader2, Save, X } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setFormData(res.data);
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${getApiBaseUrl()}/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-zinc-500">Failed to load profile.</div>;
  }

  const initial = profile.first_name ? profile.first_name.charAt(0).toUpperCase() : "U";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your personal information and privacy settings.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold text-3xl shadow-inner">
            {initial}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-zinc-900">{profile.first_name} {profile.surname}</h2>
            {profile.family_id && (
              <p className="text-zinc-500 font-medium mt-1">Family ID: {profile.family_id}</p>
            )}
            <div className="mt-3 flex gap-2 justify-center sm:justify-start">
              {profile.is_member ? (
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  Registered Member
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                  Guest User
                </span>
              )}
            </div>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors whitespace-nowrap">
              Edit Profile
            </button>
          )}
        </div>

        <div className="p-6 sm:p-10">
          {!isEditing ? (
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-6">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email Address</span>
                    {profile.email_private ? <span title="Private"><Lock className="w-3 h-3 text-rose-500" /></span> : <span title="Public"><Unlock className="w-3 h-3 text-emerald-500" /></span>}
                  </label>
                  <p className="text-zinc-900 font-medium">{profile.email || "Not provided"}</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Mobile Number</span>
                    {profile.mobile_private ? <span title="Private"><Lock className="w-3 h-3 text-rose-500" /></span> : <span title="Public"><Unlock className="w-3 h-3 text-emerald-500" /></span>}
                  </label>
                  <p className="text-zinc-900 font-medium">{profile.mobile || "Not provided"}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Profession
                  </label>
                  <p className="text-zinc-900 font-medium">{profile.profession || "Not provided"}</p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Address</span>
                    {profile.address_private ? <span title="Private"><Lock className="w-3 h-3 text-rose-500" /></span> : <span title="Public"><Unlock className="w-3 h-3 text-emerald-500" /></span>}
                  </label>
                  <p className="text-zinc-900 font-medium">{profile.address || "Not provided"}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900">Edit Personal Information</h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">First Name</label>
                  <input type="text" value={formData.first_name || ""} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Surname</label>
                  <input type="text" value={formData.surname || ""} onChange={(e) => setFormData({...formData, surname: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-zinc-700">Email Address</label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input type="checkbox" checked={formData.email_private} onChange={e => setFormData({...formData, email_private: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 border-zinc-300" />
                      Keep Private
                    </label>
                  </div>
                  <input type="email" value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-zinc-700">Mobile Number</label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input type="checkbox" checked={formData.mobile_private} onChange={e => setFormData({...formData, mobile_private: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 border-zinc-300" />
                      Keep Private
                    </label>
                  </div>
                  <input type="tel" value={formData.mobile || ""} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-zinc-700">Profession</label>
                  <input type="text" value={formData.profession || ""} onChange={(e) => setFormData({...formData, profession: e.target.value})} placeholder="e.g. Software Engineer, Business Owner" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-zinc-700">Address</label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input type="checkbox" checked={formData.address_private} onChange={e => setFormData({...formData, address_private: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 border-zinc-300" />
                      Keep Private
                    </label>
                  </div>
                  <textarea value={formData.address || ""} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:border-amber-500 text-sm" />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl shadow-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
