"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, MapPin, ShieldAlert, Award, FileUser, MessageSquare } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { useRouter } from "next/navigation";

interface Member {
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

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/membership/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.first_name} ${m.surname}`.toLowerCase();
    const email = (m.email || "").toLowerCase();
    const phone = (m.mobile || "").toLowerCase();
    const samajId = (m.samaj_id || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query) || phone.includes(query) || samajId.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Members Directory (Admin View)</h1>
          <p className="text-sm text-zinc-500 mt-1">Full view of Samaj members, including contact details and address details.</p>
        </div>
        <div className="px-4 py-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl border border-amber-200">
          Total Members: {filteredMembers.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search members by name, Samaj ID, email or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading member directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No members found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredMembers.map((m) => {
              const initials = `${m.first_name.charAt(0)}${m.surname.charAt(0)}`.toUpperCase();
              return (
                <div key={m.user_id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {m.profile_photo ? (
                        <img 
                          src={m.profile_photo} 
                          alt={`${m.first_name} ${m.surname}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-zinc-900 text-base">{m.first_name} {m.surname}</h4>
                        {m.samaj_id && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            <Award className="w-3.5 h-3.5" /> {m.samaj_id}
                          </span>
                        )}
                        {m.profession && <p className="text-xs text-zinc-500 mt-1 italic">{m.profession}</p>}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-3 space-y-2.5 text-sm">
                      {m.family_name && (
                        <div className="flex items-center gap-2 text-zinc-600">
                          <FileUser className="w-4 h-4 text-zinc-400" />
                          <span>{m.family_name} ({m.family_relation || 'Member'})</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        <span className="break-all">{m.email || 'No email provided'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-600">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        <span>{m.mobile || 'No phone provided'}</span>
                      </div>

                      <div className="flex items-start gap-2 text-zinc-600">
                        <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <span className="line-clamp-2">{m.address || 'No address configured'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/admin/chat?userId=${m.user_id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </button>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Active Member
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
