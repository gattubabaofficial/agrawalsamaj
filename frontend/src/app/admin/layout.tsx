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
  Shield,
  ChevronDown,
  ChevronRight,
  Contact,
  BookOpen,
  QrCode,
  Ticket,
  CalendarRange,
  Menu,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [role, setRole] = useState<string>("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(
    pathname.startsWith("/admin") &&
    !["/admin/profile", "/admin/family", "/admin/my-events", "/admin/my-bookings", "/admin/my-donations", "/admin/chat"].includes(pathname)
  );

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("userRole");
    setRole((storedRole || "").toUpperCase());

    const r = storedRole?.toUpperCase();
    if (!token || (r !== "ADMIN" && r !== "SUPER_ADMIN" && r !== "VOLUNTEER")) {
      router.push("/admin-login");
    } else if (r === "VOLUNTEER" && pathname === "/admin/dashboard") {
      router.push("/admin/scan");
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

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    // Hard redirect (not router.push) so the admin layout and its
    // mounted-role state can't survive the transition and bounce back.
    window.location.href = "/admin-login";
  };

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";
  const isVolunteer = role === "VOLUNTEER";

  const generalItems = [
    { name: "My Profile", href: "/admin/profile", icon: User },
    ...(isSuperAdmin || isAdmin ? [{ name: "My Performance", href: "/admin/performance", icon: Shield }] : []),
    { name: "My Family", href: "/admin/family", icon: Users },
    { name: "My Events", href: "/admin/my-events", icon: Calendar },
    { name: "My Bookings", href: "/admin/my-bookings", icon: Home },
    { name: "Donations", href: "/admin/my-donations", icon: Heart },
    { name: "Chat", href: "/admin/chat", icon: MessageCircle },
  ];

  const managementItems = [
    ...(isSuperAdmin || isAdmin ? [{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] : []),
    ...(isSuperAdmin ? [{ name: "Admin Management", href: "/admin/admins", icon: Shield }] : []),
    ...(isSuperAdmin || isAdmin ? [
      { name: "Membership Requests", href: "/admin/requests", icon: UserPlus },
      { name: "Members Directory", href: "/admin/members", icon: Contact },
      { name: "Events Management", href: "/admin/events", icon: Calendar },
    ] : []),
    { name: "Pass Verification", href: "/admin/scan", icon: QrCode },
    ...(isSuperAdmin || isAdmin ? [
      { name: "Bhavan Bookings", href: "/admin/bookings", icon: Home },
      { name: "Room Pricing & Rules", href: "/admin/pricing", icon: Settings },
      { name: "Special Events", href: "/admin/special-events", icon: CalendarRange },
      { name: "Vouchers", href: "/admin/vouchers", icon: Ticket },
      { name: "Donations Management", href: "/admin/donations", icon: Heart },
      { name: "Receipts", href: "/admin/receipts", icon: BookOpen },
      { name: "Blog Management", href: "/admin/blog", icon: BookOpen },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ] : [])
  ];

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
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 -translate-x-full transition-transform duration-200 ${isMobileNavOpen ? "translate-x-0" : ""} md:translate-x-0 md:static md:w-64 bg-zinc-900 text-white flex-shrink-0 flex flex-col justify-between overflow-y-auto md:sticky md:top-0 md:h-screen border-r border-zinc-800 scrollbar-hide`}>
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
              Agrawal Samaj
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:translate-x-0.5 ${
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
