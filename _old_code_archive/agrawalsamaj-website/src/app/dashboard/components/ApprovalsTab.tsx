"use client";

interface ApprovalsTabProps {
  members: any[];
  bookings: any[];
  handleApproveMember: (samaj_id: string) => void;
  handleRejectMember: (samaj_id: string) => void;
  handleApproveBooking: (id: number) => void;
  handleRejectBooking: (id: number) => void;
}

export default function ApprovalsTab({
  members,
  bookings,
  handleApproveMember,
  handleRejectMember,
  handleApproveBooking,
  handleRejectBooking,
}: ApprovalsTabProps) {
  const pendingMembers = members.filter(m => m.status === "PENDING" || m.approval_status === "PENDING");
  const pendingBookings = bookings.filter(b => b.status === "PENDING");

  return (
    <div className="flex flex-col gap-6 text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Approve newly registered member family profiles and Bhavan facility bookings</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          Pending Samaj Member Registrations
        </h3>
        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <th className="p-4">Name</th>
                <th className="p-4">Family ID</th>
                <th className="p-4">Colony & Area</th>
                <th className="p-4">Profession</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingMembers.map((m) => (
                <tr key={m.samaj_id} className="text-gray-800">
                  <td className="p-4 font-bold text-gray-950">{m.first_name} {m.last_name}</td>
                  <td className="p-4">{m.family_id || "None"}</td>
                  <td className="p-4">{m.address?.colony || "-"}, {m.address?.area || "-"}</td>
                  <td className="p-4 uppercase text-muted-text">{m.profession || "-"}</td>
                  <td className="p-4 flex gap-2 justify-center">
                    <button
                      onClick={() => handleApproveMember(m.samaj_id)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectMember(m.samaj_id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {pendingMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">No pending registrations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          Pending Bhavan Bookings
        </h3>
        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <th className="p-4">Facility</th>
                <th className="p-4">Applicant</th>
                <th className="p-4">Date</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingBookings.map((b) => (
                <tr key={b.id} className="text-gray-800">
                  <td className="p-4 font-bold text-gray-950">
                    {b.facility?.name} {b.facility?.floor ? `(Floor: ${b.facility.floor})` : ""}
                  </td>
                  <td className="p-4">
                    {b.user?.first_name} {b.user?.last_name}
                  </td>
                  <td className="p-4">
                    {new Date(b.booking_start).toLocaleDateString()}
                  </td>
                  <td className="p-4 uppercase text-muted-text">ONLINE</td>
                  <td className="p-4 flex gap-2 justify-center">
                    <button
                      onClick={() => handleApproveBooking(b.id)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleRejectBooking(b.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {pendingBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">No pending bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
