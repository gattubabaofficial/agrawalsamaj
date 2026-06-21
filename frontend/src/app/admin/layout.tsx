"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Calendar, Home, Settings, LogOut, UserPlus, Component } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (!token || role !== "ADMIN") {
      router.push("/admin-login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    router.push("/admin-login");
  };

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Membership Requests", href: "/admin/requests", icon: UserPlus },
    { name: "Families Directory", href: "/admin/families", icon: Component },
    { name: "Members", href: "/admin/members", icon: Users },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Bookings", href: "/admin/bookings", icon: Home },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 text-white flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
            Agrawal Samaj
          </Link>
        </div>
        <div className="px-6 py-4">
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Admin Panel</span>
        </div>
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-amber-500" : "text-zinc-500"}`} />
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-zinc-900 leading-none">Administrator</p>
                <p className="text-xs text-zinc-500 mt-1 leading-none">admin@gmail.com</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-2"
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
