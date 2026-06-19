"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getApiUrl } from "../../config";
import OverviewTab from "./components/OverviewTab";
import DirectoryTab from "./components/DirectoryTab";
import FamilyTab from "./components/FamilyTab";
import BookingsTab from "./components/BookingsTab";
import ChatTab from "./components/ChatTab";
import ProfileTab from "./components/ProfileTab";
import EventsTab from "./components/EventsTab";
import ApprovalsTab from "./components/ApprovalsTab";
import FacilitiesTab from "./components/FacilitiesTab";
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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "DIRECTORY" | "FAMILY" | "BOOKINGS" | "CHAT" | "PROFILE" | "APPROVALS" | "EVENTS" | "FACILITIES">("OVERVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchColony, setSearchColony] = useState("");
  const [searchArea, setSearchArea] = useState("");

  // Real Data States
  const [stats, setStats] = useState({ total_members: 0, total_families: 0, active_bookings: 0, samaj_funds: 0 });
  const [members, setMembers] = useState<any[]>([]); 
  const [bookings, setBookings] = useState<any[]>([]); 
  const [events, setEvents] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [newFacility, setNewFacility] = useState({ name: "", type: "ROOM", price_per_day: 0, capacity: 0, floor: "", image_url: "" });
  const [newEvent, setNewEvent] = useState<{title: string, description: string, location: string, start_date: Date | null, end_date: Date | null, visibility: string, capacity: number, is_paid: boolean, fee_amount: number}>({ title: "", description: "", location: "", start_date: new Date(), end_date: new Date(), visibility: "PUBLIC", capacity: 100, is_paid: false, fee_amount: 0 });
  const [myFamily, setMyFamily] = useState<any>(null); 
  const [myPrivacy, setMyPrivacy] = useState({ phone: false, email: false, address: false });
  const [addressForm, setAddressForm] = useState({ address_text: "", colony: "", area: "" });

  // New family inputs
  const [newFamSamajId, setNewFamSamajId] = useState("");
  const [newFamRelation, setNewFamRelation] = useState("Son");
  const [newFamName, setNewFamName] = useState(""); // For registration
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  const loadData = async (token: string, role: string) => {
    try {
      const hdrs = { "Authorization": `Bearer ${token}` };
      
      const resStats = await fetch(getApiUrl("/api/v1/dashboard/stats"), { headers: hdrs });
      if (resStats.ok) setStats(await resStats.json());

      const resFam = await fetch(getApiUrl("/api/v1/family/my-family"), { headers: hdrs });
      if (resFam.ok) setMyFamily(await resFam.json());

      const resBookings = await fetch(getApiUrl("/api/v1/bookings/my-bookings"), { headers: hdrs });
      if (resBookings.ok) setBookings(await resBookings.json());

      if (role === "ADMIN" || role === "MEMBER") {
        const resMembers = await fetch(getApiUrl("/api/v1/members"), { headers: hdrs });
        if (resMembers.ok) setMembers(await resMembers.json());
      }
      
      if (role === "ADMIN") {
        const resPendingPayments = await fetch(getApiUrl("/api/v1/payments/pending"), { headers: hdrs });
        if (resPendingPayments.ok) setPendingPayments(await resPendingPayments.json());
      }

      const resEvents = await fetch(getApiUrl("/api/v1/events"), { headers: hdrs });
      if (resEvents.ok) setEvents(await resEvents.json());

      const resFac = await fetch(getApiUrl("/api/v1/facilities"), { headers: hdrs });
      if (resFac.ok) setFacilities(await resFac.json());
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
        const res = await fetch(getApiUrl("/api/v1/auth/me"), {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const res = await fetch(getApiUrl("/api/v1/members/apply"), {
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
    const res = await fetch(getApiUrl(`/api/v1/members/approve/${samaj_id}?role=MEMBER`), {
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
    const res = await fetch(getApiUrl(`/api/v1/members/reject/${samaj_id}`), {
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
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/v1/bookings/${id}/approve`), {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Booking confirmed successfully.");
        loadData(token as string, userRole);
      } else {
        alert("Failed to confirm booking.");
      }
    } catch (e) {
      alert("Error confirming booking.");
    }
  };

  const handleRejectBooking = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/v1/bookings/${id}/reject`), {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Booking rejected successfully.");
        loadData(token as string, userRole);
      } else {
        alert("Failed to reject booking.");
      }
    } catch (e) {
      alert("Error rejecting booking.");
    }
  };

  const handleRegisterFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl("/api/v1/family/register"), {
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
    const res = await fetch(getApiUrl("/api/v1/family/remove"), {
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
    const res = await fetch(getApiUrl("/api/v1/family/add-member"), {
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
    const res = await fetch(getApiUrl("/api/v1/users/privacy"), {
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
      const res = await fetch(getApiUrl("/api/v1/events"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        alert("Event successfully created!");
        setNewEvent({ title: "", description: "", location: "", start_date: new Date(), end_date: new Date(), visibility: "PUBLIC", capacity: 100, is_paid: false, fee_amount: 0 });
        loadData(token as string, userRole);
      } else {
        alert("Failed to create event.");
      }
    } catch (error) {
      alert("Error communicating with server.");
    }
  };

  const handleVerifyPayment = async (paymentId: number, status: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/v1/payments/${paymentId}/verify`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        alert(`Payment marked as ${status}`);
        loadData(token as string, userRole);
      } else {
        alert("Failed to verify payment.");
      }
    } catch (e) {
      alert("Error verifying payment.");
    }
  };

  const handleSaveAddress = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl("/api/v1/users/me/address"), {
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

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl("/api/v1/facilities"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newFacility)
      });
      if (res.ok) {
        alert("Facility created successfully!");
        setNewFacility({ name: "", type: "ROOM", price_per_day: 0, capacity: 0, floor: "", image_url: "" });
        loadData(token as string, userRole);
      } else {
        alert("Failed to create facility.");
      }
    } catch (error) {
      console.error("Create facility error:", error);
      alert("Error creating facility.");
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
              <>
                <button
                  onClick={() => setActiveTab("EVENTS")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === "EVENTS" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Events Manager
                </button>

                <button
                  onClick={() => setActiveTab("FACILITIES")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === "FACILITIES" ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Facility Manager
                </button>
              </>
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
               activeTab === "APPROVALS" ? "Admin Approvals" :
               activeTab === "FACILITIES" ? "Facility Manager" : "My Profile Settings"}
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
            <OverviewTab
              userRole={userRole}
              currentUser={currentUser}
              stats={stats}
              myFamily={myFamily}
              bookings={bookings}
              handleApplyMembership={handleApplyMembership}
              setActiveTab={setActiveTab}
            />
          )}

          {/* TAB 2: DIRECTORY */}
          {activeTab === "DIRECTORY" && (
            <DirectoryTab
              userRole={userRole}
              filteredMembers={filteredMembers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchColony={searchColony}
              setSearchColony={setSearchColony}
              searchArea={searchArea}
              setSearchArea={setSearchArea}
            />
          )}

          {/* TAB 3: FAMILY */}
          {activeTab === "FAMILY" && (
            <FamilyTab
              myFamily={myFamily}
              newFamName={newFamName}
              setNewFamName={setNewFamName}
              handleRegisterFamily={handleRegisterFamily}
              newFamSamajId={newFamSamajId}
              setNewFamSamajId={setNewFamSamajId}
              newFamRelation={newFamRelation}
              setNewFamRelation={setNewFamRelation}
              handleAddFamilyMember={handleAddFamilyMember}
              handleDeleteFamily={handleDeleteFamily}
            />
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "BOOKINGS" && (
            <BookingsTab bookings={bookings} />
          )}

          {/* TAB 5: CHAT ROOMS */}
          {activeTab === "CHAT" && (
            <ChatTab
              userRole={userRole}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              chatMessages={chatMessages}
              newMsg={newMsg}
              setNewMsg={setNewMsg}
              handleSendMessage={handleSendMessage}
            />
          )}

          {/* TAB 6: MY PROFILE SETTINGS */}
          {activeTab === "PROFILE" && (
            <ProfileTab
              currentUser={currentUser}
              myPrivacy={myPrivacy}
              setMyPrivacy={setMyPrivacy}
              handleSavePrivacy={handleSavePrivacy}
              addressForm={addressForm}
              setAddressForm={setAddressForm}
              handleSaveAddress={handleSaveAddress}
            />
          )}

          {/* TAB 7: ADMIN APPROVALS PANEL */}
          {activeTab === "APPROVALS" && userRole === "ADMIN" && (
            <ApprovalsTab
              members={members}
              bookings={bookings}
              handleApproveMember={handleApproveMember}
              handleRejectMember={handleRejectMember}
              handleApproveBooking={handleApproveBooking}
              handleRejectBooking={handleRejectBooking}
            />
          )}

          {/* TAB 8: EVENTS MANAGER */}
          {activeTab === "EVENTS" && userRole === "ADMIN" && (
            <EventsTab
              events={events}
              newEvent={newEvent}
              setNewEvent={setNewEvent}
              handleCreateEvent={handleCreateEvent}
              pendingPayments={pendingPayments}
              handleVerifyPayment={handleVerifyPayment}
            />
          )}

          {/* TAB 9: FACILITIES MANAGER */}
          {activeTab === "FACILITIES" && userRole === "ADMIN" && (
            <FacilitiesTab
              facilities={facilities}
              newFacility={newFacility}
              setNewFacility={setNewFacility}
              handleCreateFacility={handleCreateFacility}
            />
          )}

        </main>
      </div>

    </div>
  );
}
