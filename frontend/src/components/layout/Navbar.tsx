"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Heart, Calendar, Building, Info, Home,
  BookOpen, LayoutDashboard, LogOut, User, ChevronDown, Shield, QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBaseUrl } from "@/utils/api";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "About Us", href: "/about", icon: Info },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Blog", href: "/blog", icon: BookOpen },
  { name: "Bhavan Booking", href: "/bhavan", icon: Building },
  { name: "Donations", href: "/donate", icon: Heart },
];

interface AuthUser {
  name: string;
  role: string;
  initial: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auth check — runs on every page navigation
  useEffect(() => {
    checkAuth();
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAuthUser(null);
      setAuthChecked(true);
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAuthUser({
          name: `${data.first_name} ${data.surname}`,
          role: data.role,
          initial: data.first_name?.[0]?.toUpperCase() || "U",
        });
        // Keep role in sync
        localStorage.setItem("userRole", data.role);
      } else {
        // Token expired or invalid — clear session
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        setAuthUser(null);
      }
    } catch {
      // Network error — keep existing state, don't clear
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setAuthUser(null);
    setUserMenuOpen(false);
    // Hard redirect so any admin/dashboard layout further up the history
    // stack can't bounce the user back in with stale client state.
    window.location.href = "/";
  };

  const getDashboardHref = () => {
    if (authUser?.role === "admin" || authUser?.role === "super_admin") return "/admin/dashboard";
    if (authUser?.role === "volunteer") return "/admin/scan";
    return "/dashboard";
  };

  const isVolunteer = authUser?.role === "volunteer";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-lg border-b border-zinc-200/50 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                Agrawal Samaj
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Portal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    isActive
                      ? "text-amber-600"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 bg-amber-500/10 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right — Auth-aware buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!authChecked ? (
              // Skeleton while checking auth
              <div className="w-24 h-8 rounded-full bg-zinc-100 animate-pulse" />
            ) : authUser ? (
              // LOGGED IN STATE
              <div className="flex items-center gap-2">
                {isVolunteer && (
                  <Link
                    href="/admin/scan"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-colors"
                  >
                    <QrCode className="w-4 h-4" /> Scan Tickets
                  </Link>
                )}
                {/* User avatar menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center rounded-full border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all p-0.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {authUser.initial}
                    </div>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-50"
                      >
                        {/* User info header */}
                        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{authUser.name}</p>
                          <p className="text-xs text-zinc-400 capitalize">{authUser.role}</p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href={getDashboardHref()}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" /> {isVolunteer ? "Scan Tickets" : "Dashboard"}
                          </Link>
                          <Link
                            href={authUser.role === "admin" || authUser.role === "super_admin" || authUser.role === "volunteer" ? "/admin/profile" : "/dashboard/profile"}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          >
                            <User className="w-4 h-4" /> My Profile
                          </Link>
                          <div className="border-t border-zinc-100 my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {authChecked && authUser && (
              <Link href={getDashboardHref()} className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white text-sm font-bold">
                {authUser.initial}
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 focus:outline-none transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-200/50 bg-white/95 backdrop-blur-md"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? "bg-amber-500/10 text-amber-600"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}

              <div className="border-t border-zinc-200/50 pt-4 flex flex-col gap-2 px-2">
                {authUser ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white font-bold">
                        {authUser.initial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{authUser.name}</p>
                        <p className="text-xs text-zinc-400 capitalize">{authUser.role}</p>
                      </div>
                    </div>
                    <Link
                      href={getDashboardHref()}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-base ${isVolunteer ? "bg-sky-500" : "bg-amber-500"}`}
                    >
                      {isVolunteer ? <QrCode className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                      {isVolunteer ? "Scan Tickets" : "Go to Dashboard"}
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-medium text-base hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
