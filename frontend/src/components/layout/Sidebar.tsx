"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, User, Users, Calendar, Building, Heart, 
  MessageSquare, Bell, Shield, ChevronLeft, ChevronRight, LogOut 
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const baseLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Profile", href: "/dashboard/profile", icon: User },
    { name: "Family Tree", href: "/dashboard/family", icon: Users },
    { name: "My Bookings", href: "/dashboard/bookings", icon: Building },
    { name: "My Registrations", href: "/dashboard/events", icon: Calendar },
    { name: "My Donations", href: "/dashboard/donations", icon: Heart },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  const adminLinks = [
    { name: "Admin Panel", href: "/admin", icon: Shield },
    { name: "Member Directory", href: "/admin/members", icon: Users },
    { name: "Manage Bookings", href: "/admin/bookings", icon: Building },
    { name: "Manage Events", href: "/admin/events", icon: Calendar },
    { name: "Manage Donations", href: "/admin/donations", icon: Heart },
  ];

  const links = isAdmin ? adminLinks : baseLinks;

  return (
    <div
      className={`relative flex flex-col h-full bg-zinc-50 border-r border-zinc-200/50 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-10 p-1.5 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 shadow-sm transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand area */}
      <div className="p-6 flex items-center justify-between border-b border-zinc-200/50">
        <Link href="/" className="flex items-center gap-2 group overflow-hidden">
          <span className="text-xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent flex-shrink-0">
            {collapsed ? "AS" : "Agrawal Samaj"}
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative ${
                isActive
                  ? "bg-amber-500/10 text-amber-600"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <link.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-amber-600" : ""}`} />
              
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {link.name}
                </motion.span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md whitespace-nowrap z-50">
                  {link.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Area with Sign Out */}
      <div className="p-4 border-t border-zinc-200/50">
        <button
          onClick={() => {
            // Add logout functionality
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors group relative"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
          {collapsed && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md whitespace-nowrap z-50">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
