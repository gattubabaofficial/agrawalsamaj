"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, MapPin, Lock, Award, FileUser, User, MessageSquare } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { useRouter } from "next/navigation";

interface SamajUser {
  user_id: string;
  samaj_id: string | null;
  first_name: string;
  surname: string;
  profession: string | null;
  profile_photo: string | null;
  family_relation: string | null;
  family_name: string | null;
  family_code: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  role: string;
  is_member: boolean;
}

export default function UserUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<SamajUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/membership/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.surname}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Users Directory</h1>
          <p className="text-sm text-zinc-500 mt-1">Explore all registered accounts and users of the portal.</p>
        </div>
        <div className="px-4 py-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl border border-amber-200">
          Total Users: {filteredUsers.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search users by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No users found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredUsers.map((u) => {
              const initials = `${u.first_name.charAt(0)}${u.surname.charAt(0)}`.toUpperCase();
              return (
                <div key={u.user_id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {u.profile_photo ? (
                        <img 
                          src={u.profile_photo} 
                          alt={`${u.first_name} ${u.surname}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-zinc-200"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border ${
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          u.is_member ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-zinc-900 text-base">{u.first_name} {u.surname}</h4>
                        {u.samaj_id ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <Award className="w-3.5 h-3.5" /> {u.samaj_id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            <User className="w-3 h-3 text-zinc-400" /> Guest / Non-Member
                          </span>
                        )}
                        {u.profession && <p className="text-xs text-zinc-500 mt-1 italic">{u.profession}</p>}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-3 space-y-2.5 text-sm">
                      {u.family_name && (
                        <div className="flex items-center gap-2 text-zinc-600">
                          <FileUser className="w-4 h-4 text-zinc-400" />
                          <span>{u.family_name} ({u.family_relation || 'Member'})</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-zinc-500 bg-zinc-50 p-2 rounded-xl border border-zinc-200/50">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-zinc-400" />
                          <span>Email</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-500 bg-zinc-50 p-2 rounded-xl border border-zinc-200/50">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-zinc-400" />
                          <span>Phone</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-500 bg-zinc-50 p-2 rounded-xl border border-zinc-200/50">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-zinc-400" />
                          <span>Address</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/dashboard/chat?userId=${u.user_id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </button>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      u.is_member ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
