"use client";

import { Calendar, MapPin, Ticket, Loader2, ShieldAlert, Plus, Minus, X, AlertCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import PaymentGateway from "@/components/PaymentGateway";

export default function UserEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // View Passes Modal State
  const [viewingPassesReg, setViewingPassesReg] = useState<any>(null);
  
  // View Event Details Modal State
  const [viewingDetailsEvent, setViewingDetailsEvent] = useState<any>(null);
  
  // Registration Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [passCount, setPassCount] = useState(1);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentMode, setPaymentMode] = useState<"pay_online" | "pay_at_venue">("pay_online");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Payment Gateway State
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [razorpayOrderId, setRazorpayOrderId] = useState("");

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const eventsPromise = axios.get(`${getApiBaseUrl()}/events/`, { headers })
        .then(res => res.data)
        .catch((err) => { console.error("Failed to fetch events", err); return []; });

      const regPromise = token
        ? axios.get(`${getApiBaseUrl()}/events/my-registrations`, { headers })
            .then(res => res.data)
            .catch((err) => { console.error("Failed to fetch registrations", err); return []; })
        : Promise.resolve([]);

      const [eventsData, regData] = await Promise.all([eventsPromise, regPromise]);

      setEvents(eventsData);
      setMyRegistrations(regData);
    } catch (error) {
      console.error("Failed to fetch events data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(res.data);
    } catch (error) {
      console.error("Failed to fetch profile info", error);
    }
  };

  const handleRegisterClick = (event: any) => {
    const token = localStorage.getItem("token");
    if (event.is_members_only && !token) {
      alert("This event is for members only. Please log in first.");
      return;
    }

    setSelectedEvent(event);
    setPassCount(1);
    setPaymentMode("pay_online");
    
    // Prefill form details from user profile
    if (userProfile) {
      setGuestName(`${userProfile.first_name} ${userProfile.surname}`);
      setGuestEmail(userProfile.email || "");
      setWhatsappNumber(userProfile.mobile || "");
    } else {
      setGuestName("");
      setGuestEmail("");
      setWhatsappNumber("");
    }

    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber) {
      alert("WhatsApp number is required to deliver tickets.");
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        pass_count: passCount,
        guest_name: guestName || undefined,
        guest_phone: whatsappNumber,
        guest_email: guestEmail || undefined,
        payment_mode: selectedEvent.pass_price > 0 ? paymentMode : undefined
      };

      const res = await axios.post(
        `${getApiBaseUrl()}/events/${selectedEvent.event_id}/register`,
        payload,
        { headers }
      );

      const data = res.data;
      setShowBookingModal(false);

      if (selectedEvent.pass_price > 0 && paymentMode === "pay_online") {
        // Open online payment gateway
        setRegistrationId(data.registration_id);
        setRazorpayOrderId(data.razorpay_order_id || "");
        setShowPaymentGateway(true);
      } else {
        // Free event or Pay at Venue (Cash)
        alert(
          selectedEvent.pass_price > 0
            ? "Ticket booking submitted! Please pay at the venue to verify your registration."
            : "Successfully registered! Your tickets have been sent to WhatsApp."
        );
        fetchData(); // Refresh list
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "Booking registration failed");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handlePaymentSuccess = async (paymentId?: string) => {
    setShowPaymentGateway(false);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post(
        `${getApiBaseUrl()}/events/${registrationId}/verify-payment`,
        { razorpay_payment_id: paymentId },
        { headers }
      );

      alert("Payment successful! Your entry tickets have been sent to WhatsApp.");
      fetchData(); // Refresh registrations
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to verify payment. Please contact support.");
    }
  };

  // Utility to convert time string (e.g. "18:30") to 12-hour format ("6:30 PM")
  const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // Format full Date and Time in 12-hour format
  const formatDateTime12Hour = (dateTimeStr: string) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div className="space-y-12 max-w-5xl">
      {/* Browse Upcoming Events */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Upcoming Events</h1>
          <p className="text-sm text-zinc-500 mt-1">Discover and register for upcoming Samaj events.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500">
              No upcoming events at the moment.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.event_id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gradient-to-br from-amber-100 to-rose-100 p-6 flex flex-col items-center justify-center min-h-[120px] text-center relative">
                  <div className="absolute top-3 right-3 flex gap-2">
                    {event.is_members_only && (
                      <span className="px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Members Only
                      </span>
                    )}
                    <span className="px-2 py-1 bg-white/60 text-zinc-800 text-xs font-bold rounded-lg uppercase tracking-wider">
                      {event.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 leading-tight">{event.title}</h3>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-600 line-clamp-2">{event.description || "No description provided."}</p>
                    <div className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>{formatDateTime12Hour(event.start_datetime)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <span>{event.venue}</span>
                      </div>
                    )}
                  </div>

                  {event.timeline && event.timeline.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-700">Schedule:</p>
                      {event.timeline.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs text-zinc-600">
                          <span className="font-semibold text-amber-600 w-20 flex-shrink-0">{formatTime12Hour(item.time)}</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {event.timeline.length > 3 && (
                        <p className="text-xs text-zinc-400 italic">+{event.timeline.length - 3} more activities</p>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-100 flex items-center gap-3">
                    <button
                      onClick={() => setViewingDetailsEvent(event)}
                      className="flex-1 py-2.5 px-3 border border-zinc-300 hover:border-amber-500 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Info className="w-4 h-4 text-amber-500" /> View Details
                    </button>
                    <button 
                      onClick={() => handleRegisterClick(event)}
                      className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Ticket className="w-4 h-4 text-amber-400" /> Book a Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* My Registrations */}
      <div className="pt-8 border-t border-zinc-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-900">My Registrations</h2>
          <p className="text-sm text-zinc-500 mt-1">Events you have registered for and your entry passes.</p>
        </div>

        <div className="space-y-4">
          {myRegistrations.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500">
              You haven't registered for any events yet.
            </div>
          ) : (
            myRegistrations.map((reg) => (
              <div key={reg.registration_id} className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-zinc-900">{reg.event_title}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5"/> 
                      {formatDateTime12Hour(reg.event_start)}
                    </span>
                    {reg.event_venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {reg.event_venue}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">{reg.pass_count} Passes</p>
                    <p className={`text-xs font-semibold ${reg.payment_status === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {reg.payment_status?.toUpperCase()}
                    </p>
                  </div>
                  {(reg.payment_status === 'verified' || reg.payment_status === 'not_applicable') && (
                    <button 
                      onClick={() => setViewingPassesReg(reg)}
                      className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm animate-fade-in"
                    >
                      <Ticket className="w-4 h-4" /> View Passes
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Booking / Registration Modal */}
      {showBookingModal && selectedEvent && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-bold text-zinc-900 text-lg">Book Event Tickets</h3>
              <button 
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                <Ticket className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-900 text-sm">{selectedEvent.title}</h4>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Price: {selectedEvent.pass_price > 0 ? `₹${selectedEvent.pass_price.toFixed(2)} per ticket` : "Free Event"}
                  </p>
                </div>
              </div>

              {/* Ticket Quantity Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-800 block">Select Ticket Quantity</label>
                <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-2 w-max">
                  <button 
                    type="button"
                    onClick={() => setPassCount(prev => Math.max(1, prev - 1))}
                    className="p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-700 disabled:opacity-50 transition-colors"
                    disabled={passCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-zinc-900 text-lg">{passCount}</span>
                  <button 
                    type="button"
                    onClick={() => setPassCount(prev => Math.min(selectedEvent.max_per_user || 5, prev + 1))}
                    className="p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-700 transition-colors"
                    disabled={passCount >= (selectedEvent.max_per_user || 5)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Maximum {selectedEvent.max_per_user || 5} tickets allowed per registration.</p>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-1">Contact Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Amit Agrawal"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Email Address *</label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. amit@gmail.com"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    WhatsApp Number *
                    <span className="text-[10px] text-zinc-400 font-medium">(With country code, e.g. +91XXXXXXXXXX)</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    placeholder="e.g. +919876543210"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                  />
                  <div className="flex gap-1.5 items-center mt-1 text-[11px] text-zinc-500">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Your tickets & entry QR code will be delivered to this number on WhatsApp.</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode (only for paid events) */}
              {selectedEvent.pass_price > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-1">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${paymentMode === 'pay_online' ? 'bg-amber-50/50 border-amber-500 text-amber-900 font-medium' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
                      <input 
                        type="radio" 
                        name="payment_mode" 
                        value="pay_online"
                        checked={paymentMode === 'pay_online'}
                        onChange={() => setPaymentMode("pay_online")}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">Pay Online</span>
                      <span className="text-xs text-zinc-500 mt-1">Razorpay (UPI, Card, Net Banking)</span>
                    </label>
                    <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-all ${paymentMode === 'pay_at_venue' ? 'bg-amber-50/50 border-amber-500 text-amber-900 font-medium' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
                      <input 
                        type="radio" 
                        name="payment_mode" 
                        value="pay_at_venue"
                        checked={paymentMode === 'pay_at_venue'}
                        onChange={() => setPaymentMode("pay_at_venue")}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">Pay by Cash</span>
                      <span className="text-xs text-zinc-500 mt-1">Pay Cash at the Event Venue</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Tickets</span>
                  <span>{passCount}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-100 pt-2">
                  <span>Total Amount</span>
                  <span>₹ {(selectedEvent.pass_price * passCount).toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingBooking && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedEvent.pass_price === 0 
                    ? "Register Free" 
                    : paymentMode === "pay_online" 
                      ? `Proceed to Pay ₹${(selectedEvent.pass_price * passCount).toFixed(2)}` 
                      : "Confirm Cash Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Gateway Wrapper */}
      {showPaymentGateway && selectedEvent && (
        <PaymentGateway
          amount={selectedEvent.pass_price * passCount}
          purpose={`Registration for ${selectedEvent.title} (${passCount} passes)`}
          prefillName={guestName}
          prefillPhone={whatsappNumber}
          prefillEmail={guestEmail}
          razorpayOrderId={razorpayOrderId}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}

      {/* View Passes Modal */}
      {viewingPassesReg && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh] animate-scale-up">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg">Your Entry Tickets</h3>
                <p className="text-xs text-zinc-500">{viewingPassesReg.event_title}</p>
              </div>
              <button 
                type="button"
                onClick={() => setViewingPassesReg(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <p className="text-sm text-zinc-500 text-center">
                Present these QR codes at the venue entrance for verification.
              </p>
              
              <div className="space-y-6">
                {!viewingPassesReg.passes || viewingPassesReg.passes.length === 0 ? (
                  <div className="text-center p-8 text-zinc-400 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-zinc-300 animate-pulse" />
                    <p className="text-sm">Passes are still generating. Please refresh in a moment!</p>
                  </div>
                ) : (
                  viewingPassesReg.passes.map((pass: any, index: number) => {
                    const qrUrl = pass.qr_image_url 
                      ? pass.qr_image_url.replace("localhost", typeof window !== "undefined" ? window.location.hostname : "localhost").replace("127.0.0.1", typeof window !== "undefined" ? window.location.hostname : "localhost")
                      : "";
                      
                    return (
                      <div key={pass.pass_id} className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 flex flex-col items-center text-center gap-4 relative overflow-hidden">
                        {/* Decorative side ticket cuts */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-white border-r border-zinc-200 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-white border-l border-zinc-200 -translate-y-1/2"></div>
                        
                        <div>
                          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-100 uppercase tracking-wide">
                            Pass {index + 1} of {viewingPassesReg.passes.length}
                          </span>
                          <p className="text-[10px] text-zinc-400 font-mono mt-1.5 select-all">ID: {pass.pass_id}</p>
                        </div>
                        
                        {qrUrl ? (
                          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
                            <img 
                              src={qrUrl} 
                              alt={`QR Ticket Pass ${index + 1}`}
                              className="w-48 h-48 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-48 h-48 bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200 text-zinc-400 text-xs">
                            Generating QR Code...
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${pass.status === 'used' ? 'bg-zinc-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                            {pass.status === 'used' ? 'Used / Checked In' : 'Active / Unused'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPassesReg(null)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-zinc-900/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Event Details Modal */}
      {viewingDetailsEvent && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh] animate-scale-up">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {viewingDetailsEvent.category}
                </span>
                <h3 className="font-bold text-zinc-900 text-lg mt-1">{viewingDetailsEvent.title}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingDetailsEvent(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
              {viewingDetailsEvent.is_members_only && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>This event is restricted for registered Samaj members only.</span>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold text-zinc-400 text-xs uppercase tracking-wider">Description</h4>
                <p className="text-zinc-600 leading-relaxed">{viewingDetailsEvent.description || "No detailed description provided."}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">Date & Time</p>
                    <p className="text-xs text-zinc-500">{formatDateTime12Hour(viewingDetailsEvent.start_datetime)}</p>
                  </div>
                </div>
                {viewingDetailsEvent.venue && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">Venue</p>
                      <p className="text-xs text-zinc-500">{viewingDetailsEvent.venue}</p>
                    </div>
                  </div>
                )}
              </div>

              {viewingDetailsEvent.timeline && viewingDetailsEvent.timeline.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-zinc-100">
                  <h4 className="font-semibold text-zinc-400 text-xs uppercase tracking-wider">Event Schedule</h4>
                  <div className="space-y-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    {viewingDetailsEvent.timeline.map((item: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="font-bold text-amber-600 w-20 flex-shrink-0">{formatTime12Hour(item.time)}</span>
                        <span className="text-zinc-700 font-medium">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingDetailsEvent(null)}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-sm rounded-xl transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const evt = viewingDetailsEvent;
                  setViewingDetailsEvent(null);
                  handleRegisterClick(evt);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Book a Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
