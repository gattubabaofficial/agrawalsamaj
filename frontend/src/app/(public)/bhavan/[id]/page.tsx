"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Calendar, Users, MapPin, ArrowLeft, CheckCircle, Clock, User, Phone, Ticket, X, Sparkles, PartyPopper, Ban, AlertTriangle, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatDateDDMonthYYYY } from "@/utils/date";
import Link from "next/link";
import PaymentGateway from "@/components/PaymentGateway";
import CustomDatePicker from "@/components/CustomDatePicker";

export default function RoomBookingPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Guest contact details (only asked when not logged in)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Date State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState<"none" | "pending_venue" | "verified">("none");
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string; discountAmount: number; finalAmount: number; forAmount: number;
  } | null>(null);

  // Event Purpose Selector (4 distinct categories)
  const [eventPurpose, setEventPurpose] = useState<string>("saava");
  // Agrawal Member Toggle
  const [isAgrawalMember, setIsAgrawalMember] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Backend-authoritative special-event / availability info for the selected dates.
  const [quoteInfo, setQuoteInfo] = useState<any>(null);

  // Calendar states
  const [occupancy, setOccupancy] = useState<Record<string, string>>({});
  const [saavaDates, setSaavaDates] = useState<string[]>([]);
  const [saavaCards, setSaavaCards] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth, currentYear);
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    if (token) {
      axios.get(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data) {
          setUserProfile(res.data);
          const fullName = [res.data.first_name, res.data.surname].filter(Boolean).join(" ");
          setGuestName(fullName || res.data.full_name || "");
          setGuestPhone(res.data.mobile || res.data.phone || "");
        }
      })
      .catch(() => {});
    }

    const fetchRoom = async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/bookings/rooms/${roomId}`);
        setRoom(res.data);
      } catch (err: any) {
        setError("Room not found or failed to load");
      } finally {
        setLoading(false);
      }
    };
    if (roomId) fetchRoom();

    // Fetch occupancy status
    axios.get(`${getApiBaseUrl()}/bookings/bhavan-occupancy`)
      .then(res => setOccupancy(res.data))
      .catch(() => {});

    // Fetch Saava dates & cards
    axios.get(`${getApiBaseUrl()}/bookings/saava-dates`)
      .then(res => {
        if (Array.isArray(res.data)) {
          if (res.data.length > 0 && typeof res.data[0] === "string") {
            setSaavaDates(res.data);
          } else {
            setSaavaCards(res.data);
            const allDates: string[] = [];
            res.data.forEach((card: any) => {
              if (card.dates && Array.isArray(card.dates)) {
                allDates.push(...card.dates);
              }
            });
            setSaavaDates(allDates);
          }
        }
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !startDate || !endDate) {
      setQuoteInfo(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      axios
        .post(`${getApiBaseUrl()}/bookings/rooms/${roomId}/quote`, { start_date: startDate, end_date: endDate })
        .then((res) => { if (!cancelled) setQuoteInfo(res.data); })
        .catch(() => { if (!cancelled) setQuoteInfo(null); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [roomId, startDate, endDate]);

  // Compute exact rate list breakdown according to selected Purpose Category
  const computeOfficialQuote = () => {
    if (!startDate || !endDate || !room) {
      return { days: 0, baseFixedRent: 0, purposeRent: 0, memberDiscount: 0, netRent: 0, cleaningCharge: 0, totalPayable: 0 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const roomName = (room.name || "").toLowerCase();

    // 1. Calculate Base Rent according to selected Purpose Category
    let baseFixedRent = 0;

    if (eventPurpose === "free") {
      baseFixedRent = 0; // Complimentary Free / Welfare
    } else if (eventPurpose === "social") {
      // Social Functions: Discounted slab
      if (roomName.includes("first unit") || roomName.includes("ground floor")) {
        baseFixedRent = days === 1 ? 8000 : days === 2 ? 14000 : 20000;
      } else if (roomName.includes("second unit") || roomName.includes("first floor")) {
        baseFixedRent = days === 1 ? 7000 : days === 2 ? 12000 : 16000;
      } else if (roomName.includes("third unit") || roomName.includes("basement")) {
        baseFixedRent = days === 1 ? 2500 : days === 2 ? 4500 : 6500;
      } else if (roomName.includes("ac room")) {
        baseFixedRent = days * 450;
      } else {
        baseFixedRent = days * 300;
      }
    } else if (eventPurpose === "other_days") {
      // Other Days (Regular non-saava)
      if (roomName.includes("first unit") || roomName.includes("ground floor")) {
        baseFixedRent = days === 1 ? 12000 : days === 2 ? 20000 : 28000;
      } else if (roomName.includes("second unit") || roomName.includes("first floor")) {
        baseFixedRent = days === 1 ? 11000 : days === 2 ? 18000 : 24000;
      } else if (roomName.includes("third unit") || roomName.includes("basement")) {
        baseFixedRent = days === 1 ? 3500 : days === 2 ? 7000 : 10000;
      } else if (roomName.includes("ac room")) {
        baseFixedRent = days * 550;
      } else {
        baseFixedRent = days * 350;
      }
    } else {
      // Wedding Saava Days (Peak Saava)
      if (roomName.includes("first unit") || roomName.includes("ground floor")) {
        if (days === 1) baseFixedRent = 15000;
        else if (days === 2) baseFixedRent = 25000;
        else if (days === 3) baseFixedRent = 33000;
        else baseFixedRent = 33000 + (days - 3) * 11000;
      } else if (roomName.includes("second unit") || roomName.includes("first floor")) {
        if (days === 1) baseFixedRent = 14000;
        else if (days === 2) baseFixedRent = 21000;
        else if (days === 3) baseFixedRent = 27000;
        else baseFixedRent = 27000 + (days - 3) * 9000;
      } else if (roomName.includes("third unit") || roomName.includes("basement")) {
        if (days === 1) baseFixedRent = 4000;
        else if (days === 2) baseFixedRent = 8000;
        else if (days === 3) baseFixedRent = 12000;
        else baseFixedRent = 12000 + (days - 3) * 4000;
      } else if (roomName.includes("ac room")) {
        baseFixedRent = days * 600;
      } else if (roomName.includes("non-ac")) {
        baseFixedRent = days * 400;
      } else {
        baseFixedRent = days * room.price_per_day;
      }
    }

    let purposeRent = baseFixedRent;

    // 2. Apply Agrawal Community Member 25% Extra Discount if applicable
    let memberDiscount = 0;
    if (isAgrawalMember && purposeRent > 0) {
      memberDiscount = Math.round(purposeRent * 0.25);
    }

    const netRent = Math.max(0, purposeRent - memberDiscount);

    // 3. Mandatory Cleaning Charge (₹1,000 / day for units; included for individual rooms)
    const isIndividualRoom = roomName.includes("ac room") || roomName.includes("non-ac");
    const cleaningCharge = (isIndividualRoom || eventPurpose === "free") ? 0 : days * 1000;

    const totalPayable = netRent + cleaningCharge;

    return {
      days,
      baseFixedRent,
      purposeRent,
      memberDiscount,
      netRent,
      cleaningCharge,
      totalPayable,
    };
  };

  const quote = computeOfficialQuote();
  const totalAmount = quote.totalPayable;

  const isBlockedOrFull = quoteInfo != null && quoteInfo.available === false;
  const isFull = isBlockedOrFull && quoteInfo.full === true;

  const voucherIsStale = appliedVoucher !== null && appliedVoucher.forAmount !== totalAmount;
  const payableAmount = appliedVoucher && !voucherIsStale ? appliedVoucher.finalAmount : totalAmount;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || totalAmount <= 0) return;
    setVoucherChecking(true);
    setVoucherError("");
    try {
      const res = await axios.post(`${getApiBaseUrl()}/vouchers/validate`, {
        code: voucherCode.trim(),
        amount: totalAmount,
        scope: "booking",
      });
      setAppliedVoucher({
        code: res.data.code,
        discountAmount: res.data.discount_amount,
        finalAmount: res.data.final_amount,
        forAmount: totalAmount,
      });
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err.response?.data?.detail || "Invalid voucher code.");
    } finally {
      setVoucherChecking(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quote.days <= 0) {
      setError("End date must be after start date.");
      return;
    }

    // Validate Saava Date & Custom Card restrictions client-side
    const isIndividualRoom = room.type === "room" && (room.capacity || 0) < 10;
    
    for (const card of saavaCards) {
      const cStart = card.start_date || (card.dates && card.dates[0]);
      const cEnd = card.end_date || (card.dates && card.dates[card.dates.length - 1]);
      if (!cStart) continue;

      if (startDate <= (cEnd || cStart) && endDate >= cStart) {
        if (card.is_blocked) {
          setError(`Bhavan bookings are blocked during '${card.title || 'Saava Window'}'.`);
          return;
        }
        if (card.disable_social_discount && eventPurpose === "social") {
          setError(card.custom_rule_notice || `Social Function discounted rates are not allowed during '${card.title || 'Saava Window'}'.`);
          return;
        }
        if (card.disable_individual_rooms && isIndividualRoom) {
          setError(card.custom_rule_notice || `Individual guest rooms cannot be booked during '${card.title || 'Saava Window'}'. Full hall units must be booked for weddings.`);
          return;
        }
        if (card.min_stay_days && quote.days < card.min_stay_days) {
          setError(`'${card.title || 'Saava Window'}' requires a minimum stay of ${card.min_stay_days} day(s).`);
          return;
        }
      }
    }

    if (isBlockedOrFull) {
      setError(isFull ? "These dates are fully booked for this room." : (quoteInfo?.blocked_reason || "Not available for these dates."));
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to Agrasen Bhawan Mansarovar Terms & Rules before proceeding.");
      return;
    }

    if (!isLoggedIn && (!guestName.trim() || !guestPhone.trim())) {
      setError("Please enter your name and WhatsApp number.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const payload: any = {
        room_id: roomId,
        start_date: startDate,
        end_date: endDate,
        payment_mode: "cash",
        notes: `Purpose: ${eventPurpose} | Agrawal Member: ${isAgrawalMember ? 'Yes' : 'No'} | ${notes || ''}`
      };

      if (!isLoggedIn) {
        payload.guest_name = guestName.trim();
        payload.guest_phone = guestPhone.trim();
      }

      if (appliedVoucher && !voucherIsStale) {
        payload.voucher_code = appliedVoucher.code;
      }

      const res = await axios.post(`${getApiBaseUrl()}/bookings/`, payload, { headers });

      const { booking_id } = res.data;
      setBookingId(booking_id);
      setSuccessStatus("pending_venue");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Booking request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-zinc-500">Loading Room Details...</div>;
  if (error && !room) return <div className="py-20 text-center text-rose-500">{error}</div>;
  if (!room) return null;

  return (
    <div className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen overflow-hidden">
      <div className="absolute inset-0 animated-gradient-mesh opacity-20 -z-10" />
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/bhavan" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Facilities
        </Link>

        {successStatus !== "none" ? (
          <div className="glass-panel rounded-[2rem] shadow-xl p-8 md:p-12 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="max-w-xl mx-auto space-y-3">
              <h2 className="text-3xl font-bold text-zinc-900">Booking Request Submitted Successfully!</h2>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Your booking request for <strong className="text-zinc-900">{room.name}</strong> from <strong className="text-zinc-900">{formatDateDDMonthYYYY(startDate)}</strong> to <strong className="text-zinc-900">{formatDateDDMonthYYYY(endDate)}</strong> has been sent to the Agrawal Samaj Mansrovar Jaipur Management Team.
              </p>
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                <p className="font-bold text-sm text-amber-950">📞 Next Steps / Admin Contact</p>
                <p>
                  Our admin representative will contact you shortly on your WhatsApp / Phone number (<span className="font-bold font-mono">{guestPhone || userProfile?.mobile || "your provided mobile"}</span>) to verify function details, finalize rent payment, and confirm your booking.
                </p>
              </div>
            </div>
            {isLoggedIn ? (
              <Link href="/dashboard/bookings" className="inline-block mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-all">
                View My Booking Requests
              </Link>
            ) : (
              <p className="text-xs text-zinc-500 mt-4">Thank you for connecting with Agrawal Samaj Mansrovar Jaipur.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Room Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-panel rounded-[2rem] shadow-xl p-6 sm:p-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full uppercase border border-amber-200">
                    {room.type}
                  </span>
                  {room.room_number && (
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                      Room {room.room_number}
                    </span>
                  )}
                  {room.floor && (
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full border border-zinc-200">
                      {room.floor}
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">{room.name}</h1>
                <p className="text-zinc-600 leading-relaxed mb-6">{room.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 mb-6 text-sm">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-900">Capacity</p>
                      <p className="text-zinc-500">{room.capacity || "N/A"} Persons</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-900">Rent Rate</p>
                      <p className="text-zinc-500">₹{room.price_per_day} / day</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:col-span-2 pt-3 border-t border-zinc-200/60">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-900">Mandatory Cleaning Charge</p>
                      <p className="text-emerald-700 font-bold">₹1,000 / unit / day (Included in final calculation)</p>
                    </div>
                  </div>
                </div>

                {/* Agrasen Bhawan Official Rules */}
                <div className="space-y-3 pt-6 border-t border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Agrasen Bhawan Mansarowar Booking Terms</h3>
                  <ul className="space-y-2 text-xs text-zinc-600 list-disc pl-4 leading-relaxed">
                    <li><strong className="text-zinc-900">Pure Vegetarian Only:</strong> Non-vegetarian food, eggs, alcohol, smoking, or gambling strictly prohibited.</li>
                    <li><strong className="text-zinc-900">Check-in / Check-out:</strong> Check-in at 12:00 PM; Check-out at 11:00 AM (Next Day).</li>
                    <li><strong className="text-zinc-900">Sound & Loudspeaker:</strong> DJ/Loudspeakers prohibited after 10:00 PM per government regulations.</li>
                    <li><strong className="text-zinc-900">Cancellation Refund:</strong> 90% refund if cancelled &gt;30 days prior, 75% for 15-30 days, 50% for 7-14 days, 0% refund for &lt;7 days.</li>
                  </ul>
                </div>

                {/* Visual Calendar */}
                <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="w-5 h-5 text-amber-500" /> Bhavan Availability Calendar
                      </h3>
                      <p className="text-[11px] text-zinc-500">Check occupied dates and designated Wedding Saava dates.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handlePrevMonth} className="p-1 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer">Prev</button>
                      <span className="text-xs font-bold text-zinc-950 w-24 text-center">{MONTHS[currentMonth]} {currentYear}</span>
                      <button type="button" onClick={handleNextMonth} className="p-1 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer">Next</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-zinc-400">
                    <span>SU</span><span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {days.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

                      const dStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                      const status = occupancy[dStr] || "none";
                      const isSaava = saavaDates.includes(dStr);

                      let bgClass = "bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80";
                      let dotColor = "bg-emerald-500";

                      if (status === "full") {
                        bgClass = "bg-rose-50/60 text-rose-800 border-rose-200 hover:bg-rose-100/80";
                        dotColor = "bg-rose-500";
                      } else if (status === "partial") {
                        bgClass = "bg-amber-50/60 text-amber-800 border-amber-200 hover:bg-amber-100/80";
                        dotColor = "bg-amber-500";
                      }

                      return (
                        <div
                          key={dStr}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-1 cursor-pointer transition-colors relative ${bgClass}`}
                          title={`Date: ${dStr} | Status: ${status === "full" ? "Fully Booked" : status === "partial" ? "Partially Booked" : "Available"}${isSaava ? " | Saava Day" : ""}`}
                        >
                          <span className="text-xs font-bold">{day.getDate()}</span>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {isSaava && <span className="text-[10px] leading-none" title="Saava Day">💍</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-4 flex-wrap text-[10px] font-semibold text-zinc-600 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Partially Booked</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Fully Booked</div>
                    <div className="flex items-center gap-1.5"><span>💍</span> Wedding Saava Day</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Form Card */}
            <div className="md:col-span-1">
              <div className="glass-panel rounded-[2rem] shadow-xl p-6 md:sticky md:top-24">
                <h3 className="text-xl font-bold text-zinc-900 mb-5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" /> Book Facility
                </h3>
                
                <form onSubmit={handleBook} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl border border-rose-100">
                      {error}
                    </div>
                  )}

                  {/* Step 1: Event Purpose Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">1. Event / Booking Purpose *</label>
                    <select
                      value={eventPurpose}
                      onChange={e => setEventPurpose(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="saava">💍 Wedding Saava Days (सावा दिवस - विवाह)</option>
                      <option value="other_days">🗓️ Other Days (अन्य सामान्य दिवस - विवाह/निजी कार्य)</option>
                      <option value="social">👥 Social Functions (सामाजिक कार्यक्रम - जन्मदिन/सगाई/पूजा/बैठक)</option>
                      <option value="free">🎁 Free & Welfare Usage (निःशुल्क/चिकित्सा एवं समाज सेवा कार्य)</option>
                    </select>
                  </div>

                  {/* Step 2: Agrawal Member Selection */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" /> Agrawal Community Member?
                      </span>
                      <input
                        type="checkbox"
                        checked={isAgrawalMember}
                        onChange={e => setIsAgrawalMember(e.target.checked)}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 rounded cursor-pointer"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-600">
                      Subsidized Agrawal community rates automatically applied.
                    </p>
                  </div>

                  {/* Step 3: Contact Details */}
                  {!isLoggedIn && (
                    <div className="space-y-3 pt-1 border-t border-zinc-100">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
                        <input
                          required
                          type="text"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">WhatsApp / Phone Number *</label>
                        <input
                          required
                          type="tel"
                          value={guestPhone}
                          onChange={e => setGuestPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Choose Stay Dates */}
                  <div className="space-y-3 pt-1 border-t border-zinc-100">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">2. Select Stay Window *</label>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-500 font-semibold">Check-in Date</span>
                        <CustomDatePicker
                          value={startDate}
                          onChange={setStartDate}
                          min={new Date().toISOString().split("T")[0]}
                          placeholder="Select Check-in Date"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-500 font-semibold">Check-out Date</span>
                        <CustomDatePicker
                          value={endDate}
                          onChange={setEndDate}
                          min={startDate || new Date().toISOString().split("T")[0]}
                          placeholder="Select Check-out Date"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Quote Summary */}
                  {startDate && endDate && quote.days > 0 && (
                    <div className="bg-zinc-50/80 border border-zinc-100 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-600 font-medium">
                      <div className="flex justify-between items-center text-zinc-950 font-bold border-b border-zinc-200/60 pb-1.5">
                        <span>Stay Quote Breakdown</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-200/80 text-[10px] text-zinc-700">{quote.days} Day(s)</span>
                      </div>

                      {eventPurpose !== "free" && (
                        <div className="flex justify-between items-center">
                          <span>Base rent ({eventPurpose === 'social' ? 'Social rate' : eventPurpose === 'saava' ? 'Saava rate' : 'Standard rate'})</span>
                          <span className="font-mono text-zinc-800 font-bold">₹{quote.baseFixedRent.toLocaleString()}</span>
                        </div>
                      )}

                      {isAgrawalMember && quote.memberDiscount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600">
                          <span>Agrawal Member Discount (25%)</span>
                          <span className="font-mono font-bold">-₹{quote.memberDiscount.toLocaleString()}</span>
                        </div>
                      )}

                      {quote.cleaningCharge > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Mandatory Cleaning Charge</span>
                          <span className="font-mono text-zinc-800 font-bold">₹{quote.cleaningCharge.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-zinc-200/85 flex justify-between items-center text-sm font-extrabold text-zinc-950">
                        <span>Total Payable Rent</span>
                        <span className="font-mono text-amber-600">₹{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes / Special Instructions */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Special Instructions / Family Details (Optional)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Booking for daughter's wedding. Need extra helper keys."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-white"
                    />
                  </div>

                  {/* Terms Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      required
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-amber-600 focus:ring-amber-500 rounded cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-500 leading-normal">
                      I agree to the Agrasen Bhawan Mansarovar Terms, Rules and strict Vegetarian guidelines.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting || !startDate || !endDate}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Submitting Request..." : "Request Booking Confirmation"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
