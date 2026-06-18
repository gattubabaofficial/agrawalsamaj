"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  LayoutDashboard,
  LogOut,
  Copy, 
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
  Plus,
  Calendar
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [userRole, setUserRole] = useState<"ADMIN" | "MEMBER" | "USER">("MEMBER");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "DIRECTORY" | "FAMILY" | "BOOKINGS" | "CHAT" | "PROFILE" | "APPROVALS" | "EVENTS">("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchColony, setSearchColony] = useState("");
  const [searchArea, setSearchArea] = useState("");

  // Real Data States
  const [stats, setStats] = useState({ total_members: 0, total_families: 0, active_bookings: 0, samaj_funds: 0 });
  const [members, setMembers] = useState<any[]>([]); 
  const [bookings, setBookings] = useState<any[]>([]); 
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState<{title: string, description: string, location: string, start_date: Date | null, end_date: Date | null, visibility: string, capacity: number}>({ title: "", description: "", location: "", start_date: new Date(), end_date: new Date(), visibility: "PUBLIC", capacity: 100 });
  const [myFamily, setMyFamily] = useState<any>(null); 
  const [myPrivacy, setMyPrivacy] = useState({ phone: false, email: false, address: false });
  const [addressForm, setAddressForm] = useState({ address_text: "", colony: "", area: "" });

  // New family inputs
  const [newFamSamajId, setNewFamSamajId] = useState("");
  const [newFamRelation, setNewFamRelation] = useState("Son");
  const [newFamName, setNewFamName] = useState(""); // For registration

  const loadData = async (token: string, role: string) => {
    try {
      const hdrs = { "Authorization": `Bearer ${token}` };
      
      const resStats = await fetch("http://127.0.0.1:8000/api/v1/dashboard/stats", { headers: hdrs });
      if (resStats.ok) setStats(await resStats.json());

      const resFam = await fetch("http://127.0.0.1:8000/api/v1/family/my-family", { headers: hdrs });
      if (resFam.ok) setMyFamily(await resFam.json());

      const resBookings = await fetch("http://127.0.0.1:8000/api/v1/bookings/my-bookings", { headers: hdrs });
      if (resBookings.ok) setBookings(await resBookings.json());

      if (role === "ADMIN" || role === "MEMBER") {
        const resMembers = await fetch("http://127.0.0.1:8000/api/v1/members", { headers: hdrs });
        if (resMembers.ok) setMembers(await resMembers.json());
      }

      const resEvents = await fetch("http://127.0.0.1:8000/api/v1/events", { headers: hdrs });
      if (resEvents.ok) setEvents(await resEvents.json());
    } catch (e) {
      console.error("Data load failed", e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const data = await res.json();
        setCurrentUser(data);
        setUserRole(data.role);
        setMyPrivacy({ phone: !data.show_phone, email: !data.show_email, address: !data.show_address });
        if (data.address) {
          setAddressForm({ address_text: data.address.address_text || "", colony: data.address.colony || "", area: data.address.area || "" });
        }
        localStorage.setItem("userRole", data.role);
        
        loadData(token, data.role);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
        router.push("/login");
      }
    };
    
    fetchUser();
  }, [activeTab]);

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



  // Handlers
  const handleApplyMembership = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:8000/api/v1/members/apply", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      alert("Membership application submitted successfully!");
      if (currentUser) {
        setCurrentUser({ ...currentUser, status: "PENDING", approval_status: "PENDING" });
      }
    } else {
      alert("Failed to submit membership application.");
    }
  };
  const handleApproveMember = async (samaj_id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:8000/api/v1/members/approve/${samaj_id}?role=MEMBER`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      alert("User successfully approved as Samaj Member.");
      // Update local members state
      setMembers(prev => prev.map(m => m.samaj_id === samaj_id ? { ...m, status: "APPROVED", role: "MEMBER" } : m));
    } else {
      alert("Failed to approve member.");
    }
  };

  const handleRejectMember = async (samaj_id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:8000/api/v1/members/reject/${samaj_id}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      alert("User registration rejected.");
      setMembers(prev => prev.map(m => m.samaj_id === samaj_id ? { ...m, status: "REJECTED" } : m));
    } else {
      alert("Failed to reject member.");
    }
  };

  const handleApproveBooking = async (id: number) => {
    alert("Booking successfully confirmed.");
  };

  const handleRegisterFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:8000/api/v1/family/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ family_name: newFamName })
    });
    if (res.ok) {
      alert("Family Registered!");
      const data = await res.json();
      setMyFamily(data);
      // Don't switch tab, let them see their new family code!
    } else {
      alert("Error registering family. Make sure you don't already belong to one.");
    }
  };

  const handleDeleteFamily = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:8000/api/v1/family/remove", {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      alert("Family Deleted!");
      setMyFamily(null);
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamSamajId) return;
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:8000/api/v1/family/add-member", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ samaj_id: newFamSamajId, relationship: newFamRelation })
    });
    if (res.ok) {
      alert("Family member successfully added!");
      setNewFamSamajId("");
      loadData(token as string, userRole);
    } else {
      alert("Failed to add. Make sure the ID is correct.");
    }
  };
  
  const handleSavePrivacy = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://127.0.0.1:8000/api/v1/users/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ show_phone: !myPrivacy.phone, show_email: !myPrivacy.email, show_address: !myPrivacy.address })
    });
    if (res.ok) {
      alert("Directory privacy settings successfully updated.");
    }
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

  const handleCreateEvent = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        alert("Event successfully created!");
        setNewEvent({ title: "", description: "", location: "", start_date: new Date(), end_date: new Date(), visibility: "PUBLIC", capacity: 100 });
        loadData(token as string, userRole);
      } else {
        alert("Failed to create event.");
      }
    } catch (error) {
      alert("Error communicating with server.");
    }
  };

  const handleSaveAddress = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/users/me/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(addressForm)
      });
      if (res.ok) {
        alert("Address saved successfully!");
        setCurrentUser((prev: any) => ({ ...prev, address: { ...prev.address, ...addressForm }}));
      } else {
        alert("Failed to save address.");
      }
    } catch (e) {
      alert("Error saving address.");
    }
  };


  // Filter members directory
  const filteredMembers = members.filter(m => {
    if (m.status !== "APPROVED") return false;
    const matchesName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
    const colony = m.address?.colony || "";
    const area = m.address?.area || "";
    const matchesColony = searchColony === "" || colony.toLowerCase().includes(searchColony.toLowerCase());
    const matchesArea = searchArea === "" || area.toLowerCase().includes(searchArea.toLowerCase());
    return matchesName && matchesColony && matchesArea;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-black font-bold">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 gap-8">
        
        {/* Left Side Tab Navigation Panel */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {/* Quick profile info */}
          <div className="bg-orange-50/50 border border-orange-100/70 rounded-3xl p-5 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bhagwa text-white font-black text-xl flex items-center justify-center">
              {currentUser.first_name ? currentUser.first_name[0].toUpperCase() : "?"}
              {currentUser.last_name ? currentUser.last_name[0].toUpperCase() : ""}
            </div>
            <div>
              <p className="font-extrabold text-sm text-gray-900 truncate max-w-[140px]">{currentUser.first_name} {currentUser.last_name}</p>
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
                onClick={() => setActiveTab("EVENTS")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === "EVENTS" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Events Manager
              </button>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("token");
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-600 hover:bg-red-50 font-bold text-sm mt-4"
            >
              <LogOut className="w-4 h-4" />
              Logout
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

        </aside>

        {/* Right Tab Content Panel */}
        <main className="flex-1 bg-white border border-light-border rounded-3xl p-6 md:p-8 shadow-sm min-h-[550px] flex flex-col justify-start gap-6">
          
          {/* Top Dashboard Header */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 capitalize tracking-tight">
              {activeTab === "OVERVIEW" ? "Dashboard Overview" :
               activeTab === "DIRECTORY" ? "Members Directory" :
               activeTab === "FAMILY" ? "Family Registration" :
               activeTab === "BOOKINGS" ? "Bhavan Bookings" :
               activeTab === "CHAT" ? "Community Chat" :
               activeTab === "EVENTS" ? "Events Manager" :
               activeTab === "APPROVALS" ? "Admin Approvals" : "My Profile Settings"}
            </h1>
            
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-bhagwa rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {hasUnread && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm text-gray-900">Notifications</h4>
                    {hasUnread && <button onClick={() => setHasUnread(false)} className="text-xs text-bhagwa font-semibold hover:underline">Mark all read</button>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="p-3 bg-blue-50/50 rounded-xl">
                      <p className="text-xs font-semibold text-gray-800">Welcome to Agrawal Samaj Portal!</p>
                      <p className="text-[10px] text-gray-500 mt-1">Complete your profile to get started.</p>
                    </div>
                    {userRole === "USER" && currentUser?.status === "PENDING" && (
                      <div className="p-3 bg-yellow-50/50 rounded-xl">
                        <p className="text-xs font-semibold text-yellow-800">Approval Pending</p>
                        <p className="text-[10px] text-yellow-600 mt-1">Your membership application is awaiting review.</p>
                      </div>
                    )}
                    {userRole === "USER" && currentUser?.status === "REJECTED" && (
                      <div className="p-3 bg-red-50/50 rounded-xl">
                        <p className="text-xs font-semibold text-red-800">Membership Rejected</p>
                        <p className="text-[10px] text-red-600 mt-1">Your recent application was not approved.</p>
                      </div>
                    )}
                    {userRole === "MEMBER" && currentUser?.status === "APPROVED" && (
                      <div className="p-3 bg-green-50/50 rounded-xl">
                        <p className="text-xs font-semibold text-green-800">Membership Approved!</p>
                        <p className="text-[10px] text-green-600 mt-1">You are now a verified Samaj member.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="flex flex-col gap-6">
              {userRole === "ADMIN" && (
                <>
                  <div>
                    <p className="text-xs text-muted-text mt-0.5 font-semibold">Real-time stats and metrics for Agrawal Samaj</p>
                  </div>

                  {/* Grid cards info */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                      <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Total Members</span>
                      <p className="text-2xl font-black text-gray-900 mt-1">{stats.total_members}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                      <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Families Catalog</span>
                      <p className="text-2xl font-black text-gray-900 mt-1">{stats.total_families}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                      <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Active Bookings</span>
                      <p className="text-2xl font-black text-gray-900 mt-1">{stats.active_bookings}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                      <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Samaj Funds</span>
                      <p className="text-2xl font-black text-bhagwa mt-1">₹{(stats.samaj_funds || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Apply for Membership Banner */}
              {userRole === "USER" && currentUser?.status === "NOT_APPLIED" && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
                  <div className="flex gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <h4 className="font-bold text-base">Become a verified Samaj Member!</h4>
                      <p className="text-xs font-medium mt-1 opacity-80">Apply for official membership to gain access to the directory, private chats, event creation, and booking benefits.</p>
                    </div>
                  </div>
                  <button onClick={handleApplyMembership} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-md shadow-blue-600/20">
                    Apply Now
                  </button>
                </div>
              )}

              {/* Family details display */}
              <div className="border border-orange-100/60 bg-orange-50/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900">Your Registered Family profile</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-semibold">Add additional members to keep directory list complete.</p>
                  <div className="flex gap-4 mt-3 text-xs font-bold text-gray-700">
                    <p>Family ID: <span className="text-bhagwa font-bold">{myFamily?.family_code || "Not Registered"}</span></p>
                    <p>Members Count: <span className="text-bhagwa font-bold">{myFamily?.members?.length || 0}</span></p>
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
                  const hidePhone = !m.show_phone && userRole !== "ADMIN";
                  const hideEmail = !m.show_email && userRole !== "ADMIN";

                  return (
                    <div key={m.samaj_id} className="border border-light-border bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-lg text-gray-900">{m.first_name} {m.last_name}</h3>
                          <span className="text-[10px] font-bold text-bhagwa uppercase tracking-wider mt-0.5 block">
                            Family ID: {m.family_id ? `FAM${m.family_id}` : "N/A"}
                          </span>
                        </div>
                        <span className="bg-orange-50 text-bhagwa text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          {m.profession || "N/A"}
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
                            ) : (m.email || "N/A")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-text">Colony Address:</span>
                          <span className="text-gray-900">{m.address?.colony || ""}, {m.address?.area || ""}</span>
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
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Manage registered members belonging to Family ID: <strong className="text-bhagwa font-bold">{myFamily?.family_code || "Not Registered"}</strong></p>
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
                      className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-bhagwa text-black"
                    />
                    <button type="submit" className="bg-bhagwa text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm">
                      Register New Family
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {myFamily.members.map((relative: any) => (
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
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "BOOKINGS" && (
            <div className="flex flex-col gap-6">
              <div>
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
                        <td className="p-4 font-bold text-gray-950">{b.facility?.name} {b.facility?.floor ? `(Floor: ${b.facility.floor})` : ""}</td>
                        <td className="p-4">{b.user?.first_name} {b.user?.last_name}</td>
                        <td className="p-4">{new Date(b.booking_start).toLocaleDateString()}</td>
                        <td className="p-4 uppercase text-muted-text">ONLINE</td>
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
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Manage your profile metadata information and directory privacy access options</p>
              </div>

              {/* Profile Details layout */}
              <div className="grid sm:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Full Name</span>
                  <p className="font-bold text-base text-gray-900">{currentUser.first_name} {currentUser.last_name}</p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Samaj Unique ID</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-bold text-base text-bhagwa tracking-wide font-black">{currentUser.samaj_id}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.samaj_id);
                        alert("Samaj ID copied to clipboard!");
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Mobile Line</span>
                  <p className="font-bold text-sm text-gray-900">{currentUser.phone}</p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Colony Location</span>
                  <p className="font-bold text-sm text-gray-900">{currentUser.address?.colony}, {currentUser.address?.area}</p>
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
                  onClick={handleSavePrivacy}
                  className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-end shadow-sm"
                >
                  Save Settings
                </button>
              </div>

              {/* Address Management Settings */}
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
                  <span>Manage Address</span>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                  Provide your permanent residential address. This will be automatically linked to your Family if you decide to register one.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">House / Flat No / Street</label>
                    <input 
                      value={addressForm.address_text}
                      onChange={e => setAddressForm({...addressForm, address_text: e.target.value})}
                      className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none"
                      placeholder="e.g. 104, B-Wing, Omkar Tower"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Colony / Society</label>
                    <input 
                      value={addressForm.colony}
                      onChange={e => setAddressForm({...addressForm, colony: e.target.value})}
                      className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none"
                      placeholder="e.g. Agrawal Nagar"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Area / Locality</label>
                    <input 
                      value={addressForm.area}
                      onChange={e => setAddressForm({...addressForm, area: e.target.value})}
                      className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none"
                      placeholder="e.g. Navlakha Road"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveAddress}
                  className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-end shadow-sm mt-2"
                >
                  Save Address
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: ADMIN APPROVALS PANEL */}
          {activeTab === "APPROVALS" && userRole === "ADMIN" && (
            <div className="flex flex-col gap-6">
              <div>
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
                        <tr key={m.samaj_id} className="text-gray-800">
                          <td className="p-4 font-bold text-gray-950">{m.first_name} {m.last_name}</td>
                          <td className="p-4">{m.family_id || "None"}</td>
                          <td className="p-4">{m.address?.colony || "-"}, {m.address?.area || "-"}</td>
                          <td className="p-4 uppercase text-muted-text">{m.profession || "-"}</td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button
                              onClick={() => handleApproveMember(m.samaj_id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectMember(m.samaj_id)}
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
        {activeTab === "EVENTS" && userRole === "ADMIN" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
                <p className="text-xs text-muted-text mt-0.5 font-semibold">Create and oversee community events.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
              <h3 className="font-extrabold text-lg text-gray-900 mb-4">Create New Event</h3>
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Event Title" className="p-3 border border-gray-200 rounded-xl" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                <input required placeholder="Location" className="p-3 border border-gray-200 rounded-xl" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                <DatePicker
                  selected={newEvent.start_date}
                  onChange={(date: Date | null) => setNewEvent({ ...newEvent, start_date: date })}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="p-3 border border-gray-200 rounded-xl text-gray-900 bg-white w-full"
                  placeholderText="Start Date & Time"
                  required
                />
                <DatePicker
                  selected={newEvent.end_date}
                  onChange={(date: Date | null) => setNewEvent({ ...newEvent, end_date: date })}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="p-3 border border-gray-200 rounded-xl text-gray-900 bg-white w-full"
                  placeholderText="End Date & Time"
                  required
                />
                <select className="p-3 border border-gray-200 rounded-xl" value={newEvent.visibility} onChange={e => setNewEvent({...newEvent, visibility: e.target.value})}>
                  <option value="PUBLIC">Public</option>
                  <option value="MEMBERS_ONLY">Members Only</option>
                </select>
                <input required type="number" placeholder="Capacity" className="p-3 border border-gray-200 rounded-xl" value={newEvent.capacity || ""} onChange={e => setNewEvent({...newEvent, capacity: parseInt(e.target.value) || 0})} />
                <textarea required placeholder="Description" className="p-3 border border-gray-200 rounded-xl md:col-span-2" rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                <button type="submit" className="md:col-span-2 bg-bhagwa text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-md shadow-bhagwa/20">Publish Event</button>
              </form>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="font-extrabold text-lg text-gray-900">Upcoming & Past Events</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {events.map((ev: any) => (
                  <div key={ev.id} className="border border-gray-100 bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 text-lg">{ev.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{ev.visibility}</span>
                    </div>
                    <p className="text-xs text-bhagwa font-bold">{new Date(ev.start_date).toLocaleString()} — {new Date(ev.end_date).toLocaleString()}</p>
                    <p className="text-xs text-gray-700 font-semibold">{ev.location} &bull; Capacity: {ev.capacity}</p>
                    <p className="text-sm mt-2 text-gray-600">{ev.description}</p>
                  </div>
                ))}
                {events.length === 0 && <p className="text-gray-500 text-sm font-medium">No events found in catalog.</p>}
              </div>
            </div>
          </div>
        )}

        </main>
      </div>

    </div>
  );
}
