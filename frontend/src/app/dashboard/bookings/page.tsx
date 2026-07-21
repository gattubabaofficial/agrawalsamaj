"use client";

import { Calendar, Home, MapPin, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatDateDDMonthYYYY } from "@/utils/date";
import PaymentGateway from "@/components/PaymentGateway";
import CustomDatePicker from "@/components/CustomDatePicker";

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [calculatedAmount, setCalculatedAmount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/bookings/`, { headers }),
        axios.get(`${getApiBaseUrl()}/bookings/rooms`, { headers })
      ]);
      
      setBookings(bookingsRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      console.error("Failed to fetch bookings data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookClick = (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.room_id === selectedRoomId);
    if (!room) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    if (days <= 0) {
      alert("End date must be after start date.");
      return;
    }
    
    setCalculatedAmount(days * room.price_per_day);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentGateway(false);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/bookings/`,
        {
          room_id: selectedRoomId,
          start_date: startDate,
          end_date: endDate,
          notes: notes,
          payment_mode: "upi"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Booking confirmed successfully!");
      setShowNewBooking(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Booking failed");
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${getApiBaseUrl()}/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Booking cancelled.");
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to cancel booking");
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Bookings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your Bhavan hall and room reservations.</p>
        </div>
        <button 
          onClick={() => setShowNewBooking(!showNewBooking)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          {showNewBooking ? "Close form" : "New Booking"}
        </button>
      </div>

      {showNewBooking && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Request a New Booking</h2>
          <form onSubmit={handleBookClick} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Select Room/Hall</label>
                <select 
                  required 
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-sm"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- Choose an option --</option>
                  {rooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>{r.name} - ₹{r.price_per_day}/day</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Check-in Date *</label>
                  <CustomDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    min={new Date().toISOString().split("T")[0]}
                    required
                    placeholder="Check-in Date (e.g. 21 Jul 2026)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Check-out Date *</label>
                  <CustomDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    required
                    placeholder="Check-out Date (e.g. 25 Jul 2026)"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Notes / Purpose</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Marriage Function" />
            </div>
            <button type="submit" className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
              Proceed to Payment
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {bookings.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500">
            You don't have any bookings yet.
          </div>
        ) : (
          bookings.map(booking => {
            const roomName = rooms.find(r => r.room_id === booking.room_id)?.name || "Unknown Room";
            const isCancelled = booking.booking_status === "cancelled";

            return (
              <div key={booking.booking_id} className={`bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6 sm:p-8 ${isCancelled ? "opacity-60" : ""}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-zinc-100">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${isCancelled ? "bg-red-100 text-red-700" : booking.booking_status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {booking.booking_status.toUpperCase()}
                      </span>
                      <span className="text-sm text-zinc-500 font-medium">ID: {booking.booking_id.split("-")[0].toUpperCase()}</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">{roomName}</h3>
                    {booking.notes && <p className="text-sm text-zinc-500 mt-1">{booking.notes}</p>}
                  </div>
                  
                  <div className="text-left md:text-right">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className={`text-2xl font-bold ${isCancelled ? "text-zinc-400 line-through" : "text-zinc-900"}`}>₹{booking.total_amount.toFixed(2)}</p>
                    <p className={`text-xs font-medium mt-1 ${booking.payment_status === "paid" ? "text-emerald-600" : "text-rose-500"}`}>
                      Payment: {booking.payment_status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Check-in</p>
                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      {formatDateDDMonthYYYY(booking.start_date)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Check-out</p>
                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      {formatDateDDMonthYYYY(booking.end_date)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Location</p>
                    <div className="flex items-center gap-2 text-zinc-900 font-medium">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      Agrawal Bhavan
                    </div>
                  </div>
                </div>

                {!isCancelled && (
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => handleCancelBooking(booking.booking_id)}
                      className="px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showPaymentGateway && (
        <PaymentGateway
          amount={calculatedAmount}
          purpose={`Bhavan Booking (${startDate} to ${endDate})`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}
    </div>
  );
}
