import Link from "next/link";
import { MapPin, PhoneCall } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-900 text-gray-300 px-6 py-16">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        {/* Logo & Info */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bhagwa flex items-center justify-center text-white font-bold">
              AS
            </div>
            <h5 className="font-extrabold text-white text-md">Agrawal Samaj Portal</h5>
          </div>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed font-medium">
            Digitizing and uniting the community ecosystem, from registrations to bookings and chat platforms.
          </p>
        </div>

        {/* Office details */}
        <div className="flex flex-col gap-4 text-sm">
          <h6 className="font-bold text-white uppercase tracking-wider text-xs">Samaj Headquarters</h6>
          <div className="flex items-start gap-2.5 text-gray-400">
            <MapPin className="w-5 h-5 text-bhagwa shrink-0 mt-0.5" />
            <p className="font-medium">Agrawal Samaj Bhavan, Patrakar Colony Road, Mansarovar, Jaipur, Rajasthan - 302020</p>
          </div>
          <div className="flex items-center gap-2.5 text-gray-400">
            <PhoneCall className="w-4 h-4 text-bhagwa shrink-0" />
            <p className="font-medium">+91 98765 43210 / +91 141 234567</p>
          </div>
        </div>

        {/* Helpful Links */}
        <div className="flex flex-col gap-4 text-sm">
          <h6 className="font-bold text-white uppercase tracking-wider text-xs">Quick Links</h6>
          <div className="grid grid-cols-2 gap-2 text-gray-400 font-medium">
            <Link href="/about" className="hover:text-white transition-colors">About History</Link>
            <Link href="/bhavan" className="hover:text-white transition-colors">Room Tariffs</Link>
            <Link href="/events" className="hover:text-white transition-colors">Schedules</Link>
            <Link href="/donations" className="hover:text-white transition-colors">Sponsorships</Link>
            <Link href="/login" className="hover:text-white transition-colors">Member Portal</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Help Desk</Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <p>© {new Date().getFullYear()} Agrawal Samaj Community Board. All Rights Reserved.</p>
        <div className="flex gap-6 font-medium">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms & Conditions</a>
          <a href="#" className="hover:underline">Refund Policy</a>
        </div>
      </div>
    </footer>
  );
}
