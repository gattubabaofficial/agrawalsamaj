"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, Calendar, Home, Heart, LogOut, Users, MessageCircle } from "lucide-react";
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
    router.push("/login");
  };

  const rawRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : "GUEST";
  const role = rawRole ? rawRole.toUpperCase() : "GUEST";
  const displayRole = role.charAt(0) + role.slice(1).toLowerCase();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["GUEST", "MEMBER", "ADMIN"] },
    { name: "My Profile", href: "/dashboard/profile", icon: User, roles: ["GUEST", "MEMBER", "ADMIN"] },
    { name: "My Family", href: "/dashboard/family", icon: Users, roles: ["MEMBER", "ADMIN"] },
    { name: "My Events", href: "/dashboard/events", icon: Calendar, roles: ["GUEST", "MEMBER", "ADMIN"] },
    { name: "My Bookings", href: "/dashboard/bookings", icon: Home, roles: ["GUEST", "MEMBER", "ADMIN"] },
    { name: "Donations", href: "/dashboard/donations", icon: Heart, roles: ["GUEST", "MEMBER", "ADMIN"] },
    { name: "Group Chats", href: "/dashboard/chat", icon: MessageCircle, roles: ["MEMBER", "ADMIN"] },
  ];

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-zinc-200 flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent">
            Agrawal Samaj
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.filter(item => item.roles.includes(role)).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-50 text-amber-600"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-amber-500" : "text-zinc-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-end px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold text-sm">
                {displayRole.charAt(0)}
              </div>
              <span className="text-sm font-medium text-zinc-700 hidden sm:block">{displayRole}</span>
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
