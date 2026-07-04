import Link from "next/link";
import { Heart, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-zinc-50 border-t border-zinc-200/50 text-zinc-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand/About */}
          <div className="space-y-4">
            <span className="text-xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
              Agrawal Samaj
            </span>
            <p className="text-sm leading-relaxed">
              Connecting and empowering the Agrawal Samaj community. Managing events, bhavan bookings, donations, and communication seamlessly.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-amber-500 transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-amber-500 transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-amber-500 transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a href="#" className="hover:text-amber-500 transition-colors" aria-label="Youtube">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/>
                  <polygon points="9.7 15 14.5 12 9.7 9 9.7 15"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-amber-500 transition-colors">Vision & Mission</Link></li>
              <li><Link href="/about" className="hover:text-amber-500 transition-colors">Board Members</Link></li>
              <li><Link href="/events" className="hover:text-amber-500 transition-colors">Upcoming Events</Link></li>
              <li><Link href="/bhavan" className="hover:text-amber-500 transition-colors">Bhavan Facilities</Link></li>
              <li><Link href="/donate" className="hover:text-amber-500 transition-colors">Donation Schemes</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-amber-500 transition-colors">Member Directory</Link></li>
              <li><Link href="/register" className="hover:text-amber-500 transition-colors">Join Samaj</Link></li>
              <li><Link href="/login" className="hover:text-amber-500 transition-colors">Bookings Dashboard</Link></li>
              <li><Link href="#" className="hover:text-amber-500 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2 items-start">
                <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>Agrawal Bhavan Marg, Sector 5, Vidyadhar Nagar, Jaipur, Rajasthan</span>
              </li>
              <li className="flex gap-2 items-center">
                <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>+91 141 2345678</span>
              </li>
              <li className="flex gap-2 items-center">
                <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>contact@agrawalsamajjaipur.org</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-200/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Agrawal Samaj Jaipur. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for the community.
          </p>
        </div>
      </div>
    </footer>
  );
}
