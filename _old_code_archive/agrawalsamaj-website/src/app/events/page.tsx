"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getApiUrl } from "../../config";
import { Calendar, MapPin, Clock, Ticket, CheckCircle2, QrCode, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface EventItem {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  visibility: string;
  capacity: number;
  is_paid: boolean;
  fee_amount: number;
}

export default function Events() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>("ONLINE");
  const [purchasedTicket, setPurchasedTicket] = useState<{ qrCode: string; status: string; mode: string } | null>(null);

  const fetchRegistrations = async (token: string) => {
    try {
      const res = await axios.get(getApiUrl("/api/v1/events/my-registrations"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRegistrations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
        await fetchRegistrations(token);
      }
      try {
        const res = await axios.get(getApiUrl("/api/v1/events"));
        setEvents(res.data || []);
      } catch (err) {
        console.warn("Backend API not reachable.", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleRegisterClick = (evt: EventItem) => {
    if (!isLoggedIn) {
      alert("Please login first to register for events.");
      router.push("/login");
      return;
    }
    setSelectedEvent(evt);
    setPaymentMode(evt.is_paid ? "ONLINE" : "OFFLINE"); // Default mode
    setPurchasedTicket(null);
  };

  const handlePurchase = async () => {
    if (!selectedEvent) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.post(
        getApiUrl(`/api/v1/events/${selectedEvent.id}/register`),
        { payment_mode: selectedEvent.is_paid ? paymentMode : "OFFLINE" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPurchasedTicket({
        qrCode: `AS-EVT-${selectedEvent.id}-${res.data.id}`,
        status: res.data.payment_status,
        mode: res.data.payment_mode || "FREE"
      });
      
      await fetchRegistrations(token);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to register");
    }
  };

  const isRegistered = (eventId: number) => {
    return myRegistrations.some((reg) => reg.event_id === eventId);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-orange-50/50 to-white px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              Community <span className="text-bhagwa">Events</span> & Programs
            </h1>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Explore scheduled programs, secure your entry passes, and stay connected with the Agrawal Samaj.
            </p>
          </div>
        </section>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-bhagwa animate-spin" />
            <p className="font-bold text-muted-text text-sm">Fetching scheduled events...</p>
          </div>
        ) : (
          <section className="px-6 py-12 max-w-6xl mx-auto flex flex-col gap-10">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((evt) => {
                const registered = isRegistered(evt.id);
                return (
                <div
                  key={evt.id}
                  className="border border-light-border bg-white rounded-2xl p-6 flex flex-col gap-5 hover:shadow-xl hover:border-bhagwa/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bhagwa bg-orange-50 border border-orange-100 px-3 py-1 rounded-full uppercase">
                      {evt.visibility === "PUBLIC" ? "Public Event" : "Members Only"}
                    </span>
                    <span className="font-black text-sm text-gray-900">
                      {evt.is_paid ? `₹${evt.fee_amount} / Pass` : "Free Event"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xl text-gray-900 mb-2 leading-snug hover:text-bhagwa transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed font-medium">
                      {evt.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 text-sm text-muted-text font-medium border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-bhagwa" />
                      <span>{formatDate(evt.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-bhagwa" />
                      <span>
                        {formatTime(evt.start_date)} - {formatTime(evt.end_date)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-bhagwa shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{evt.location}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegisterClick(evt)}
                    disabled={registered}
                    className={`w-full py-3 rounded-xl text-sm font-bold shadow-md transition-all mt-auto flex items-center justify-center gap-2 ${
                      registered 
                      ? "bg-green-100 text-green-700 cursor-not-allowed shadow-none" 
                      : "bg-bhagwa hover:bg-bhagwa-hover text-white shadow-bhagwa/10"
                    }`}
                  >
                    {registered ? <CheckCircle2 className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                    {registered ? "Registered" : (evt.is_paid ? "Book Pass" : "Register Free")}
                  </button>
                </div>
              )})}
              {events.length === 0 && <p className="text-gray-500 font-medium col-span-full text-center">No events scheduled currently.</p>}
            </div>
          </section>
        )}

        {/* Modal Dialog for Booking Pass */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-black">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>

              {!purchasedTicket ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="font-extrabold text-2xl mt-3 leading-tight">{selectedEvent.title}</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">{selectedEvent.location}</p>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-muted-text font-bold uppercase tracking-wider">Pass Tariff</p>
                      <p className="text-lg font-black text-gray-900">
                        {selectedEvent.is_paid ? `₹${selectedEvent.fee_amount}` : "Free Entry"}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.is_paid && (
                    <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                      <p className="text-sm font-bold text-gray-800">Select Payment Mode</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="payment_mode" value="ONLINE" checked={paymentMode === "ONLINE"} onChange={() => setPaymentMode("ONLINE")} className="text-bhagwa" />
                          <span className="text-sm font-semibold text-gray-700">Pay Online Now</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="payment_mode" value="OFFLINE" checked={paymentMode === "OFFLINE"} onChange={() => setPaymentMode("OFFLINE")} className="text-bhagwa" />
                          <span className="text-sm font-semibold text-gray-700">Pay Offline (At Venue)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handlePurchase}
                    className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15"
                  >
                    Confirm Registration
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-gray-900">Registration Confirmed!</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      {purchasedTicket.mode === "OFFLINE" ? "Please complete your payment at the venue." : "Your registration is successful."}
                    </p>
                  </div>

                  {/* QR Display Card */}
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col items-center gap-4 w-full">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                      <QrCode className="w-40 h-40 text-gray-900" />
                    </div>
                    <div className="text-xs font-semibold text-muted-text uppercase tracking-wider flex flex-col gap-1">
                      <p>Ticket ID: <span className="font-bold text-gray-900">{purchasedTicket.qrCode}</span></p>
                      <p>Payment Mode: <span className="font-bold text-gray-900">{purchasedTicket.mode}</span></p>
                      <p>Status: <span className={`font-bold ${purchasedTicket.status === 'COMPLETED' ? 'text-green-600' : 'text-orange-600'}`}>{purchasedTicket.status}</span></p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="w-full bg-black text-white hover:bg-gray-800 py-3.5 rounded-xl text-sm font-bold"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
