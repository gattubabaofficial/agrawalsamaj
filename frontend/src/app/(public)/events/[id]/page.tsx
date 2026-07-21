"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, MapPin, Clock, ArrowLeft, Ticket, CheckCircle, ShieldAlert, X } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatDateDDMonthYYYY } from "@/utils/date";
import Link from "next/link";
import PaymentGateway from "@/components/PaymentGateway";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [attendeeType, setAttendeeType] = useState<"member" | "user">("member");
  
  // Form State
  const [passCount, setPassCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentMode, setPaymentMode] = useState<"pay_online" | "pay_at_venue">("pay_online");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState<"none" | "pending_venue" | "verified">("none");
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null);

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string; discountAmount: number; finalAmount: number; forAmount: number;
  } | null>(null);

  useEffect(() => {
    // Check login status and auto-prefill registered member details
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      axios.get(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => {
        const u = res.data;
        if (u) {
          const name = [u.first_name, u.surname].filter(Boolean).join(" ");
          setGuestName(name || u.full_name || u.name || "");
          setGuestPhone(u.mobile || u.phone || u.whatsapp || "");
          setGuestEmail(u.email || "");
        }
      }).catch((err) => {
        console.error("Could not fetch member profile for prefill", err);
      });
    }

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("book") === "true") {
        setIsBookingMode(true);
      }
    }

    const fetchEvent = async () => {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/events/${eventId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setEvent(res.data);
      } catch (err: any) {
        // A members-only event 404s for non-members on purpose — it should
        // read the same as "doesn't exist", not reveal that it's gated.
        setError("Event not found or failed to load");
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || totalAmount <= 0) return;
    setVoucherChecking(true);
    setVoucherError("");
    try {
      const res = await axios.post(`${getApiBaseUrl()}/vouchers/validate`, {
        code: voucherCode.trim(),
        amount: totalAmount,
        scope: "event",
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload: any = {
        pass_count: passCount,
        guest_name: guestName || undefined,
        guest_phone: guestPhone || undefined,
        guest_email: guestEmail || undefined,
        payment_mode: event.pricing_type === "paid" ? paymentMode : undefined
      };

      if (event.pricing_type === "paid" && appliedVoucher && !voucherIsStale) {
        payload.voucher_code = appliedVoucher.code;
      }

      const res = await axios.post(`${getApiBaseUrl()}/events/${eventId}/register`, payload, { headers });
      
      const { payment_status, payment_mode, registration_id } = res.data;
      
      if (payment_mode === "pay_online") {
        setPendingRegistrationId(registration_id);
        setShowPaymentGateway(true);
      } else if (payment_status === "pending") {
        setSuccessStatus("pending_venue");
      } else {
        setSuccessStatus("verified");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // In a real flow, the payment gateway calls backend webhook
    // We'll simulate verification here
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Assume success for now as we don't have a public endpoint to verify client side
      setShowPaymentGateway(false);
      setSuccessStatus("verified");
    } catch (err) {
      setError("Failed to verify payment");
      setShowPaymentGateway(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentGateway(false);
    setError("Payment was cancelled. You can try again.");
  };

  if (loading) return <div className="py-20 text-center text-zinc-500">Loading Event...</div>;
  if (error && !event) return <div className="py-20 text-center text-rose-500">{error}</div>;
  if (!event) return null;

  const totalAmount = event.pass_price * passCount;
  const voucherIsStale = appliedVoucher !== null && appliedVoucher.forAmount !== totalAmount;
  const payableAmount = appliedVoucher && !voucherIsStale ? appliedVoucher.finalAmount : totalAmount;

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        {successStatus !== "none" ? (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 md:p-12 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900">Registration Successful!</h2>
              {successStatus === "pending_venue" ? (
                <p className="text-zinc-500 mt-2">Your spot is reserved. Please pay ₹{payableAmount} at the venue to collect your tickets.</p>
              ) : (
                <p className="text-zinc-500 mt-2">Your tickets have been confirmed and will be sent to you shortly.</p>
              )}
            </div>
            <Link href="/" className="inline-block mt-8 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl">
              Back to Home
            </Link>
          </div>
        ) : isBookingMode ? (
          /* BOOK PASS ONLY VIEW (ONLY BOOKING CARD) */
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-amber-500" /> Book Passes
                  </h3>
                  <p className="text-xs font-semibold text-amber-600 mt-1">{event.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingMode(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 underline"
                >
                  View Details
                </button>
              </div>
              
              <form onSubmit={handleRegister} className="space-y-5">
                {error && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                    {error}
                  </div>
                )}

                {/* Step 1: Member or Guest Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Are you a Member or User?</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAttendeeType("member")}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                        attendeeType === "member"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Registered Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendeeType("user")}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                        attendeeType === "user"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Guest / User
                    </button>
                  </div>
                </div>

                {/* Step 2: Attendee Details */}
                <div className="space-y-4 pt-3 border-t border-zinc-100">
                  {attendeeType === "member" ? (
                    isLoggedIn && (guestName || guestPhone) ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                        <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Member Details Loaded from DB
                        </p>
                        <p className="text-xs text-zinc-700 font-medium">Name: <span className="font-semibold">{guestName || "Registered Member"}</span></p>
                        <p className="text-xs text-zinc-700 font-medium">Phone: <span className="font-semibold">{guestPhone || "Registered Phone"}</span></p>
                      </div>
                    ) : (
                      <div className="space-y-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <p className="text-xs text-zinc-600 font-medium">Enter details to retrieve member info from DB:</p>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
                          <input required type="text" placeholder="Member Full Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-700">Registered Mobile Number *</label>
                          <input required type="tel" pattern="[0-9+]{10,13}" placeholder="Registered Mobile" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500" />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <p className="text-xs text-zinc-600 font-medium">Enter your contact details:</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
                        <input required type="text" placeholder="Your Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700">Mobile Number *</label>
                        <input required type="tel" pattern="[0-9+]{10,13}" placeholder="Your Mobile Number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700">Email Address *</label>
                        <input required type="email" placeholder="Your Email Address" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Number of Passes */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <label className="text-sm font-semibold text-zinc-700">Number of Passes</label>
                  <div className="flex items-center">
                    <button type="button" onClick={() => setPassCount(Math.max(1, passCount - 1))} className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-l-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-bold">-</button>
                    <input type="number" min="1" max={event.max_per_user || 10} readOnly value={passCount} className="w-16 h-10 text-center border-y border-zinc-200 focus:outline-none font-semibold text-zinc-900" />
                    <button type="button" onClick={() => setPassCount(Math.min(event.max_per_user || 10, passCount + 1))} className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-r-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-bold">+</button>
                  </div>
                  <p className="text-xs text-zinc-500">Max {event.max_per_user || 10} per person</p>
                </div>

                {event.pricing_type === "paid" && (
                  <div className="space-y-3 pt-4 border-t border-zinc-100">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment Details</p>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700">Have a Voucher?</label>
                      {appliedVoucher && !voucherIsStale ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                          <span className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
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
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherChecking || !voucherCode.trim()}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors"
                          >
                            {voucherChecking ? "Checking..." : "Apply"}
                          </button>
                        </div>
                      )}
                      {voucherIsStale && (
                        <p className="text-xs text-amber-600">Pass count changed — please re-apply your voucher.</p>
                      )}
                      {voucherError && <p className="text-xs text-rose-600">{voucherError}</p>}
                    </div>

                    {appliedVoucher && !voucherIsStale ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-zinc-500">
                          <span>Subtotal</span>
                          <span>₹{totalAmount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-emerald-600 font-semibold">
                          <span>Voucher Discount</span>
                          <span>-₹{appliedVoucher.discountAmount}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-zinc-900 pt-1">
                          <span>Total Amount</span>
                          <span>₹{payableAmount}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between font-semibold text-zinc-900">
                        <span>Total Amount</span>
                        <span>₹{payableAmount}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "pay_online" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="pay_online" checked={paymentMode === "pay_online"} onChange={() => setPaymentMode("pay_online")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-sm font-semibold text-zinc-800">Pay Online Now</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "pay_at_venue" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="pay_at_venue" checked={paymentMode === "pay_at_venue"} onChange={() => setPaymentMode("pay_at_venue")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-sm font-semibold text-zinc-800">Pay at Venue</span>
                      </label>
                    </div>
                  </div>
                )}
                
                {event.pricing_type === "free" && (
                  <div className="pt-4 border-t border-zinc-100">
                    <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-100 flex items-center justify-center">
                      Free Event
                    </div>
                  </div>
                )}

                <button disabled={isSubmitting} type="submit" className="w-full py-3.5 mt-6 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                  <Ticket className="w-5 h-5 text-white" />
                  {isSubmitting ? "Processing..." : (event.pricing_type === "paid" && paymentMode === "pay_online" ? `Buy Pass (₹${payableAmount})` : "Confirm Pass Booking")}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* EVENT DETAILS ONLY VIEW (NO BOOKING CARD AT ALL) */
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full uppercase border border-amber-200">
                  {event.category}
                </span>
                {event.visibility === "members_only" && (
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full uppercase border border-rose-200 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Members Only
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">{event.title}</h1>
              <p className="text-zinc-600 leading-relaxed mb-8">{event.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Date</p>
                    <p className="text-sm text-zinc-500">{formatDateDDMonthYYYY(event.start_datetime)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Time</p>
                    <p className="text-sm text-zinc-500">{new Date(event.start_datetime).toLocaleTimeString("en-US", { timeStyle: "short" })}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Venue</p>
                    <p className="text-sm text-zinc-500">{event.venue}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2 pt-4 border-t border-zinc-200/60">
                  <Ticket className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Pass Price</p>
                    <p className="text-sm font-bold text-amber-600">
                      {event.pass_price > 0 ? `₹${event.pass_price} per pass` : "Free Entry"}
                    </p>
                  </div>
                </div>
              </div>

              {event.timeline && event.timeline.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-zinc-100 mt-6">
                  <h4 className="font-semibold text-zinc-900 text-sm uppercase tracking-wider">Event Schedule</h4>
                  <div className="space-y-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    {event.timeline.map((item: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="font-bold text-amber-600 w-20 flex-shrink-0">{item.time}</span>
                        <span className="text-zinc-700 font-medium">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPaymentGateway && (
        <PaymentGateway
          amount={payableAmount}
          purpose={`Passes for ${event.title}`}
          onSuccess={handlePaymentSuccess} 
          onCancel={handlePaymentCancel} 
        />
      )}
    </div>
  );
}
