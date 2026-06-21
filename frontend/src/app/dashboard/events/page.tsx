"use client";

import { Calendar, MapPin, Clock, Ticket, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import PaymentGateway from "@/components/PaymentGateway";

export default function UserEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [passCount, setPassCount] = useState(1);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [eventsRes, regRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/events/`, { headers }),
        axios.get(`${getApiBaseUrl()}/events/my-registrations`, { headers })
      ]);
      
      setEvents(eventsRes.data);
      setMyRegistrations(regRes.data);
    } catch (error) {
      console.error("Failed to fetch events data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = (event: any) => {
    setSelectedEvent(event);
    setPassCount(1);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentGateway(false);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/events/${selectedEvent.event_id}/register`,
        { pass_count: passCount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Successfully registered for the event!");
      fetchData(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.detail || "Registration failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

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
                      <span>{new Date(event.start_datetime).toLocaleDateString()}</span>
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
                          <span className="font-semibold text-amber-600 w-12 flex-shrink-0">{item.time}</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {event.timeline.length > 3 && (
                        <p className="text-xs text-zinc-400 italic">+{event.timeline.length - 3} more activities</p>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div className="text-sm font-bold text-zinc-900">
                      ₹ {event.pass_price.toFixed(2)} <span className="text-xs text-zinc-500 font-medium">/ pass</span>
                    </div>
                    <button 
                      onClick={() => handleRegisterClick(event)}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      Register Now
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
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {new Date(reg.event_start).toLocaleDateString()}</span>
                    {reg.event_venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {reg.event_venue}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">{reg.pass_count} Passes</p>
                    <p className="text-xs text-emerald-600 font-semibold">{reg.payment_status}</p>
                  </div>
                  <button className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> QR
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showPaymentGateway && selectedEvent && (
        <PaymentGateway
          amount={selectedEvent.pass_price * passCount}
          purpose={`Registration for ${selectedEvent.title} (${passCount} passes)`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}
    </div>
  );
}
