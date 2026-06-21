"use client";

import { Users, Plus, Link as LinkIcon, CheckCircle, ShieldAlert, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function FamilyPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "create" | "join">("overview");
  
  const [isLoading, setIsLoading] = useState(true);
  const [familyData, setFamilyData] = useState<any>(null);
  const [requestsData, setRequestsData] = useState<any[]>([]);

  // Create Form
  const [createName, setCreateName] = useState("");
  
  // Join Form
  const [joinCode, setJoinCode] = useState("");
  const [joinRelation, setJoinRelation] = useState("");

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await axios.get(`${getApiBaseUrl()}/family/me`, { headers });
      setFamilyData(res.data);
      
      if (res.data.is_head) {
        const reqs = await axios.get(`${getApiBaseUrl()}/family/requests`, { headers });
        setRequestsData(reqs.data);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error("Failed to fetch family", error);
      }
      setFamilyData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/family/create?family_name=${encodeURIComponent(createName)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Family created successfully!");
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to create family");
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/family/join?family_code=${encodeURIComponent(joinCode)}&relation=${encodeURIComponent(joinRelation)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Join request sent to the family head!");
      setJoinCode("");
      setJoinRelation("");
      setActiveTab("overview");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to send join request");
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/family/requests/${requestId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Request ${action}d successfully`);
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to process request");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Family Management</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your family profile and registered members.</p>
      </div>

      {!familyData ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "overview" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
              >
                Getting Started
              </button>
              <button 
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "create" ? "bg-white text-amber-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-amber-600 hover:bg-amber-50"}`}
              >
                Create Family
              </button>
              <button 
                onClick={() => setActiveTab("join")}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "join" ? "bg-white text-amber-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-amber-600 hover:bg-amber-50"}`}
              >
                Join Family
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {activeTab === "overview" && (
              <div className="text-center max-w-2xl mx-auto py-8">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-6">
                  <Users className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-3">You are not in a Family</h2>
                <p className="text-zinc-600 mb-8">
                  Registered Samaj members can create a new family group or join an existing one. Once joined, you can manage event passes and bookings together.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => setActiveTab("create")} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-colors">
                    Create New Family
                  </button>
                  <button onClick={() => setActiveTab("join")} className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
                    Join Existing Family
                  </button>
                </div>
              </div>
            )}

            {activeTab === "create" && (
              <form className="max-w-xl mx-auto space-y-6" onSubmit={handleCreateFamily}>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-zinc-900">Create a New Family</h2>
                  <p className="text-sm text-zinc-500 mt-1">You will be designated as the Head of the Family.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Family Name</label>
                  <input type="text" required value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Ramesh Agrawal Parivar" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" />
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <p>Upon creation, a unique Family Code will be generated. Share this code with your family members so they can request to join.</p>
                </div>
                <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-colors">
                  Create Family
                </button>
              </form>
            )}

            {activeTab === "join" && (
              <form className="max-w-xl mx-auto space-y-6" onSubmit={handleJoinFamily}>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-zinc-900">Join an Existing Family</h2>
                  <p className="text-sm text-zinc-500 mt-1">Enter the unique Family Code provided by your family head.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Family Code</label>
                  <input type="text" required value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. FAM-1A2B3C" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm font-mono uppercase" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Your Relation to Head</label>
                  <select required value={joinRelation} onChange={e => setJoinRelation(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm bg-white">
                    <option value="">Select Relation...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
                  Send Join Request
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{familyData.family_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  Code: {familyData.family_code}
                </span>
                <span className="text-sm text-zinc-500 font-medium">{familyData.members.length} Members</span>
              </div>
            </div>
            {familyData.is_head && (
              <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Share Code
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900">Family Members</h3>
            </div>
            <div className="divide-y divide-zinc-100">
              {familyData.members.map((member: any) => (
                <div key={member.user_id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm uppercase">
                      {member.name.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-900">{member.name}</h4>
                      <p className="text-xs text-zinc-500">Samaj ID: {member.samaj_id || "N/A"}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${member.is_head ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                    {member.relation}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {familyData.is_head && requestsData.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900">Pending Join Requests</h3>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">{requestsData.length} New</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {requestsData.map(req => (
                  <div key={req.request_id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm uppercase">
                        {req.user.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-900">{req.user.name}</h4>
                        <p className="text-xs text-zinc-500">Relation Requested: {req.relation}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequestAction(req.request_id, "approve")} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleRequestAction(req.request_id, "reject")} className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
