"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, Search, Home, Plus, X, MapPin } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"bookings" | "rooms">("bookings");
  const [rooms, setRooms] = useState<any[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);

  // New Room Form State
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("room");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [description, setDescription] = useState("");
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [bRes, rRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/bookings/all`, { headers }),
        axios.get(`${getApiBaseUrl()}/bookings/rooms`, { headers })
      ]);
      setBookings(bRes.data);
      setRooms(rRes.data);
    } catch (error) {
      console.error("Failed to fetch bookings data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRoom(true);
    try {
      const token = localStorage.getItem("token");
      
      // Convert comma-separated string to list, then map to dictionary (backend currently accepts dict, but we can send an array or an object)
      // Wait, backend expects amenities: Optional[dict] = None
      // We'll store it as { "features": ["AC", "TV"] } or similar
      const features = amenitiesInput.split(",").map(a => a.trim()).filter(a => a);
      const amenitiesPayload = { features };

      const payload = {
        name: roomName,
        type: roomType,
        room_number: roomNumber || null,
        floor: floor || null,
        capacity: capacity ? parseInt(capacity) : null,
        price_per_day: parseFloat(pricePerDay),
        description: description || null,
        amenities: amenitiesPayload
      };

      await axios.post(`${getApiBaseUrl()}/bookings/rooms`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Room added successfully!");
      setShowAddRoom(false);
      setRoomName(""); setRoomType("room"); setRoomNumber(""); setFloor("");
      setCapacity(""); setPricePerDay(""); setAmenitiesInput(""); setDescription("");
      
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to add room.");
    } finally {
      setIsSavingRoom(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bhavan Bookings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage hall reservations and Bhavan rooms.</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "bookings" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            All Bookings
          </button>
          <button 
            onClick={() => setActiveTab("rooms")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "rooms" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            Manage Rooms
          </button>
        </div>
      </div>

      {activeTab === "bookings" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search Bookings..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-white">
                  <th className="px-6 py-4 font-medium">Booking Details</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No bookings found.</td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.booking_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">{b.room_name}</p>
                        <p className="text-xs text-zinc-500">ID: {b.booking_id.split("-")[0].toUpperCase()}</p>
                        {b.notes && <p className="text-xs text-zinc-400 mt-1 truncate max-w-xs">{b.notes}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-900 font-medium">{b.user_name}</p>
                        <p className="text-xs text-zinc-500">{b.user_mobile || "No Mobile"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-900">{new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">₹{b.total_amount.toFixed(2)}</p>
                        <span className={`text-xs font-medium uppercase ${b.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {b.payment_status} ({b.payment_mode})
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                          b.booking_status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          b.booking_status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {b.booking_status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                          {b.booking_status === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                          {b.booking_status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                          {b.booking_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowAddRoom(!showAddRoom)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {showAddRoom ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddRoom ? "Cancel" : "Add New Room"}
            </button>
          </div>

          {showAddRoom && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 sm:p-8">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Create New Room / Hall</h2>
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Room Name</label>
                    <input required type="text" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g. Grand Banquet Hall" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Type</label>
                    <select value={roomType} onChange={e => setRoomType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white">
                      <option value="room">Room</option>
                      <option value="hall">Hall</option>
                      <option value="facility">Facility</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Floor</label>
                    <input type="text" value={floor} onChange={e => setFloor(e.target.value)} placeholder="e.g. Ground Floor" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Room Number</label>
                    <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. 101" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Price Per Day (₹)</label>
                    <input required type="number" min="0" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} placeholder="e.g. 1500" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Capacity (Persons)</label>
                    <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 200" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Amenities (Comma separated)</label>
                    <input type="text" value={amenitiesInput} onChange={e => setAmenitiesInput(e.target.value)} placeholder="e.g. AC, Attached Bath, Projector" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional details..." className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"></textarea>
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={isSavingRoom} className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
                    {isSavingRoom ? "Saving..." : "Save Room"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rooms.map(r => (
              <div key={r.room_id} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">{r.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase rounded">{r.type}</span>
                      {r.room_number && <span className="text-xs text-zinc-500 font-medium">#{r.room_number}</span>}
                      {r.floor && <span className="text-xs text-zinc-500 font-medium">({r.floor})</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">₹{r.price_per_day}</p>
                    <p className="text-xs text-zinc-500 font-medium">Per Day</p>
                  </div>
                </div>
                {r.description && <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{r.description}</p>}
                
                {r.amenities && r.amenities.features && r.amenities.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-zinc-100">
                    {r.amenities.features.map((feature: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-100">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
