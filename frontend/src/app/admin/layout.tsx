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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customRoleName, setCustomRoleName] = useState<string>("");
  const [loadingMe, setLoadingMe] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("userRole");
    setRole((storedRole || "").toUpperCase());

    if (!token) {
      router.push("/admin-login");
      return;
    }

    const fetchMe = async () => {
      try {
        const { getApiBaseUrl } = await import("@/utils/api");
        const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const p = data.custom_role?.permissions || [];
          setPermissions(p);
          setCustomRoleName(data.custom_role?.name || "");
          setUserName(`${data.first_name} ${data.surname || ""}`);
          
          const r = (storedRole || "").toUpperCase();
          const isAllowedRole = ["ADMIN", "SUPER_ADMIN", "VOLUNTEER"].includes(r);
          const hasCustomRole = data.custom_role && p.length > 0;
          
          if (!isAllowedRole && !hasCustomRole) {
            router.push("/admin-login");
          } else if (r === "VOLUNTEER" && pathname === "/admin/dashboard" && !hasCustomRole) {
            router.push("/admin/scan");
          }
        } else {
          router.push("/admin-login");
        }
      } catch (err) {
        console.error("Error fetching me profile in admin:", err);
        router.push("/admin-login");
      } finally {
        setLoadingMe(false);
      }
    };
    fetchMe();
  }, [router, pathname]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "/admin-login";
  };

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";
  const isVolunteer = role === "VOLUNTEER";

  const hasPermission = (perm: string) => {
    if (isSuperAdmin || isAdmin) return true;
    return permissions.includes(perm);
  };

  const managementItems = [
    ...((isSuperAdmin || isAdmin || permissions.length > 0) ? [{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, description: "Overview of the Samaj's activity" }] : []),
    ...(isSuperAdmin ? [{ name: "Admin Management", href: "/admin/admins", icon: Shield, description: "Add, edit, or remove admin accounts" }] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_members")) ? [
      { name: "Directory Requests", href: "/admin/requests", icon: UserPlus, description: "Review pending member directory requests" },
      { name: "Manage Directory", href: "/admin/members", icon: Contact, description: "Edit and manage the member directory" },
    ] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_events")) ? [
      { name: "Events Management", href: "/admin/events", icon: Calendar, description: "Create and manage Samaj events" },
    ] : []),
    ...((isSuperAdmin || isAdmin || isVolunteer || hasPermission("scan_passes")) ? [
      { name: "Pass Verification", href: "/admin/scan", icon: QrCode, description: "Scan attendee QR passes at the door" },
    ] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_donations")) ? [
      { name: "Donations Management", href: "/admin/donations", icon: Heart, description: "Track and manage donations" },
    ] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_bhavan")) ? [
      { name: "Bhavan Booking", href: "/admin/bhavan", icon: Home, description: "Manage Agrasen Bhawan bookings" },
      { name: "Receipts", href: "/admin/receipts", icon: BookOpen, description: "View and issue payment receipts" },
    ] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_blogs")) ? [
      { name: "Blog Management", href: "/admin/blog", icon: BookOpen, description: "Write and manage blog posts" },
    ] : []),
    ...((isSuperAdmin || isAdmin || hasPermission("manage_settings")) ? [
      { name: "Settings", href: "/admin/settings", icon: Settings, description: "Configure admin portal settings" },
    ] : [])
  ];

  if (!isClient || loadingMe) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-zinc-400" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" suppressHydrationWarning />
          <p className="text-xs uppercase tracking-wider font-semibold">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row" suppressHydrationWarning>
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 -translate-x-full transition-transform duration-200 ${isMobileNavOpen ? "translate-x-0" : ""} md:translate-x-0 md:static md:w-64 flex-shrink-0 flex flex-col justify-between overflow-y-auto md:sticky md:top-0 md:h-screen border-r border-zinc-800 bg-zinc-900 text-white scrollbar-hide`}>
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
            <Link href="/" title="Return to the home page" className="text-xl font-bold text-gradient-vivid">
              Agrawal Samaj Jaipur
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-1.5 rounded-lg md:hidden text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close menu"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="p-3 space-y-1">
            {managementItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.description}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:translate-x-0.5 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-400 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
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
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                {userName ? userName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-zinc-900 leading-none">{userName || "Administrator"}</p>
                <p className="text-[10px] text-zinc-400 mt-1 leading-none">{customRoleName || (isSuperAdmin ? "Super Admin" : "Administrator")}</p>
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
