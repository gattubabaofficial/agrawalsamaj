"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserCircle2, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  UserPlus2, 
  Lock, 
  Unlock, 
  EyeOff, 
  Eye, 
  Search, 
  Send,
  Plus
} from "lucide-react";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  familyId: string;
  phone: string;
  email: string;
  colony: string;
  area: string;
  profession: string;
  isPrivate: { phone: boolean; email: boolean; address: boolean };
  status: "APPROVED" | "PENDING";
  role: "MEMBER" | "USER" | "ADMIN";
}

interface Booking {
  id: number;
  facility: string;
  userName: string;
  date: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  payment: "ONLINE" | "CASH";
}

interface ChatMessage {
  id: number;
  channel: string;
  sender: string;
  role: string;
  content: string;
  time: string;
}

export default function Dashboard() {
  const router = useRouter();
  
  // States
  const [userRole, setUserRole] = useState<"ADMIN" | "MEMBER" | "USER">("MEMBER");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "DIRECTORY" | "FAMILY" | "BOOKINGS" | "CHAT" | "PROFILE" | "APPROVALS">("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchColony, setSearchColony] = useState("");
  const [searchArea, setSearchArea] = useState("");

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
    const role = localStorage.getItem("userRole") as "ADMIN" | "MEMBER" | "USER";
    if (role) {
      setUserRole(role);
    }
  }, []);

  // Mock Members Directory state
  const [members, setMembers] = useState<Member[]>([
    {
      id: 1,
      firstName: "Ramesh",
      lastName: "Agrawal",
      familyId: "FAM100204",
      phone: "+91 98765 43210",
      email: "ramesh@example.com",
      colony: "Khushi Vihar",
      area: "Patrakar Road",
      profession: "Business",
      isPrivate: { phone: false, email: false, address: false },
      status: "APPROVED",
      role: "MEMBER"
    },
    {
      id: 2,
      firstName: "Suresh",
      lastName: "Agrawal",
      familyId: "FAM100204",
      phone: "+91 91234 56789",
      email: "suresh@example.com",
      colony: "Khushi Vihar",
      area: "Patrakar Road",
      profession: "Corporate Service",
      isPrivate: { phone: true, email: true, address: false },
      status: "APPROVED",
      role: "MEMBER"
    },
    {
      id: 3,
      firstName: "Dinesh",
      lastName: "Mittal",
      familyId: "FAM200908",
      phone: "+91 93456 78901",
      email: "dinesh@mittals.org",
      colony: "Mansarovar Sector 5",
      area: "Mansarovar",
      profession: "Chartered Accountant",
      isPrivate: { phone: false, email: true, address: true },
      status: "APPROVED",
      role: "MEMBER"
    },
    {
      id: 4,
      firstName: "Amit",
      lastName: "Gupta",
      familyId: "FAM300405",
      phone: "+91 94567 89012",
      email: "amit@guptacorp.com",
      colony: "Vikas Colony",
      area: "Sanganer",
      profession: "Retail Business",
      isPrivate: { phone: true, email: false, address: true },
      status: "PENDING",
      role: "USER"
    },
    {
      id: 5,
      firstName: "Karan",
      lastName: "Garg",
      familyId: "FAM400102",
      phone: "+91 95678 90123",
      email: "karan@gargindustries.in",
      colony: "Khushi Vihar",
      area: "Patrakar Road",
      profession: "Student",
      isPrivate: { phone: false, email: false, address: false },
      status: "PENDING",
      role: "USER"
    }
  ]);

  // Mock Bookings state
  const [bookings, setBookings] = useState<Booking[]>([
    { id: 1, facility: "Maharaja Agrasen Suite (AC) - Room 101", userName: "Ramesh Agrawal", date: "2026-06-25", status: "CONFIRMED", payment: "ONLINE" },
    { id: 2, facility: "Banquet Hall", userName: "Suresh Agrawal", date: "2026-07-02", status: "PENDING", payment: "CASH" },
    { id: 3, facility: "Seminar Room", userName: "Dinesh Mittal", date: "2026-06-30", status: "PENDING", payment: "ONLINE" }
  ]);

  // Mock Family Member list
  const [myFamily, setMyFamily] = useState([
    { id: 1, name: "Sita Agrawal", relation: "Spouse", age: 48, phone: "+91 98765 43211" },
    { id: 2, name: "Rahul Agrawal", relation: "Son", age: 24, phone: "+91 98765 43212" }
  ]);

  // New family inputs
  const [newFamName, setNewFamName] = useState("");
  const [newFamRelation, setNewFamRelation] = useState("Son");
  const [newFamAge, setNewFamAge] = useState("");
  const [newFamPhone, setNewFamPhone] = useState("");

  // Chat Room state
  const [selectedChannel, setSelectedChannel] = useState("General Member Group");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, channel: "General Member Group", sender: "Ramesh Agrawal", role: "MEMBER", content: "Pranam all members. We are planning a tree plantation drive at Bhavan grounds this Sunday.", time: "10:30 AM" },
    { id: 2, channel: "General Member Group", sender: "Suresh Agrawal", role: "MEMBER", content: "Great initiative. I will join with my family.", time: "10:45 AM" },
    { id: 3, channel: "Khushi Vihar Group", sender: "Karan Garg", role: "USER", content: "Hello neighbors. Is the colony sanitation cleanup scheduled for this month?", time: "09:15 AM" },
    { id: 4, channel: "Patrakar Road Group", sender: "Ramesh Agrawal", role: "MEMBER", content: "Yes Karan, the ward representative confirmed it is scheduled for next Saturday.", time: "09:30 AM" },
    { id: 5, channel: "Private Chat (Admin)", sender: "Admin", role: "ADMIN", content: "Hello. Your Bhavan suite booking has been approved. Payment received.", time: "Yesterday" }
  ]);
  const [newMsg, setNewMsg] = useState("");

  // Privacy states
  const [myPrivacy, setMyPrivacy] = useState({ phone: false, email: true, address: false });

  // Handle Approvals
  const handleApproveMember = (id: number) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: "APPROVED", role: "MEMBER" } : m));
    alert("User successfully approved as Samaj Member.");
  };

  const handleApproveBooking = (id: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "CONFIRMED" } : b));
    alert("Booking successfully confirmed.");
  };

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamName || !newFamAge) return;
    setMyFamily(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newFamName,
        relation: newFamRelation,
        age: Number(newFamAge),
        phone: newFamPhone || "N/A"
      }
    ]);
    setNewFamName("");
    setNewFamAge("");
    setNewFamPhone("");
    alert("Family member successfully added under Family ID FAM100204.");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        channel: selectedChannel,
        sender: userRole === "ADMIN" ? "Admin" : "Ramesh Agrawal",
        role: userRole,
        content: newMsg,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      }
    ]);
    setNewMsg("");
  };

  // Filter members directory
  const filteredMembers = members.filter(m => {
    if (m.status !== "APPROVED") return false;
    const matchesName = `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColony = searchColony === "" || m.colony.toLowerCase().includes(searchColony.toLowerCase());
    const matchesArea = searchArea === "" || m.area.toLowerCase().includes(searchArea.toLowerCase());
    return matchesName && matchesColony && matchesArea;
  });

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-8">
        
        {/* Left Side Tab Navigation Panel */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {/* Quick profile info */}
          <div className="bg-orange-50/50 border border-orange-100/70 rounded-3xl p-5 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bhagwa text-white font-black text-xl flex items-center justify-center">
              RA
            </div>
            <div>
              <p className="font-extrabold text-sm text-gray-900">Ramesh Agrawal</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-bhagwa uppercase tracking-wider">{userRole} Profile</span>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 font-bold text-sm">
            <button
              onClick={() => setActiveTab("OVERVIEW")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "OVERVIEW" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Portal Overview
            </button>

            <button
              onClick={() => setActiveTab("DIRECTORY")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "DIRECTORY" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Users className="w-4 h-4" />
              Members Directory
            </button>

            <button
              onClick={() => setActiveTab("FAMILY")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "FAMILY" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <UserPlus2 className="w-4 h-4" />
              Family Registration
            </button>

            <button
              onClick={() => setActiveTab("BOOKINGS")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "BOOKINGS" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Bhavan Bookings
            </button>

            <button
              onClick={() => setActiveTab("CHAT")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "CHAT" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Community Chat
            </button>

            <button
              onClick={() => setActiveTab("PROFILE")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === "PROFILE" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <UserCircle2 className="w-4 h-4" />
              My Profile Settings
            </button>

            {userRole === "ADMIN" && (
              <button
                onClick={() => setActiveTab("APPROVALS")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  activeTab === "APPROVALS" ? "bg-red-600 text-white shadow-md shadow-red-600/10" : "text-red-600 hover:bg-red-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Lock className="w-4 h-4" />
                  Admin Approvals
                </span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black">
                  {members.filter(m => m.status === "PENDING").length + bookings.filter(b => b.status === "PENDING").length}
                </span>
              </button>
            )}
          </nav>

          {/* Quick action button to toggle Admin/Member view simulation */}
          <button
            onClick={() => {
              const nextRole = userRole === "ADMIN" ? "MEMBER" : "ADMIN";
              setUserRole(nextRole);
              localStorage.setItem("userRole", nextRole);
              alert(`Simulating View: Switched profile role to ${nextRole}`);
            }}
            className="w-full border border-dashed border-gray-300 hover:border-bhagwa text-gray-500 hover:text-bhagwa rounded-xl py-2 mt-6 text-xs font-bold transition-all"
          >
            Toggle {userRole === "ADMIN" ? "Member" : "Admin"} View
          </button>
        </aside>

        {/* Right Tab Content Panel */}
        <main className="flex-1 bg-white border border-light-border rounded-3xl p-6 md:p-8 shadow-sm min-h-[550px] flex flex-col justify-between">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Portal Overview</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Real-time stats and metrics for Agrawal Samaj</p>
              </div>

              {/* Grid cards info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Total Members</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{members.filter(m => m.status === "APPROVED").length}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Families Catalog</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">45</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Active Bookings</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{bookings.length}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Samaj Funds</span>
                  <p className="text-2xl font-black text-bhagwa mt-1">₹1.42L</p>
                </div>
              </div>

              {/* Family details display */}
              <div className="border border-orange-100/60 bg-orange-50/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900">Your Registered Family profile</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-semibold">Add additional members to keep directory list complete.</p>
                  <div className="flex gap-4 mt-3 text-xs font-bold text-gray-700">
                    <p>Family ID: <span className="text-bhagwa font-bold">FAM100204</span></p>
                    <p>Members Count: <span className="text-bhagwa font-bold">{myFamily.length + 1} (including you)</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab("FAMILY")}
                  className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all w-fit shadow-md shadow-bhagwa/10"
                >
                  Manage Family members
                </button>
              </div>

              {/* Recent Bookings preview table */}
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-base text-gray-900">Your Facility Reservations</h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        <th className="p-4">Facility Name</th>
                        <th className="p-4">Booking Date</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4">Approval Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bookings.filter(b => b.userName === "Ramesh Agrawal" || b.userName === "Suresh Agrawal").map((b) => (
                        <tr key={b.id} className="text-gray-800">
                          <td className="p-4 font-bold text-gray-950">{b.facility}</td>
                          <td className="p-4">{b.date}</td>
                          <td className="p-4 uppercase text-muted-text">{b.payment}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              b.status === "CONFIRMED" ? "bg-green-50 text-green-700" : "bg-orange-50 text-bhagwa"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTORY */}
          {activeTab === "DIRECTORY" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Members Directory</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Search and connect with approved Samaj family directory details</p>
              </div>

              {/* Filters search */}
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

              {/* Directory Listing Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {filteredMembers.map((m) => {
                  const hidePhone = m.isPrivate.phone && userRole !== "ADMIN";
                  const hideEmail = m.isPrivate.email && userRole !== "ADMIN";

                  return (
                    <div key={m.id} className="border border-light-border bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-lg text-gray-900">{m.firstName} {m.lastName}</h3>
                          <span className="text-[10px] font-bold text-bhagwa uppercase tracking-wider mt-0.5 block">
                            Family ID: {m.familyId}
                          </span>
                        </div>
                        <span className="bg-orange-50 text-bhagwa text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          {m.profession}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 text-xs font-semibold text-gray-700 border-t border-gray-100 pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-text">Mobile Line:</span>
                          <span className="text-gray-900">
                            {hidePhone ? (
                              <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase"><EyeOff className="w-3 h-3" /> Private</span>
                            ) : m.phone}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-text">Email ID:</span>
                          <span className="text-gray-900">
                            {hideEmail ? (
                              <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase"><EyeOff className="w-3 h-3" /> Private</span>
                            ) : m.email}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-text">Colony Address:</span>
                          <span className="text-gray-900">{m.colony}, {m.area}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FAMILY */}
          {activeTab === "FAMILY" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Family Members Registration</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Manage registered members belonging to Family ID: <strong className="text-bhagwa font-bold">FAM100204</strong></p>
              </div>

              {/* Family Directory list */}
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Main Head */}
                <div className="border border-orange-200 bg-orange-50/20 rounded-2xl p-5 text-center flex flex-col gap-2">
                  <p className="text-xs font-black text-bhagwa uppercase tracking-wider">Family Head</p>
                  <h4 className="font-extrabold text-lg text-gray-900">Ramesh Agrawal</h4>
                  <p className="text-[10px] text-gray-500 font-semibold">+91 98765 43210</p>
                </div>

                {myFamily.map((relative) => (
                  <div key={relative.id} className="border border-light-border bg-white rounded-2xl p-5 text-center flex flex-col justify-center gap-2">
                    <p className="text-xs font-black text-muted-text uppercase tracking-wider">{relative.relation}</p>
                    <h4 className="font-extrabold text-lg text-gray-900">{relative.name}</h4>
                    <p className="text-[10px] text-gray-500 font-semibold">{relative.phone}</p>
                  </div>
                ))}
              </div>

              {/* Add New member form */}
              <form onSubmit={handleAddFamilyMember} className="border border-gray-100 rounded-3xl p-6 flex flex-col gap-5 bg-gray-50/30">
                <h3 className="font-extrabold text-base text-gray-900">Add Family Member</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-text uppercase tracking-wider">Relative Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={newFamName}
                      onChange={(e) => setNewFamName(e.target.value)}
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
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-text uppercase tracking-wider">Age (Years)</label>
                    <input
                      type="number"
                      required
                      placeholder="Age"
                      value={newFamAge}
                      onChange={(e) => setNewFamAge(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-bhagwa text-black bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-text uppercase tracking-wider">Contact Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Mobile Line"
                      value={newFamPhone}
                      onChange={(e) => setNewFamPhone(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-bhagwa text-black bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all self-end flex items-center gap-1.5 shadow-md shadow-bhagwa/10"
                >
                  <Plus className="w-4 h-4" /> Add Member Profile
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "BOOKINGS" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Bhavan Facility Reservations</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Track and manage room, hall, and ground bookings</p>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                      <th className="p-4">Booked Facility</th>
                      <th className="p-4">Applicant Name</th>
                      <th className="p-4">Reserved Date</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="text-gray-800">
                        <td className="p-4 font-bold text-gray-950">{b.facility}</td>
                        <td className="p-4">{b.userName}</td>
                        <td className="p-4">{b.date}</td>
                        <td className="p-4 uppercase text-muted-text">{b.payment}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            b.status === "CONFIRMED" ? "bg-green-50 text-green-700" : "bg-orange-50 text-bhagwa"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CHAT ROOMS */}
          {activeTab === "CHAT" && (
            <div className="flex flex-col gap-6 flex-grow">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Community Chat Channels</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Communicate with colony neighbors, Samaj members, or chat admins privately</p>
              </div>

              {/* Horizontal layout: Channels & Msg threads */}
              <div className="flex flex-col md:flex-row border border-gray-100 rounded-3xl overflow-hidden flex-grow min-h-[400px]">
                
                {/* Left Channels Panel */}
                <div className="w-full md:w-60 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-2 px-2">Active Channels</h4>
                  {[
                    "General Member Group",
                    "Non-Member Community Group",
                    "Khushi Vihar Group",
                    "Patrakar Road Group",
                    "Private Chat (Admin)"
                  ].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all truncate ${
                        selectedChannel === ch ? "bg-bhagwa text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      # {ch}
                    </button>
                  ))}
                </div>

                {/* Right Messages Thread */}
                <div className="flex-1 flex flex-col bg-white p-4">
                  <div className="border-b border-gray-100 pb-3 mb-4">
                    <h3 className="font-extrabold text-sm text-gray-950"># {selectedChannel}</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Active simulated WebSocket socket.io log room</p>
                  </div>

                  {/* Message scroll bubbles */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-64 mb-4 pr-1">
                    {chatMessages
                      .filter(m => m.channel === selectedChannel)
                      .map((m) => {
                        const isAdminMsg = m.role === "ADMIN";
                        const isMe = m.sender === "Ramesh Agrawal" || (userRole === "ADMIN" && m.sender === "Admin");

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col max-w-[80%] rounded-2xl p-3 text-xs ${
                              isMe
                                ? "bg-bhagwa/10 border border-bhagwa/20 self-end text-right rounded-tr-none text-black"
                                : isAdminMsg
                                ? "bg-red-50 border border-red-100 self-start rounded-tl-none text-black"
                                : "bg-gray-50 border border-gray-100 self-start rounded-tl-none text-black"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold mb-1 justify-between">
                              <span className="text-bhagwa">{m.sender}</span>
                              <span className="text-[9px] text-muted-text font-medium">{m.time}</span>
                            </div>
                            <p className="font-medium text-left leading-relaxed">{m.content}</p>
                          </div>
                        );
                      })}
                  </div>

                  {/* Send box */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write message content here..."
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-bhagwa text-black font-semibold"
                    />
                    <button
                      type="submit"
                      className="bg-bhagwa hover:bg-bhagwa-hover text-white p-2.5 rounded-xl transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MY PROFILE SETTINGS */}
          {activeTab === "PROFILE" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Profile Settings</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Manage your profile metadata information and directory privacy access options</p>
              </div>

              {/* Profile Details layout */}
              <div className="grid sm:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">FullName Name</span>
                  <p className="font-bold text-base text-gray-900">Ramesh Agrawal</p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Family Unique ID</span>
                  <p className="font-bold text-base text-bhagwa tracking-wide font-black">FAM100204</p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Mobile Line</span>
                  <p className="font-bold text-sm text-gray-900">+91 98765 43210</p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Colony Location</span>
                  <p className="font-bold text-sm text-gray-900">Khushi Vihar, Patrakar Road</p>
                </div>
              </div>

              {/* Privacy control settings */}
              <div className="bg-orange-50/40 border border-orange-100/70 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-black text-bhagwa uppercase tracking-wider">
                  <EyeOff className="w-4 h-4" />
                  <span>Interactive Directory Privacy Controls</span>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                  Turn on checkboxes to prevent other Samaj directory members from viewing details. Administrators can always view values.
                </p>

                <div className="flex flex-col gap-3 font-semibold text-xs text-gray-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={myPrivacy.phone}
                      onChange={(e) => setMyPrivacy(prev => ({ ...prev, phone: e.target.checked }))}
                      className="rounded border-gray-300 text-bhagwa focus:ring-bhagwa"
                    />
                    Hide Phone Number from other members
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={myPrivacy.email}
                      onChange={(e) => setMyPrivacy(prev => ({ ...prev, email: e.target.checked }))}
                      className="rounded border-gray-300 text-bhagwa focus:ring-bhagwa"
                    />
                    Hide Email Address from other members
                  </label>
                </div>

                <button
                  onClick={() => {
                    // Simulating saving privacy updates
                    setMembers(prev => prev.map(m => m.id === 1 ? { ...m, isPrivate: { ...m.isPrivate, phone: myPrivacy.phone, email: myPrivacy.email } } : m));
                    alert("Directory privacy settings successfully updated.");
                  }}
                  className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-end shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: ADMIN APPROVALS PANEL */}
          {activeTab === "APPROVALS" && userRole === "ADMIN" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 text-red-600">Admin Approvals</h2>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Approve newly registered member family profiles and Bhavan facility bookings</p>
              </div>

              {/* Section 1: User Registrations waiting */}
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  Pending Samaj Member Registrations
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        <th className="p-4">Name</th>
                        <th className="p-4">Family ID</th>
                        <th className="p-4">Colony & Area</th>
                        <th className="p-4">Profession</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {members.filter(m => m.status === "PENDING").map((m) => (
                        <tr key={m.id} className="text-gray-800">
                          <td className="p-4 font-bold text-gray-950">{m.firstName} {m.lastName}</td>
                          <td className="p-4">{m.familyId}</td>
                          <td className="p-4">{m.colony}, {m.area}</td>
                          <td className="p-4 uppercase text-muted-text">{m.profession}</td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button
                              onClick={() => handleApproveMember(m.id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setMembers(prev => prev.filter(x => x.id !== m.id));
                                alert("User registration rejected.");
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                      {members.filter(m => m.status === "PENDING").length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">No pending registrations found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Bookings waiting counter */}
              <div className="flex flex-col gap-3 mt-4">
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  Pending Bhavan Bookings
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        <th className="p-4">Facility</th>
                        <th className="p-4">Applicant</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Payment</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bookings.filter(b => b.status === "PENDING").map((b) => (
                        <tr key={b.id} className="text-gray-800">
                          <td className="p-4 font-bold text-gray-950">{b.facility}</td>
                          <td className="p-4">{b.userName}</td>
                          <td className="p-4">{b.date}</td>
                          <td className="p-4 uppercase text-muted-text">{b.payment}</td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button
                              onClick={() => handleApproveBooking(b.id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "REJECTED" } : x));
                                alert("Booking rejected.");
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bookings.filter(b => b.status === "PENDING").length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">No pending bookings found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
