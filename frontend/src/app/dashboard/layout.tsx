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
  Component,
  Shield,
  ChevronDown,
  ChevronRight,
  Settings,
  Contact,
  BookOpen
} from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    // Hard redirect so no stale client state survives the transition.
    window.location.href = "/login";
  };

  const rawRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : "GUEST";
  const role = rawRole ? rawRole.toUpperCase() : "GUEST";
  const displayRole = role.charAt(0) + role.slice(1).toLowerCase();

  const [isManagementOpen, setIsManagementOpen] = useState(pathname.startsWith("/admin") || pathname.startsWith("/dashboard"));

  const generalItems = [
    { name: "My Profile", href: "/dashboard/profile", icon: User },
    { name: "My Family", href: "/dashboard/family", icon: Users },
    { name: "Members Directory", href: "/dashboard/members", icon: Contact },
    { name: "Users Directory", href: "/dashboard/users", icon: Users },
    { name: "My Events", href: "/dashboard/events", icon: Calendar },
    { name: "My Bookings", href: "/dashboard/bookings", icon: Home },
    { name: "My Receipts", href: "/dashboard/receipts", icon: BookOpen },
    { name: "Donations", href: "/dashboard/donations", icon: Heart },
    { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
    { name: "My Blogs", href: "/dashboard/blog", icon: BookOpen },
  ];

  const managementItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Membership Requests", href: "/admin/requests", icon: UserPlus },
    { name: "Families Directory", href: "/admin/families", icon: Component },
    { name: "Members Directory", href: "/admin/members", icon: Contact },
    { name: "Users Directory", href: "/admin/users", icon: Users },
    { name: "Events Management", href: "/admin/events", icon: Calendar },
    { name: "Bhavan Bookings", href: "/admin/bookings", icon: Home },
    { name: "Donations Management", href: "/admin/donations", icon: Heart },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const filteredGeneralItems = generalItems.filter(item => {
    if (item.href === "/dashboard/family" || item.href === "/dashboard/blog") {
      return role === "MEMBER" || role === "ADMIN";
    }
    return true;
  });

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`w-full md:w-64 flex-shrink-0 flex flex-col justify-between overflow-y-auto md:sticky md:top-0 md:h-screen border-r scrollbar-hide ${
        role === "ADMIN" ? "bg-zinc-900 text-white border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div>
          <div className={`h-16 flex items-center px-6 border-b ${
            role === "ADMIN" ? "border-zinc-800" : "border-zinc-200"
          }`}>
            <Link href="/" className={`text-xl font-bold ${
              role === "ADMIN" 
                ? "bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent" 
                : "bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent"
            }`}>
              Agrawal Samaj
            </Link>
          </div>
          
          <nav className="p-3 space-y-1">
            {/* Management Dropdown Menu for Admin */}
            {role === "ADMIN" && (
              <div>
                <button
                  onClick={() => setIsManagementOpen(!isManagementOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
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
                  <div className="mt-1 ml-4 pl-3 border-l border-zinc-800 space-y-0.5">
                    {managementItems.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-amber-500/10 text-amber-500 font-semibold"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? role === "ADMIN"
                        ? "bg-amber-500/10 text-amber-500 font-semibold"
                        : "bg-amber-55 text-amber-600 font-semibold"
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
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-end px-6 flex-shrink-0 sticky top-0 z-10">
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
