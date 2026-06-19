"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

import { getApiUrl } from "../config";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      // We can do a quick check to set user name if we want, or just show Dashboard
      const fetchUser = async () => {
        try {
          const res = await fetch(getApiUrl("/api/v1/auth/me"), {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUserName(data.first_name || "User");
          } else {
            localStorage.removeItem("token");
            setIsLoggedIn(false);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchUser();
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Events", href: "/events" },
    { name: "Bhavan Booking", href: "/bhavan" },
    { name: "Donation", href: "/donations" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bhagwa flex items-center justify-center text-white font-bold shadow-md shadow-bhagwa/10">
            AS
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-black">अग्रवाल समाज</h1>
            <p className="text-xs text-muted-text font-medium">Agrawal Samaj Portal</p>
          </div>
        </Link>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`${
              isActive(item.href)
                ? "text-bhagwa font-bold border-b-2 border-bhagwa pb-0.5"
                : "text-black hover:text-bhagwa transition-colors"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Auth CTAs & Mobile toggle */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 border border-light-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all text-black"
              >
                <LayoutDashboard className="w-4 h-4 text-bhagwa" />
                {userName ? `${userName}'s Dashboard` : 'Dashboard'}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 border border-light-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all text-black"
              >
                <LogIn className="w-4 h-4 text-muted-text" />
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-2 bg-bhagwa hover:bg-bhagwa-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-bhagwa/10"
              >
                <UserPlus className="w-4 h-4" />
                Join Samaj
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-black"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="absolute top-[73px] left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl z-50 md:hidden animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3 font-semibold text-sm">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-lg ${
                  isActive(item.href)
                    ? "bg-orange-50 text-bhagwa font-bold"
                    : "text-black hover:bg-gray-50 transition-colors"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="h-px bg-gray-100 my-2" />
          <div className="flex flex-col gap-2.5">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-bhagwa hover:bg-bhagwa-hover text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-bhagwa/10"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-semibold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 border border-light-border py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all text-black"
                >
                  <LogIn className="w-4 h-4 text-muted-text" />
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-bhagwa hover:bg-bhagwa-hover text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-bhagwa/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Join Samaj
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
