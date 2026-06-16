"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Calendar, MapPin, Clock, Ticket, CheckCircle2, QrCode, X } from "lucide-react";

interface EventItem {
  id: number;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  category?: string;
  price?: number;
  timeline?: { time: string; activity: string }[];
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [passQty, setPassQty] = useState(1);
  const [purchasedTicket, setPurchasedTicket] = useState<{ qrCode: string; qty: number; total: number } | null>(null);

  // Fallback Mock Events
  const mockEvents: EventItem[] = [
    {
      id: 1,
      title: "Maharaja Agrasen Jayanti Samaroh",
      description: "Annual grand celebration commemorating Maharaja Agrasen with cultural performances, heritage exhibition, and community feast.",
      location: "Agrawal Samaj Bhavan, Mansarovar, Jaipur",
      start_date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
      end_date: new Date(Date.now() + 86400000 * 5 + 3600000 * 4).toISOString(),
      category: "Festival",
      price: 150,
      timeline: [
        { time: "09:00 AM", activity: "Pooja & Hawan" },
        { time: "11:00 AM", activity: "Flag Hoisting & Welcome Speech" },
        { time: "12:30 PM", activity: "Exhibition & Gallery Opening" },
        { time: "01:30 PM", activity: "Community Bhoj (Lunch)" },
        { time: "04:00 PM", activity: "Cultural Dance & Drama Programs" },
        { time: "07:00 PM", activity: "Prize Distribution & Closing Ceremony" }
      ]
    },
    {
      id: 2,
      title: "Samaj Career & Business Conclave",
      description: "Connecting young professionals and startup entrepreneurs within the Agrawal community. Includes keynote panels and networking tables.",
      location: "Main Exhibition Hall, Jaipur",
      start_date: new Date(Date.now() + 86400000 * 12).toISOString(), // 12 days from now
      end_date: new Date(Date.now() + 86400000 * 12 + 3600000 * 6).toISOString(),
      category: "Conclave",
      price: 0,
      timeline: [
        { time: "10:00 AM", activity: "Registrations & Morning Tea" },
        { time: "10:30 AM", activity: "Panel Discussion: Future of Agrawal Businesses" },
        { time: "01:00 PM", activity: "Lunch & Networking" },
        { time: "02:30 PM", activity: "Pitch Session & Startup Mentorship" }
      ]
    },
    {
      id: 3,
      title: "Community Free Health & Dental Camp",
      description: "A free consultation and health-checkup drive for all members of the Samaj, organized in partnership with Fortis Hospitals.",
      location: "Bhavan Seminar Room, Jaipur",
      start_date: new Date(Date.now() + 86400000 * 20).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 20 + 3600000 * 5).toISOString(),
      category: "Welfare",
      price: 0,
      timeline: [
        { time: "08:00 AM", activity: "Camp Registration Opens" },
        { time: "09:00 AM", activity: "General Medical Consultations" },
        { time: "11:00 AM", activity: "Specialist Cardiology Seminar" },
        { time: "01:00 PM", activity: "Closing & Medicine Distribution" }
      ]
    }
  ];

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await axios.get("http://localhost:8000/api/v1/events");
        if (res.data && res.data.length > 0) {
          setEvents(res.data);
        } else {
          setEvents(mockEvents);
        }
      } catch (err) {
        console.warn("Backend API not reachable. Using mock events.", err);
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
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

  const handlePurchase = () => {
    if (!selectedEvent) return;
    setPurchasedTicket({
      qrCode: `AS-EVT-${selectedEvent.id}-${Math.floor(100000 + Math.random() * 900000)}`,
      qty: passQty,
      total: (selectedEvent.price || 0) * passQty,
    });
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
              Explore scheduled programs, view detailed timelines, secure your entry passes, and stay connected with the Agrawal Samaj.
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
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="border border-light-border bg-white rounded-2xl p-6 flex flex-col gap-5 hover:shadow-xl hover:border-bhagwa/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bhagwa bg-orange-50 border border-orange-100 px-3 py-1 rounded-full uppercase">
                      {evt.category || "General"}
                    </span>
                    <span className="font-black text-sm text-gray-900">
                      {evt.price && evt.price > 0 ? `₹${evt.price} / Pass` : "Free Event"}
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
                    onClick={() => {
                      setSelectedEvent(evt);
                      setPassQty(1);
                      setPurchasedTicket(null);
                    }}
                    className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-bhagwa/10 transition-all mt-auto flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    {evt.price && evt.price > 0 ? "Book Pass" : "Register Free"}
                  </button>
                </div>
              ))}
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
                    <span className="text-xs font-bold text-bhagwa tracking-wider uppercase bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                      {selectedEvent.category || "General"}
                    </span>
                    <h3 className="font-extrabold text-2xl mt-3 leading-tight">{selectedEvent.title}</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">{selectedEvent.location}</p>
                  </div>

                  {/* Program Timeline */}
                  {selectedEvent.timeline && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-text mb-1">Program Schedule</h4>
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                        {selectedEvent.timeline.map((item, idx) => (
                          <div key={idx} className="flex gap-3 text-xs font-medium">
                            <span className="text-bhagwa font-bold whitespace-nowrap">{item.time}</span>
                            <span className="text-gray-700">{item.activity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing and Qty selection */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-muted-text font-bold uppercase tracking-wider">Pass Tariff</p>
                      <p className="text-lg font-black text-gray-900">
                        {selectedEvent.price && selectedEvent.price > 0 ? `₹${selectedEvent.price}` : "Free Entry"}
                      </p>
                    </div>

                    {selectedEvent.price && selectedEvent.price > 0 ? (
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setPassQty(Math.max(1, passQty - 1))}
                          className="px-3 py-1 bg-gray-50 text-gray-600 font-bold hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 text-sm font-bold">{passQty}</span>
                        <button
                          onClick={() => setPassQty(passQty + 1)}
                          className="px-3 py-1 bg-gray-50 text-gray-600 font-bold hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 font-bold">Standard Registration</p>
                    )}
                  </div>

                  {selectedEvent.price && selectedEvent.price > 0 && (
                    <div className="flex justify-between items-center bg-orange-50/50 border border-orange-100/50 p-4 rounded-xl">
                      <span className="text-sm font-bold text-gray-700">Subtotal Amount:</span>
                      <span className="text-lg font-black text-bhagwa">₹{selectedEvent.price * passQty}</span>
                    </div>
                  )}

                  <button
                    onClick={handlePurchase}
                    className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15"
                  >
                    Confirm & Proceed Payment
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-gray-900">Pass Generated!</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      Your QR entry ticket details have been sent successfully.
                    </p>
                  </div>

                  {/* QR Display Card */}
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col items-center gap-4 w-full">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                      <QrCode className="w-40 h-40 text-gray-900" />
                    </div>
                    <div className="text-xs font-semibold text-muted-text uppercase tracking-wider flex flex-col gap-1">
                      <p>Ticket ID: <span className="font-bold text-gray-900">{purchasedTicket.qrCode}</span></p>
                      <p>Number of Passes: <span className="font-bold text-gray-900">{purchasedTicket.qty}</span></p>
                      {purchasedTicket.total > 0 && (
                        <p>Total Paid: <span className="font-bold text-gray-900">₹{purchasedTicket.total}</span></p>
                      )}
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
