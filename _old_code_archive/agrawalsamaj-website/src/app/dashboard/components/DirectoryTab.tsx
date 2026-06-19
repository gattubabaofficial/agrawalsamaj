"use client";

import { Search } from "lucide-react";

interface DirectoryTabProps {
  userRole: "ADMIN" | "MEMBER" | "USER";
  filteredMembers: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchColony: string;
  setSearchColony: (val: string) => void;
  searchArea: string;
  setSearchArea: (val: string) => void;
}

export default function DirectoryTab({
  userRole,
  filteredMembers,
  searchQuery,
  setSearchQuery,
  searchColony,
  setSearchColony,
  searchArea,
  setSearchArea,
}: DirectoryTabProps) {
  return (
    <div className="flex flex-col gap-6 text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Search and connect with approved Samaj family directory details</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-bhagwa text-black font-semibold"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by Colony..."
          value={searchColony}
          onChange={(e) => setSearchColony(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-bhagwa text-black font-semibold"
        />
        <input
          type="text"
          placeholder="Filter by Area..."
          value={searchArea}
          onChange={(e) => setSearchArea(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-bhagwa text-black font-semibold"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredMembers.map((m) => {
          const showPhone = m.show_phone || userRole === "ADMIN";
          const showEmail = m.show_email || userRole === "ADMIN";
          const showAddress = m.show_address || userRole === "ADMIN";

          return (
            <div key={m.samaj_id} className="border border-light-border bg-white rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-lg text-gray-900">{m.first_name} {m.last_name}</h4>
                  <p className="text-xs text-bhagwa font-bold mt-0.5">ID: {m.samaj_id}</p>
                </div>
                {m.profession && (
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    {m.profession}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 text-xs font-semibold text-gray-700 border-t border-gray-50 pt-4">
                <p>Phone: <span className="text-gray-950 font-bold">{showPhone ? m.phone : "•••••••••• (Hidden)"}</span></p>
                <p>Email: <span className="text-gray-950 font-bold">{showEmail ? (m.email || "-") : "•••••••••• (Hidden)"}</span></p>
                <p>Address: <span className="text-gray-950 font-bold">{showAddress && m.address ? `${m.address.address_text || ""}, ${m.address.colony || ""}, ${m.address.area || ""}` : "•••••••••• (Hidden)"}</span></p>
              </div>
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <p className="col-span-2 text-center text-gray-500 font-medium py-10">No matching directory members found.</p>
        )}
      </div>
    </div>
  );
}
