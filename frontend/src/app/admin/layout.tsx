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
  Settings, 
  LogOut, 
  UserPlus, 
  Component,
  Shield,
  ChevronDown,
  ChevronRight,
  Contact,
  BookOpen
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(
    pathname.startsWith("/admin") &&
    !["/admin/profile", "/admin/family", "/admin/my-events", "/admin/my-bookings", "/admin/my-donations", "/admin/chat"].includes(pathname)
  );

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (!token || role?.toUpperCase() !== "ADMIN") {
      router.push("/admin-login");
    }
  }, [router]);

  useEffect(() => {
    const isGeneral = ["/admin/profile", "/admin/family", "/admin/my-events", "/admin/my-bookings", "/admin/my-donations", "/admin/chat"].includes(pathname);
    if (isGeneral) {
      setIsManagementOpen(false);
    } else if (pathname.startsWith("/admin")) {
      setIsManagementOpen(true);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    router.push("/admin-login");
  };

  const generalItems = [
    { name: "My Profile", href: "/admin/profile", icon: User },
    { name: "My Family", href: "/admin/family", icon: Users },
    { name: "My Events", href: "/admin/my-events", icon: Calendar },
    { name: "My Bookings", href: "/admin/my-bookings", icon: Home },
    { name: "Donations", href: "/admin/my-donations", icon: Heart },
    { name: "Chat", href: "/admin/chat", icon: MessageCircle },
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
    { name: "Blog Management", href: "/admin/blog", icon: BookOpen },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 text-white flex-shrink-0 flex flex-col justify-between overflow-y-auto md:sticky md:top-0 md:h-screen border-r border-zinc-800 scrollbar-hide">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-zinc-800">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
              Agrawal Samaj
            </Link>
          </div>
          
          <nav className="p-3 space-y-1">
            {/* Management Dropdown Menu */}
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

            {/* General Portal items listed directly */}
            {generalItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-amber-500/10 text-amber-500 font-semibold"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
