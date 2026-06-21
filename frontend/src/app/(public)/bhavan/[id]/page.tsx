"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Users, MapPin, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import Link from "next/link";
import PaymentGateway from "@/components/PaymentGateway";

export default function RoomBookingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Date State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState<"none" | "pending_venue" | "verified">("none");
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    // Check login status first!
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/login?next=/bhavan/${roomId}`);
      return;
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
  }, [roomId, router]);

  // Calculate total amount when dates change
  useEffect(() => {
    if (startDate && endDate && room) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        setTotalAmount(diffDays * room.price_per_day);
      } else {
        setTotalAmount(0);
      }
    }
  }, [startDate, endDate, room]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalAmount <= 0) {
      setError("End date must be after start date.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        room_id: roomId,
        start_date: startDate,
        end_date: endDate,
        payment_mode: paymentMode,
        notes: notes || undefined
      };

      const res = await axios.post(`${getApiBaseUrl()}/bookings/`, payload, { headers });
      
      const { payment_status, razorpay_order_id } = res.data;
      
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

  const handlePaymentSuccess = () => {
    setShowPaymentGateway(false);
    setSuccessStatus("verified");
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
                <p className="text-zinc-500 mt-2">Your request is pending admin approval. Please pay ₹{totalAmount} at the venue.</p>
              ) : (
                <p className="text-zinc-500 mt-2">Your booking has been confirmed. The admin will verify and approve it shortly.</p>
              )}
            </div>
            <Link href="/dashboard/bookings" className="inline-block mt-8 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
              View My Bookings
            </Link>
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
                <p className="text-zinc-600 leading-relaxed mb-8">{room.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 mb-8">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Capacity</p>
                      <p className="text-sm text-zinc-500">{room.capacity || "N/A"} Persons</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Price per Day</p>
                      <p className="text-sm text-zinc-500">₹{room.price_per_day}</p>
                    </div>
                  </div>
                </div>

                {room.amenities && room.amenities.features && room.amenities.features.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {room.amenities.features.map((feature: string, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 text-sm font-medium rounded-lg shadow-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Form Card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sticky top-24">
                <h3 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" /> Book Facility
                </h3>
                
                <form onSubmit={handleBook} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Start Date *</label>
                      <input 
                        type="date" 
                        required 
                        min={new Date().toISOString().split("T")[0]}
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">End Date *</label>
                      <input 
                        type="date" 
                        required 
                        min={startDate || new Date().toISOString().split("T")[0]}
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Additional Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows={2} 
                      placeholder="Any special requests?" 
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" 
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between font-bold text-zinc-900 mb-2">
                      <span>Total Amount</span>
                      <span className="text-xl text-emerald-600">₹{totalAmount}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "upi" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="upi" checked={paymentMode === "upi"} onChange={() => setPaymentMode("upi")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-sm font-semibold text-zinc-800">Pay Online Now</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${paymentMode === "cash" ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                        <input type="radio" name="payment_mode" value="cash" checked={paymentMode === "cash"} onChange={() => setPaymentMode("cash")} className="text-amber-500 focus:ring-amber-500" />
                        <span className="text-sm font-semibold text-zinc-800">Pay at Venue (Cash)</span>
                      </label>
                    </div>
                  </div>

                  <button disabled={isSubmitting || totalAmount <= 0} type="submit" className="w-full py-3 mt-6 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                    {isSubmitting ? "Processing..." : (paymentMode === "upi" ? `Pay ₹${totalAmount}` : "Submit Request")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPaymentGateway && (
        <PaymentGateway 
          amount={totalAmount} 
          purpose={`Booking for ${room.name}`} 
          onSuccess={handlePaymentSuccess} 
          onCancel={handlePaymentCancel} 
        />
      )}
    </div>
  );
}
