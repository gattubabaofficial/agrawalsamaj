"use client";

import Link from "next/link";
import { 
  User, Users, Contact, Calendar, BookOpen, Heart, MessageCircle, ArrowRight, ShieldCheck 
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const NAV_CARDS = [
  {
    title: "Samaj Directory",
    desc: "Browse and search verified members of Agrawal Samaj Mansrovar Jaipur.",
    href: "/dashboard/members",
    icon: Contact,
    badge: "Directory",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "My Profile",
    desc: "Manage your personal information, privacy preferences, and member status.",
    href: "/dashboard/profile",
    icon: User,
    badge: "Account",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "My Family",
    desc: "View, create, or link your family tree and household members.",
    href: "/dashboard/family",
    icon: Users,
    badge: "Family",
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "My Events",
    desc: "View upcoming Samaj programs, celebrations, and your event passes.",
    href: "/dashboard/events",
    icon: Calendar,
    badge: "Events",
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "My Receipts",
    desc: "Access payment receipts for event registration passes and donations.",
    href: "/dashboard/receipts",
    icon: BookOpen,
    badge: "Financial",
    color: "from-purple-500 to-violet-600",
  },
  {
    title: "Donations",
    desc: "Contribute to Samaj welfare, education, and community initiatives.",
    href: "/dashboard/donations",
    icon: Heart,
    badge: "Contribution",
    color: "from-red-500 to-rose-600",
  },
  {
    title: "Group Chat",
    desc: "Connect with community members in dedicated location and interest groups.",
    href: "/dashboard/chat",
    icon: MessageCircle,
    badge: "Community",
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "My Blogs",
    desc: "Write articles, view your posts, and engage with community blogs.",
    href: "/dashboard/blog",
    icon: BookOpen,
    badge: "Articles",
    color: "from-amber-600 to-yellow-600",
  },
];

export default function UserDashboard() {
  const [role, setRole] = useState<string>("GUEST");

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) setRole(storedRole.toUpperCase());
  }, []);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-100 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" /> Welcome to Samaj Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Portal Sections &amp; Quick Access
          </h1>
          <p className="text-amber-100 text-sm sm:text-base leading-relaxed">
            Select any card below to navigate directly to your account services, Samaj directory, events, or community features.
          </p>
        </div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {NAV_CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={card.href}
              className="group block h-full bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-full">
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center text-xs font-bold text-amber-600 group-hover:text-amber-700">
                Open Section <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
