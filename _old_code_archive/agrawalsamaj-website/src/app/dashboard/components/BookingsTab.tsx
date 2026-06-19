"use client";

interface BookingsTabProps {
  bookings: any[];
}

export default function BookingsTab({ bookings }: BookingsTabProps) {
  return (
    <div className="flex flex-col gap-6 text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Track and manage room, hall, and ground bookings</p>
      </div>

      <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-semibold">
          <thead>
            <tr className="bg-gray-50 text-muted-text border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <th className="p-4">Booked Facility</th>
              <th className="p-4">Applicant Name</th>
              <th className="p-4">Reserved Date</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Approval Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((b) => (
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
                <td colSpan={5} className="p-6 text-center text-gray-500">No bookings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
