"use client";

import DatePicker from "react-datepicker";

interface EventsTabProps {
  events: any[];
  newEvent: any;
  setNewEvent: any;
  handleCreateEvent: (e: React.FormEvent) => void;
  pendingPayments: any[];
  handleVerifyPayment: (id: number, status: string) => void;
}

export default function EventsTab({
  events,
  newEvent,
  setNewEvent,
  handleCreateEvent,
  pendingPayments,
  handleVerifyPayment,
}: EventsTabProps) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Create and oversee community events.</p>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
        <h3 className="font-extrabold text-lg text-gray-900 mb-4">Create New Event</h3>
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="Event Title" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
          <input required placeholder="Location" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
          <DatePicker
            selected={newEvent.start_date}
            onChange={(date: Date | null) => setNewEvent({ ...newEvent, start_date: date })}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            className="p-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white w-full"
            placeholderText="Start Date & Time"
            required
          />
          <DatePicker
            selected={newEvent.end_date}
            onChange={(date: Date | null) => setNewEvent({ ...newEvent, end_date: date })}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            className="p-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 bg-white w-full"
            placeholderText="End Date & Time"
            required
          />
          <select className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-bold text-black" value={newEvent.visibility} onChange={e => setNewEvent({...newEvent, visibility: e.target.value})}>
            <option value="PUBLIC">Public</option>
            <option value="MEMBERS_ONLY">Members Only</option>
          </select>
          <input required type="number" placeholder="Capacity" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black" value={newEvent.capacity || ""} onChange={e => setNewEvent({...newEvent, capacity: parseInt(e.target.value) || 0})} />
          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl bg-white">
            <input type="checkbox" checked={newEvent.is_paid} onChange={e => setNewEvent({...newEvent, is_paid: e.target.checked})} className="w-5 h-5 text-bhagwa rounded" />
            <span className="font-semibold text-xs text-gray-700">Paid Event</span>
          </label>
          {newEvent.is_paid && (
            <input required type="number" placeholder="Fee Amount (₹)" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black" value={newEvent.fee_amount || ""} onChange={e => setNewEvent({...newEvent, fee_amount: parseFloat(e.target.value) || 0})} />
          )}
          <textarea required placeholder="Description" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black md:col-span-2" rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
          <button type="submit" className="md:col-span-2 bg-bhagwa text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-md shadow-bhagwa/20 text-xs">Publish Event</button>
        </form>
      </div>
      
      <div className="flex flex-col gap-4 mt-2">
        <h3 className="font-extrabold text-lg text-gray-900">Upcoming & Past Events</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {events.map((ev: any) => (
            <div key={ev.id} className="border border-gray-100 bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 text-lg">{ev.title}</h4>
                <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{ev.visibility}</span>
              </div>
              <p className="text-xs text-bhagwa font-bold">{new Date(ev.start_date).toLocaleString()} — {new Date(ev.end_date).toLocaleString()}</p>
              <p className="text-xs text-gray-700 font-semibold">{ev.location} &bull; Capacity: {ev.capacity}</p>
              {ev.is_paid ? <p className="text-xs font-bold text-green-600">Paid Event (₹{ev.fee_amount})</p> : <p className="text-xs font-bold text-gray-500">Free Event</p>}
              <p className="text-sm mt-2 text-gray-600">{ev.description}</p>
            </div>
          ))}
          {events.length === 0 && <p className="text-gray-500 text-sm font-medium">No events found in catalog.</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-6 border-t border-gray-200 pt-6">
        <h3 className="font-extrabold text-lg text-gray-900">Pending Offline Payments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingPayments.map((pay: any) => (
            <div key={pay.id} className="border border-gray-200 bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">Payment #{pay.id}</span>
                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">PENDING</span>
              </div>
              <p className="text-sm text-gray-600">User ID: <span className="font-semibold">{pay.samaj_id}</span></p>
              <p className="text-sm text-gray-600">Amount: <span className="font-bold text-gray-900">₹{pay.amount}</span></p>
              <p className="text-sm text-gray-600">Purpose: <span className="font-semibold">{pay.purpose}</span> (Ref: {pay.reference_id})</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleVerifyPayment(pay.id, "COMPLETED")} className="flex-1 bg-green-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-green-700">Approve</button>
                <button onClick={() => handleVerifyPayment(pay.id, "FAILED")} className="flex-1 bg-red-50 text-red-600 text-sm font-bold py-2 rounded-xl hover:bg-red-100">Reject</button>
              </div>
            </div>
          ))}
          {pendingPayments.length === 0 && <p className="text-gray-500 text-sm font-medium">No pending offline payments.</p>}
        </div>
      </div>
    </div>
  );
}
