"use client";

import { Plus } from "lucide-react";

interface FamilyTabProps {
  myFamily: any;
  newFamName: string;
  setNewFamName: (val: string) => void;
  handleRegisterFamily: (e: React.FormEvent) => void;
  newFamSamajId: string;
  setNewFamSamajId: (val: string) => void;
  newFamRelation: string;
  setNewFamRelation: (val: string) => void;
  handleAddFamilyMember: (e: React.FormEvent) => void;
  handleDeleteFamily: () => void;
}

export default function FamilyTab({
  myFamily,
  newFamName,
  setNewFamName,
  handleRegisterFamily,
  newFamSamajId,
  setNewFamSamajId,
  newFamRelation,
  setNewFamRelation,
  handleAddFamilyMember,
  handleDeleteFamily,
}: FamilyTabProps) {
  return (
    <div className="flex flex-col gap-6 text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">
          Manage registered members belonging to Family ID: <strong className="text-bhagwa font-bold">{myFamily?.family_code || "Not Registered"}</strong>
        </p>
      </div>

      {!myFamily ? (
        <div className="border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 bg-gray-50/50">
          <p className="text-sm font-bold text-gray-600">You have not registered a family yet.</p>
          <form onSubmit={handleRegisterFamily} className="flex gap-2">
            <input 
              type="text" 
              required 
              placeholder="Family Name (e.g. The Agrawals)"
              value={newFamName}
              onChange={e => setNewFamName(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-bhagwa text-black bg-white"
            />
            <button type="submit" className="bg-bhagwa text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm">
              Register New Family
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {myFamily.members?.map((relative: any) => (
              <div key={relative.samaj_id} className="border border-light-border bg-white rounded-2xl p-5 text-center flex flex-col justify-center gap-2 relative">
                <p className="text-xs font-black text-muted-text uppercase tracking-wider">{relative.family_relationship || "Member"}</p>
                <h4 className="font-extrabold text-lg text-gray-900">{relative.first_name} {relative.last_name}</h4>
                <p className="text-[10px] text-gray-500 font-semibold">{relative.phone}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddFamilyMember} className="border border-gray-100 rounded-3xl p-6 flex flex-col gap-5 bg-gray-50/30">
            <h3 className="font-extrabold text-base text-gray-900">Add Family Member via Samaj ID</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-text uppercase tracking-wider">Member 16-Digit Samaj ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234567890123456"
                  value={newFamSamajId}
                  onChange={(e) => setNewFamSamajId(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-bhagwa text-black bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-text uppercase tracking-wider">Relationship</label>
                <select
                  value={newFamRelation}
                  onChange={(e) => setNewFamRelation(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-bhagwa text-black bg-white"
                >
                  <option>Son</option>
                  <option>Daughter</option>
                  <option>Spouse</option>
                  <option>Father</option>
                  <option>Mother</option>
                  <option>Sibling</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all self-end flex items-center gap-1.5 shadow-md shadow-bhagwa/10"
            >
              <Plus className="w-4 h-4" /> Link Member to Family
            </button>
          </form>
          
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button onClick={handleDeleteFamily} className="text-red-600 hover:text-red-700 font-bold text-xs">
              Delete Family Registration
            </button>
          </div>
        </>
      )}
    </div>
  );
}
