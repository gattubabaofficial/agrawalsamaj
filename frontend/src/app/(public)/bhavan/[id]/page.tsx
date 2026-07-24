"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Calendar, Users, MapPin, ArrowLeft, CheckCircle, Clock, User, Phone, Ticket, X, Sparkles, PartyPopper, Ban, AlertTriangle } from "lucide-react";
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

  // Event Purpose Selector
  const [eventPurpose, setEventPurpose] = useState<string>("wedding_saava");
  // Agrawal Member Toggle
  const [isAgrawalMember, setIsAgrawalMember] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Backend-authoritative special-event / availability info for the selected dates.
  // Purely additive: never used to compute totalAmount below, only to show an
  // event badge, warn about stay-length restrictions, and disable booking when
  // the room is blocked or fully booked for these dates.
  const [quoteInfo, setQuoteInfo] = useState<any>(null);

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
  }, [roomId]);

  // Ask the backend whether these dates fall under a special event or are
  // blocked/full, so we can surface that to the customer. The backend remains
  // the sole authority for price/availability at booking time regardless.
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

  // Compute exact official 2020 rate list breakdown
  const computeOfficialQuote = () => {
    if (!startDate || !endDate || !room) {
      return { days: 0, baseFixedRent: 0, purposeRent: 0, memberDiscount: 0, netRent: 0, cleaningCharge: 0, totalPayable: 0 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const roomName = (room.name || "").toLowerCase();

    // 1. Calculate Base Fixed Rent based on Multi-Day Slab
    let baseFixedRent = 0;
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

    // 2. Apply Event Purpose Discount Multiplier
    let purposeRent = baseFixedRent;
    if (eventPurpose === "wedding_non_saava") {
      purposeRent = baseFixedRent * 0.75;
    } else if (eventPurpose === "engagement_birthday_party") {
      purposeRent = baseFixedRent * 0.50;
    } else if (eventPurpose === "religious_spiritual_social") {
      // 20% of first day rate per day
      const day1Rate = baseFixedRent / days;
      purposeRent = days * (day1Rate * 0.20);
    } else if (eventPurpose === "charitable_free_service") {
      purposeRent = 0; // FREE
    }

    // 3. Apply Agrawal Community Member 25% Extra Discount
    let memberDiscount = 0;
    if (isAgrawalMember && purposeRent > 0) {
      memberDiscount = Math.round(purposeRent * 0.25);
    }

    const netRent = Math.max(0, purposeRent - memberDiscount);

    // 4. Mandatory Cleaning Charge (₹1,000 per day for units; included for individual rooms)
    const isIndividualRoom = roomName.includes("ac room") || roomName.includes("non-ac");
    const cleaningCharge = isIndividualRoom ? 0 : days * 1000;

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
  const hasStayViolation = Array.isArray(quoteInfo?.stay_errors) && quoteInfo.stay_errors.length > 0;

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
        payment_mode: paymentMode,
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

      const { booking_id, razorpay_order_id } = res.data;
      setBookingId(booking_id);

      if (paymentMode !== "cash" && razorpay_order_id) {
        setShowPaymentGateway(true);
      } else {
        setSuccessStatus("pending_venue");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Booking failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentId?: string) => {
    setShowPaymentGateway(false);
    try {
      if (bookingId) {
        await axios.post(`${getApiBaseUrl()}/bookings/${bookingId}/verify-payment`, {
          razorpay_payment_id: paymentId
        });
      }
      setSuccessStatus("verified");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Payment was received but verification failed. Please contact the office.");
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentGateway(false);
    setError("Payment was cancelled. Please try booking again.");
  };

  if (loading) return <div className="py-20 text-center text-zinc-500">Loading Room Details...</div>;
  if (error && !room) return <div className="py-20 text-center text-rose-500">{error}</div>;
  if (!room) return null;

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/bhavan" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Facilities
        </Link>

        {successStatus !== "none" ? (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 md:p-12 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900">Booking Requested Successfully!</h2>
              {successStatus === "pending_venue" ? (
                <p className="text-zinc-500 mt-2">Your request is pending admin approval. Please pay ₹{payableAmount} at the venue.</p>
              ) : (
                <p className="text-zinc-500 mt-2">Your booking has been confirmed. The admin will verify and approve it shortly.</p>
              )}
            </div>
            {isLoggedIn ? (
              <Link href="/dashboard/bookings" className="inline-block mt-8 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
                View My Bookings
              </Link>
            ) : (
              <p className="text-sm text-zinc-500 mt-4">We'll reach out on WhatsApp with confirmation details.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Room Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8">
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
              </div>
            </div>

            {/* Booking Form Card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sticky top-24">
                <h3 className="text-xl font-bold text-zinc-900 mb-5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" /> Book Facility
                </h3>
                
                <form onSubmit={handleBook} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                      {error}
                    </div>
                  )}

                  {/* Step 1: Event Purpose Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">1. Event / Booking Purpose *</label>
                    <select
                      value={eventPurpose}
                      onChange={e => setEventPurpose(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="wedding_saava">Wedding (Auspicious Saava Date)</option>
                      <option value="wedding_non_saava">Wedding (Other / General Date)</option>
                      <option value="engagement_birthday_party">Engagement / Birthday / Retirement / Function</option>
                      <option value="religious_spiritual_social">Religious / Spiritual / Social Gathering</option>
                      <option value="charitable_free_service">Charitable Camp / Eye Camp / Teeya (Condolence)</option>
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
                          type="text"
                          required
                          placeholder="Your Name"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">WhatsApp Mobile *</label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile number"
                          value={guestPhone}
                          onChange={e => setGuestPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Booking Dates */}
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">Start Date *</label>
                      <CustomDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        placeholder="Select Start Date (e.g. 21 Jul 2026)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">End Date *</label>
                      <CustomDatePicker
                        value={endDate}
                        onChange={setEndDate}
                        min={startDate || new Date().toISOString().split("T")[0]}
                        required
                        placeholder="Select End Date (e.g. 25 Jul 2026)"
                      />
                    </div>
                  </div>

                  {/* Special-event / availability status for the selected dates (backend-authoritative) */}
                  {quoteInfo && quoteInfo.event_name && !isBlockedOrFull && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
                        <PartyPopper className="w-3 h-3" /> Special Event Price
                      </span>
                      <p className="text-xs font-bold text-amber-900">{quoteInfo.event_name}</p>
                      <p className="text-[11px] text-zinc-600">
                        Normal Price: ₹{quoteInfo.default_price_per_day}/day · Event nights are priced differently — see breakdown below.
                      </p>
                    </div>
                  )}

                  {isBlockedOrFull && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                      <Ban className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-800">
                          {isFull ? "FULL — Not Available for These Dates" : "Not Available During This Event"}
                        </p>
                        {!isFull && quoteInfo.blocked_reason && (
                          <p className="text-[11px] text-rose-600 mt-0.5">{quoteInfo.blocked_reason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {!isBlockedOrFull && hasStayViolation && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <ul className="text-[11px] text-amber-800 space-y-1">
                        {quoteInfo.stay_errors.map((msg: string, i: number) => <li key={i}>{msg}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Event Function Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows={2} 
                      placeholder="e.g. Wedding function, Committee meeting" 
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" 
                    />
                  </div>

                  {totalAmount > 0 && (
                    <div className="space-y-2 pt-3 border-t border-zinc-100">
                      <label className="text-xs font-semibold text-zinc-700">Have a Voucher Code?</label>
                      {appliedVoucher && !voucherIsStale ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                          <span className="text-xs font-semibold text-emerald-800 flex items-center gap-2">
                            <Ticket className="w-4 h-4" /> {appliedVoucher.code} applied — ₹{appliedVoucher.discountAmount} off
                          </span>
                          <button type="button" onClick={handleRemoveVoucher} className="text-emerald-700 hover:text-emerald-900">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter voucher code"
                            value={voucherCode}
                            onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(""); }}
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherChecking || !voucherCode.trim()}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors"
                          >
                            {voucherChecking ? "..." : "Apply"}
                          </button>
                        </div>
                      )}
                      {voucherIsStale && (
                        <p className="text-xs text-amber-600">Dates changed — please re-apply your voucher.</p>
                      )}
                      {voucherError && <p className="text-xs text-rose-600">{voucherError}</p>}
                    </div>
                  )}

                  {/* Official User Side Calculation Summary */}
                  {quote.days > 0 && (
                    <div className="space-y-2 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                      <div className="flex justify-between text-zinc-600 font-medium">
                        <span>Duration</span>
                        <span>{quote.days} Day(s)</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 font-medium">
                        <span>Facility Rent</span>
                        <span>₹{quote.netRent}</span>
                      </div>
                      {quote.cleaningCharge > 0 && (
                        <div className="flex justify-between text-zinc-600 font-medium">
                          <span>Mandatory Cleaning Charge</span>
                          <span>+₹{quote.cleaningCharge}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-zinc-400 italic pt-1">
                        * Electricity @ ₹15/kWh based on meter reading settled at venue.
                      </p>
                      <div className="flex justify-between font-bold text-zinc-900 pt-2 border-t border-zinc-200 text-sm">
                        <span>Total Payable</span>
                        <span className="text-amber-600 font-extrabold text-base">₹{payableAmount}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-3 border-t border-zinc-100">
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "upi" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="upi" checked={paymentMode === "upi"} onChange={() => setPaymentMode("upi")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-xs font-semibold text-zinc-800">Pay Online Now</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "cash" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="cash" checked={paymentMode === "cash"} onChange={() => setPaymentMode("cash")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-xs font-semibold text-zinc-800">Pay at Venue (Cash)</span>
                      </label>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 text-amber-500 focus:ring-amber-500 rounded"
                      />
                      <span className="text-[11px] text-zinc-600 leading-tight">
                        I agree to Agrasen Bhawan Mansarovar rules (Pure Vegetarian, No Alcohol/Smoking, Music cutoff at 10PM, Check-in 12PM / Check-out 11AM).
                      </span>
                    </label>
                  </div>

                  <button disabled={isSubmitting || quote.days <= 0 || !agreedToTerms || isBlockedOrFull} type="submit" className="w-full py-3.5 mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 shadow-md">
                    {isSubmitting
                      ? "Processing..."
                      : isBlockedOrFull
                        ? (isFull ? "FULL" : "Not Available During This Event")
                        : (paymentMode === "upi" ? `Pay ₹${payableAmount}` : "Submit Booking Request")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPaymentGateway && (
        <PaymentGateway
          amount={payableAmount}
          purpose={`Booking for ${room.name}`}
          onSuccess={handlePaymentSuccess} 
          onCancel={handlePaymentCancel} 
        />
      )}
    </div>
  );
}
