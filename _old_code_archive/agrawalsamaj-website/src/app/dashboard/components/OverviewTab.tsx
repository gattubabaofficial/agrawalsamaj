"use client";

interface OverviewTabProps {
  userRole: "ADMIN" | "MEMBER" | "USER";
  currentUser: any;
  stats: any;
  myFamily: any;
  bookings: any[];
  handleApplyMembership: () => void;
  setActiveTab: (tab: any) => void;
}

export default function OverviewTab({
  userRole,
  currentUser,
  stats,
  myFamily,
  bookings,
  handleApplyMembership,
  setActiveTab,
}: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-6 text-black">
      {userRole === "ADMIN" && (
        <>
          <div>
            <p className="text-xs text-muted-text mt-0.5 font-semibold">Real-time stats and metrics for Agrawal Samaj</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Total Members</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total_members}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Families Catalog</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total_families}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Active Bookings</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.active_bookings}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <span className="text-xs font-bold text-muted-text uppercase tracking-wider">Samaj Funds</span>
              <p className="text-2xl font-black text-bhagwa mt-1">₹{(stats.samaj_funds || 0).toLocaleString()}</p>
            </div>
          </div>
        </>
      )}

      {userRole === "USER" && currentUser?.status === "NOT_APPLIED" && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h4 className="font-bold text-base">Become a verified Samaj Member!</h4>
              <p className="text-xs font-medium mt-1 opacity-80">Apply for official membership to gain access to the directory, private chats, event creation, and booking benefits.</p>
            </div>
          </div>
          <button onClick={handleApplyMembership} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-md shadow-blue-600/20">
            Apply Now
          </button>
        </div>
      )}

      <div className="border border-orange-100/60 bg-orange-50/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-gray-900">Your Registered Family profile</h3>
          <p className="text-xs text-gray-500 mt-0.5 font-semibold">Add additional members to keep directory list complete.</p>
          <div className="flex gap-4 mt-3 text-xs font-bold text-gray-700">
            <p>Family ID: <span className="text-bhagwa font-bold">{myFamily?.family_code || "Not Registered"}</span></p>
            <p>Members Count: <span className="text-bhagwa font-bold">{myFamily?.members?.length || 0}</span></p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab("FAMILY")}
          className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all w-fit shadow-md shadow-bhagwa/10"
        >
          Manage Family members
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-base text-gray-900">Your Facility Reservations</h3>
        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <th className="p-4">Facility Name</th>
                <th className="p-4">Booking Date</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="text-gray-800">
                  <td className="p-4 font-bold text-gray-950">{b.facility?.name}</td>
                  <td className="p-4">{new Date(b.booking_start).toLocaleDateString()}</td>
                  <td className="p-4 uppercase text-muted-text">ONLINE</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      b.status === "CONFIRMED" ? "bg-green-50 text-green-700" : "bg-orange-50 text-bhagwa"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">No facility reservations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
