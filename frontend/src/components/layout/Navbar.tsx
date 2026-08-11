"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Heart, Calendar, Building, Info, Home,
  BookOpen, LayoutDashboard, LogOut, User, QrCode, Users, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBaseUrl } from "@/utils/api";
import { EASE } from "@/components/ui/motion";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "About", href: "/about", icon: Info },
  { name: "History", href: "/history", icon: History },
  { name: "Directory", href: "/members", icon: Users },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Blog", href: "/blog", icon: BookOpen },
  { name: "Donate", href: "/donate", icon: Heart },
];

interface AuthUser {
  name: string;
  role: string;
  initial: string;
}

export default function Navbar() {
  const pathname = usePathname();
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

  // Lock the page while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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
      // Padding stays fixed. A nav that resizes on scroll is in normal flow,
      // so it shifts every section below it mid-scroll — which shows up as
      // jitter and quietly corrupts the hero's scroll-progress maths.
      className={`sticky top-0 z-50 py-4 transition-colors duration-500 ${
        scrolled
          ? "border-b border-rule bg-paper/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[78rem] px-5 sm:px-8 lg:px-12">
        <div className="flex h-11 items-center justify-between gap-8">
          {/* Wordmark */}
          <Link href="/" className="group flex shrink-0 flex-col leading-none">
            <span className="display text-xl tracking-[-0.01em] text-ink sm:text-[1.375rem]">
              Agrawal Samaj Mansrovar Jaipur
            </span>
            <span className="deva mt-0.5 text-[0.625rem] tracking-wide text-vermilion transition-opacity duration-300 group-hover:opacity-70">
              अग्रवाल समाज · जयपुर
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive}
                  className={`rule-grow pb-1 text-[0.6875rem] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${
                    isActive ? "text-ink" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right — auth aware */}
          <div className="hidden shrink-0 items-center gap-4 lg:flex">
            {!authChecked ? (
              <div className="h-8 w-20 animate-pulse bg-paper-2" />
            ) : authUser ? (
              <div className="flex items-center gap-3">
                {isVolunteer && (
                  <Link
                    href="/admin/scan"
                    className="inline-flex items-center gap-2 border border-rule-strong px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink"
                  >
                    <QrCode className="h-3.5 w-3.5" /> Scan
                  </Link>
                )}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label="Account menu"
                    aria-expanded={userMenuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-strong text-[0.8125rem] font-medium text-ink transition-colors hover:border-vermilion hover:text-vermilion"
                  >
                    {authUser.initial}
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 z-50 mt-3 w-60 border border-rule bg-paper shadow-[0_18px_50px_-24px_rgba(22,17,14,0.4)]"
                      >
                        <div className="border-b border-rule px-4 py-3.5">
                          <p className="truncate text-sm font-medium text-ink">{authUser.name}</p>
                          <p className="eyebrow mt-1 !tracking-[0.18em]">{authUser.role.replace("_", " ")}</p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href={getDashboardHref()}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                          >
                            <LayoutDashboard className="h-4 w-4" /> {isVolunteer ? "Scan tickets" : "Dashboard"}
                          </Link>
                          <Link
                            href={authUser.role === "admin" || authUser.role === "super_admin" || authUser.role === "volunteer" ? "/admin/profile" : "/dashboard/profile"}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                          >
                            <User className="h-4 w-4" /> My profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 border-t border-rule px-3 py-2.5 text-sm text-vermilion transition-colors hover:bg-paper-2"
                          >
                            <LogOut className="h-4 w-4" /> Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mobile trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            {authChecked && authUser && (
              <Link
                href={getDashboardHref()}
                aria-label="Dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-strong text-[0.8125rem] font-medium text-ink"
              >
                {authUser.initial}
              </Link>
            )}
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
              className="p-2 text-ink"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet — full field, items cascade in */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-100 flex flex-col bg-paper lg:hidden"
          >
            <div className="flex items-center justify-between px-5 py-5 sm:px-8">
              <span className="deva text-sm text-vermilion">अग्रवाल समाज</span>
              <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="p-2 text-ink">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto px-5 pb-10 sm:px-8">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.06 + i * 0.045, ease: EASE }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-baseline justify-between border-b border-rule py-4"
                  >
                    <span className={`display text-3xl ${pathname === item.href ? "text-vermilion" : "text-ink"}`}>
                      {item.name}
                    </span>
                    <item.icon className="h-4 w-4 text-ink-3" />
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                className="mt-8 flex flex-col gap-3"
              >
                {authUser ? (
                  <>
                    <Link
                      href={getDashboardHref()}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 bg-vermilion px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-paper"
                    >
                      {isVolunteer ? <QrCode className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                      {isVolunteer ? "Scan tickets" : "Dashboard"}
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="flex items-center justify-center gap-2 border border-rule-strong px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-ink"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
