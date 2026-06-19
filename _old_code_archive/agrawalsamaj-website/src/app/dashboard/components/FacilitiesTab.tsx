"use client";

interface FacilitiesTabProps {
  facilities: any[];
  newFacility: any;
  setNewFacility: any;
  handleCreateFacility: (e: React.FormEvent) => void;
}

export default function FacilitiesTab({
  facilities,
  newFacility,
  setNewFacility,
  handleCreateFacility,
}: FacilitiesTabProps) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Create and manage rooms, halls, and open lawns for Bhavan bookings.</p>
      </div>
      
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
        <h3 className="font-extrabold text-lg text-gray-900 mb-4">Create New Facility</h3>
        <form onSubmit={handleCreateFacility} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Facility Name</label>
            <input required placeholder="e.g. Maharaja Agrasen Suite (AC)" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black focus:border-bhagwa outline-none" value={newFacility.name} onChange={e => setNewFacility({...newFacility, name: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Facility Type</label>
            <select className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-bold text-black focus:border-bhagwa outline-none" value={newFacility.type} onChange={e => setNewFacility({...newFacility, type: e.target.value})}>
              <option value="ROOM">ROOM</option>
              <option value="HALL">HALL</option>
              <option value="GROUND">GROUND</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Price per Day (₹)</label>
            <input required type="number" placeholder="e.g. 1200" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black focus:border-bhagwa outline-none" value={newFacility.price_per_day || ""} onChange={e => setNewFacility({...newFacility, price_per_day: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Capacity</label>
            <input required type="number" placeholder="e.g. 250" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black focus:border-bhagwa outline-none" value={newFacility.capacity || ""} onChange={e => setNewFacility({...newFacility, capacity: parseInt(e.target.value) || 0})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Floor / Level</label>
            <input placeholder="e.g. Ground Floor, 1st Floor" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black focus:border-bhagwa outline-none" value={newFacility.floor} onChange={e => setNewFacility({...newFacility, floor: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Image URL</label>
            <input placeholder="e.g. /images/suite.jpg" className="p-3 border border-gray-200 rounded-xl bg-white text-xs font-semibold text-black focus:border-bhagwa outline-none" value={newFacility.image_url} onChange={e => setNewFacility({...newFacility, image_url: e.target.value})} />
          </div>
          <button type="submit" className="md:col-span-2 bg-bhagwa text-white font-bold py-3 rounded-xl hover:bg-orange-600 shadow-md shadow-bhagwa/20 text-xs">Create Facility</button>
        </form>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <h3 className="font-extrabold text-lg text-gray-900">Registered Facilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilities.map((fac: any) => (
            <div key={fac.id} className="border border-gray-100 bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 text-lg">{fac.name}</h4>
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-bhagwa rounded-lg uppercase">{fac.type}</span>
              </div>
              <p className="text-xs text-bhagwa font-bold">₹{fac.price_per_day} / Day</p>
              <p className="text-xs text-gray-700 font-semibold">{fac.floor ? `Floor: ${fac.floor}` : "All Floors"} &bull; Capacity: {fac.capacity} guests</p>
              <span className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded-lg w-fit font-bold mt-1">{fac.status}</span>
            </div>
          ))}
          {facilities.length === 0 && <p className="text-gray-500 text-sm font-medium">No facilities found. Create one above to enable bookings.</p>}
        </div>
      </div>
    </div>
  );
}
