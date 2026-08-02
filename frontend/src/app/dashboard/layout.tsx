"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Users,
  Calendar,
  Home,
  Heart,
  MessageCircle,
  LogOut,
  UserPlus,
  Shield,
  ChevronDown,
  ChevronRight,
  Settings,
  Contact,
  BookOpen,
  Menu,
  X,
  QrCode,
  CalendarRange,
  Ticket
} from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customRoleName, setCustomRoleName] = useState<string>("");

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    router.push("/admin/dashboard");
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    // Hard redirect so no stale client state survives the transition.
    window.location.href = "/login";
  };

  const rawRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : "GUEST";
  const role = rawRole ? rawRole.toUpperCase() : "GUEST";
  const displayRole = customRoleName || (role.charAt(0) + role.slice(1).toLowerCase());

  const [isManagementOpen, setIsManagementOpen] = useState(pathname.startsWith("/admin") || pathname.startsWith("/dashboard"));

  const generalItems = [
    { name: "My Profile", href: "/dashboard/profile", icon: User },
    { name: "My Family", href: "/dashboard/family", icon: Users },
    { name: "Members Directory", href: "/dashboard/members", icon: Contact },
    { name: "My Events", href: "/dashboard/events", icon: Calendar },
    { name: "My Bookings", href: "/dashboard/bookings", icon: Home },
    { name: "My Receipts", href: "/dashboard/receipts", icon: BookOpen },
    { name: "Donations", href: "/dashboard/donations", icon: Heart },
    { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
    { name: "My Blogs", href: "/dashboard/blog", icon: BookOpen },
  ];

  const managementItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, perm: "any" },
    { name: "Membership Requests", href: "/admin/requests", icon: UserPlus, perm: "manage_members" },
    { name: "Members Directory", href: "/admin/members", icon: Contact, perm: "manage_members" },
    { name: "Events Management", href: "/admin/events", icon: Calendar, perm: "manage_events" },
    { name: "Pass Verification", href: "/admin/scan", icon: QrCode, perm: "scan_passes" },
    { name: "Bhavan Bookings", href: "/admin/bookings", icon: Home, perm: "manage_bhavan" },
    { name: "Room Pricing & Rules", href: "/admin/pricing", icon: Settings, perm: "manage_bhavan" },
    { name: "Special Events", href: "/admin/special-events", icon: CalendarRange, perm: "manage_bhavan" },
    { name: "Vouchers", href: "/admin/vouchers", icon: Ticket, perm: "manage_bhavan" },
    { name: "Donations Management", href: "/admin/donations", icon: Heart, perm: "manage_donations" },
    { name: "Receipts", href: "/admin/receipts", icon: BookOpen, perm: "manage_bhavan" },
    { name: "Blog Management", href: "/admin/blog", icon: BookOpen, perm: "manage_blogs" },
    { name: "Settings", href: "/admin/settings", icon: Settings, perm: "manage_settings" },
  ];

  const allowedManagementItems = managementItems.filter(item => {
    if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
    if (item.perm === "any") return permissions.length > 0;
    return permissions.includes(item.perm);
  });

  const filteredGeneralItems = generalItems.filter(item => {
    if (item.href === "/dashboard/family" || item.href === "/dashboard/blog") {
      return role === "MEMBER" || role === "ADMIN" || permissions.length > 0;
    }
    return true;
  });

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile nav backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 -translate-x-full transition-transform duration-200 ${isMobileNavOpen ? "translate-x-0" : ""} md:translate-x-0 md:static md:w-64 flex-shrink-0 flex flex-col justify-between overflow-y-auto md:sticky md:top-0 md:h-screen border-r scrollbar-hide ${
        role === "ADMIN" ? "bg-zinc-900 text-white border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div>
          <div className={`h-16 flex items-center justify-between px-6 border-b ${
            role === "ADMIN" ? "border-zinc-800" : "border-zinc-200"
          }`}>
            <Link href="/" className="text-xl font-bold text-gradient-vivid">
              Agrawal Samaj Mansrovar Jaipur
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className={`p-1.5 rounded-lg md:hidden ${role === "ADMIN" ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"}`}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="p-3 space-y-1">
            {/* Management Dropdown Menu for Admin and Custom Roles */}
            {(role === "ADMIN" || allowedManagementItems.length > 0) && (
              <div>
                <button
                  onClick={() => setIsManagementOpen(!isManagementOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    role === "ADMIN" ? "text-zinc-300 hover:bg-zinc-800 hover:text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>Management</span>
                  </div>
                  {isManagementOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
                
                {/* Sub-menu Items */}
                {isManagementOpen && (
                  <div className={`mt-1 ml-4 pl-3 border-l space-y-0.5 ${role === "ADMIN" ? "border-zinc-800" : "border-zinc-200"}`}>
                    {allowedManagementItems.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-amber-500/10 text-amber-500 font-semibold"
                              : role === "ADMIN"
                                ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                        >
                          <item.icon className={`w-4 h-4 ${isActive ? "text-amber-500" : "text-zinc-500"}`} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}


            {/* General Portal items listed directly */}
            {filteredGeneralItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:translate-x-0.5 ${
                    isActive
                      ? role === "ADMIN"
                        ? "bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-400 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-gradient-to-r from-amber-500/15 to-rose-500/15 text-amber-600 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : role === "ADMIN"
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <item.icon className="w-5 h-5 text-amber-500" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 sticky top-0 z-10">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                role === "ADMIN" ? "bg-gradient-to-br from-indigo-500 to-purple-500" : "bg-gradient-to-br from-amber-400 to-rose-400"
              }`}>
                {role === "ADMIN" ? "A" : displayRole.charAt(0)}
              </div>
              <span className="text-sm font-medium text-zinc-700 hidden sm:block">
                {role === "ADMIN" ? "Administrator" : displayRole}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
