"use client";

import { Calendar, CreditCard, Ticket, ShieldAlert, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function UserDashboard() {
  const [role, setRole] = useState<string>("GUEST");
  const [isApplying, setIsApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null); 
  const [stats, setStats] = useState({
    active_tickets: 0,
    upcoming_bookings: 0,
    total_donated: 0.0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const storedRole = localStorage.getItem("userRole");
      if (storedRole) setRole(storedRole.toUpperCase());
      
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${getApiBaseUrl()}/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleApplyMembership = async () => {
    setIsApplying(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/membership/apply?message=I would like to become a registered member.`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplicationStatus("success");
    } catch (error: any) {
      if (error.response?.data?.detail === "Membership request already pending.") {
        setApplicationStatus("pending");
      } else {
        alert("Error applying for membership. Please try again.");
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (role === "GUEST") {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Welcome to Agrawal Samaj Mansrovar Jaipur!</h1>
          <p className="text-sm text-zinc-500 mt-1">You are currently logged in as a Guest User.</p>
        </div>

        {applicationStatus === "success" || applicationStatus === "pending" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-12">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">Application Submitted</h2>
            <p className="text-emerald-700 mt-2">
              Your request to become a registered Samaj Member is currently under review by the administration. You will be notified once approved.
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-amber-500 to-rose-600 rounded-2xl p-8 sm:p-12 text-white relative overflow-hidden max-w-4xl mx-auto mt-12 shadow-xl">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-8 h-8 text-amber-200" />
                <h2 className="text-3xl font-bold">Unlock Full Features</h2>
              </div>
              <p className="text-amber-50 max-w-xl text-lg mb-8 leading-relaxed">
                Registered members get exclusive access to family management, members-only group chats, voting rights, and special discounts on Bhavan bookings and events.
              </p>
              
              <button 
                onClick={handleApplyMembership}
                disabled={isApplying}
                className="bg-white text-rose-600 hover:bg-zinc-50 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-75 disabled:hover:scale-100 disabled:active:scale-100"
              >
                {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Apply to be a Member"}
                {!isApplying && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Member Dashboard view
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Welcome back, Member!</h1>
        <p className="text-sm text-zinc-500 mt-1">Here's what's happening with your account today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        {[
          { icon: Ticket, value: stats.active_tickets, label: "Active Tickets", grad: "from-amber-500 to-orange-500", glow: "hover:shadow-amber-500/30" },
          { icon: Calendar, value: stats.upcoming_bookings, label: "Upcoming Bookings", grad: "from-rose-500 to-pink-500", glow: "hover:shadow-rose-500/30" },
          { icon: CreditCard, value: `₹${stats.total_donated.toFixed(2)}`, label: "Total Donations", grad: "from-emerald-500 to-teal-500", glow: "hover:shadow-emerald-500/30" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`group glass-panel p-6 rounded-[1.5rem] shadow-md hover:shadow-2xl ${card.glow} transition-shadow duration-300`}
          >
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.grad} flex items-center justify-center text-white shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
              <card.icon className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900">{card.value}</h3>
            <p className="text-sm font-medium text-zinc-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
            <h3 className="font-semibold text-zinc-900">Upcoming Events</h3>
          </div>
          <div className="p-6 text-center text-sm text-zinc-500">
            More dynamic events coming soon...
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
            <h3 className="font-semibold text-zinc-900">Recent Transactions</h3>
          </div>
          <div className="p-6 text-center text-sm text-zinc-500">
            Check your bookings and donations tabs for details.
          </div>
        </div>
      </div>
    </div>
  );
}
