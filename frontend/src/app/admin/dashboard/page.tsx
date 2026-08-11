"use client";

import Link from "next/link";
import { 
  UserPlus, Contact, Calendar, QrCode, Heart, BookOpen, Settings, Shield, ArrowRight, LayoutDashboard 
} from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_CARDS = [
  {
    title: "Directory Requests",
    desc: "Review, cross-check, and approve member registrations and profile edit applications.",
    href: "/admin/requests",
    icon: UserPlus,
    badge: "Applications",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Manage Directory",
    desc: "View verified Samaj members directory, edit member details, assign roles & status.",
    href: "/admin/members",
    icon: Contact,
    badge: "Directory",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Events Management",
    desc: "Create and publish Samaj events, manage registrations, ticket pricing, and schedules.",
    href: "/admin/events",
    icon: Calendar,
    badge: "Events",
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Pass Verification",
    desc: "Scan and verify QR codes on event entry passes for attendees.",
    href: "/admin/scan",
    icon: QrCode,
    badge: "Passes",
    color: "from-purple-500 to-violet-600",
  },
  {
    title: "Donations Management",
    desc: "Monitor financial contributions, view donor details, and export CSV reports.",
    href: "/admin/donations",
    icon: Heart,
    badge: "Donations",
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "Receipts",
    desc: "View and verify receipts generated for event registrations and donations.",
    href: "/admin/receipts",
    icon: BookOpen,
    badge: "Billing",
    color: "from-red-500 to-rose-600",
  },
  {
    title: "Blog Management",
    desc: "Moderate, edit, publish, or delete community blog posts.",
    href: "/admin/blog",
    icon: BookOpen,
    badge: "Articles",
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "Settings & Custom Roles",
    desc: "Configure site settings, custom admin roles, and permission capabilities.",
    href: "/admin/settings",
    icon: Settings,
    badge: "Settings",
    color: "from-zinc-700 to-zinc-900",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header Banner */}
      <div className="bg-zinc-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-zinc-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30">
            <Shield className="w-4 h-4" /> Admin Portal Management
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Manage Directory &amp; Portal Modules
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Select any management card below to access administrative modules, approve directory requests, or manage events and communications.
          </p>
        </div>
      </div>

      {/* Admin Navigation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ADMIN_CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={card.href}
              className="group block h-full bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
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
                Manage Section <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
