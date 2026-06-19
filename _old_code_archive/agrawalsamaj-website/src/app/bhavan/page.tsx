"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Building2, Calendar as CalendarIcon, CheckCircle2, ChevronRight, Eye, Grid, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "../../config";

interface Facility {
  id: number;
  name: string;
  type: "ROOM" | "HALL" | "GROUND";
  capacity: string;
  tariff: number;
  description: string;
  amenities: string[];
  imageText: string;
}

export default function BhavanBooking() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<"ALL" | "ROOM" | "HALL" | "GROUND">("ALL");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<"G" | "1" | "2">("G");
  const [selectedRoomNum, setSelectedRoomNum] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [showRedirectAlert, setShowRedirectAlert] = useState(false);

  const [facilities, setFacilities] = useState<Facility[]>([]);

  const demoFacilities: Facility[] = [
    {
      id: 1,
      name: "Maharaja Agrasen Suite (AC)",
      type: "ROOM",
      capacity: "2-3 Adults",
      tariff: 1200,
      description: "Premium double-bed air-conditioned suite with sofa seating, attached modern bathroom, and television. Perfect for VIP guests.",
      amenities: ["AC", "Free Wifi", "TV", "Hot Water", "Room Service"],
      imageText: "AC Deluxe Suite",
    },
    {
      id: 2,
      name: "Standard AC Room",
      type: "ROOM",
      capacity: "2 Adults",
      tariff: 800,
      description: "Comfortable air-conditioned room with dual single beds, clean linens, and a attached bathroom.",
      amenities: ["AC", "Hot Water", "Attached Bath"],
      imageText: "Standard AC Room",
    },
    {
      id: 3,
      name: "Non-AC Standard Room",
      type: "ROOM",
      capacity: "2-3 Adults",
      tariff: 500,
      description: "Well-ventilated economy non-AC room with overhead ceiling fan, double bed, and basic seating.",
      amenities: ["Fan", "Attached Bath", "Economy pricing"],
      imageText: "Economy Room",
    },
    {
      id: 4,
      name: "Maharaja Agrasen Banquet Hall",
      type: "HALL",
      capacity: "500 Guests",
      tariff: 15000,
      description: "Gigantic air-conditioned wedding and reception banquet hall with grand stage, ceiling chandeliers, and attached changing rooms.",
      amenities: ["AC", "Large Stage", "Sofa Seating", "Attached Green Rooms", "Sound System"],
      imageText: "Grand Banquet Hall",
    },
    {
      id: 5,
      name: "Seminar & Conference Room",
      type: "HALL",
      capacity: "60 Guests",
      tariff: 3000,
      description: "Cozy air-conditioned mini-hall with whiteboards and overhead projector support. Ideal for business meetings and small lectures.",
      amenities: ["AC", "Projector", "Sound System", "Tables & Chairs"],
      imageText: "Conference Room",
    },
    {
      id: 6,
      name: "Agrasen Community Exhibition Ground",
      type: "GROUND",
      capacity: "1000+ Guests",
      tariff: 25000,
      description: "Massive outdoor green lawn and paved area for open-air marriage functions, trade fairs, and large community buffets.",
      amenities: ["Lawn area", "Power Backups", "Buffet Counters", "Water Connections"],
      imageText: "Exhibition Lawn",
    },
  ];

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await fetch(getApiUrl("/api/v1/facilities"));
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const mapped = data.map((f: any) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              capacity: `${f.capacity} Guests/Adults`,
              tariff: f.price_per_day,
              description: f.description || `${f.name} located at ${f.floor || 'Bhavan'}. Capacity: ${f.capacity} guests.`,
              amenities: f.type === "ROOM" ? ["AC", "Attached Bath", "Hot Water"] : f.type === "HALL" ? ["AC", "Sound System", "Stage"] : ["Lawn area", "Power Backup"],
              imageText: f.name
            }));
            setFacilities(mapped);
          } else {
            setFacilities(demoFacilities);
          }
        } else {
          setFacilities(demoFacilities);
        }
      } catch (err) {
        console.error("Error fetching facilities:", err);
        setFacilities(demoFacilities);
      }
    };
    fetchFacilities();
  }, []);

  const floorRooms = {
    G: ["H1 (Hall)", "H2 (Seminar)", "101 (Suite)", "102 (AC)", "103 (Non-AC)", "Office"],
    "1": ["201 (Suite)", "202 (AC)", "203 (AC)", "204 (Non-AC)", "205 (Non-AC)", "206 (Non-AC)"],
    "2": ["301 (Suite)", "302 (AC)", "303 (AC)", "304 (Non-AC)", "305 (Non-AC)", "306 (Non-AC)"],
  };

  const filteredFacilities = activeType === "ALL" 
    ? facilities 
    : facilities.filter(f => f.type === activeType);

  const handleBookingStart = (facility: Facility) => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      setShowRedirectAlert(true);
      setTimeout(() => {
        router.push("/login?redirect=bhavan");
      }, 2500);
    } else {
      setSelectedFacility(facility);
    }
  };

  const handleSubmitBooking = async () => {
    if (!bookingDate) {
      alert("Please select a booking date first.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to request a booking.");
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/v1/bookings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          facility_id: selectedFacility?.id,
          booking_start: `${bookingDate}T00:00:00Z`,
          booking_end: `${bookingDate}T23:59:59Z`
        })
      });

      if (res.ok) {
        alert("Booking request submitted successfully! An administrator will verify and approve.");
        setSelectedFacility(null);
        setBookingDate("");
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to submit booking request. The facility might be fully booked for this date.");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting booking request.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-orange-50/50 to-white px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              Bhavan Facility <span className="text-bhagwa">Booking</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Browse rooms, halls, and open lawns. View floor layouts, check tariffs, and secure your booking for family celebrations.
            </p>
          </div>
        </section>

        {/* Floor Plan Preview Section */}
        <section className="px-6 py-12 bg-gray-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12 items-center">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-1 bg-orange-100 text-bhagwa text-xs font-extrabold uppercase px-3 py-1 rounded-full w-fit">
                <Grid className="w-3.5 h-3.5" />
                Interactive Layout
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight">Interactive Floor Plan</h2>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Select a floor and click on any room number to view suitability. Rooms colored in orange are premium AC Suites.
              </p>
              <div className="flex gap-2.5 mt-2">
                {(["G", "1", "2"] as const).map((floor) => (
                  <button
                    key={floor}
                    onClick={() => {
                      setSelectedFloor(floor);
                      setSelectedRoomNum(null);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      selectedFloor === floor
                        ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10"
                        : "bg-white border border-gray-200 hover:bg-gray-50 text-black"
                    }`}
                  >
                    {floor === "G" ? "Ground Floor" : `${floor}nd Floor`}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Grid */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h3 className="font-extrabold text-lg text-gray-900">
                  Floor {selectedFloor} Grid Representation
                </h3>
                <div className="flex gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" /> Premium</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Standard</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {floorRooms[selectedFloor].map((room) => {
                  const isSuite = room.includes("Suite") || room.includes("H1");
                  const isOffice = room.includes("Office");
                  const isSelected = selectedRoomNum === room;

                  return (
                    <button
                      key={room}
                      disabled={isOffice}
                      onClick={() => setSelectedRoomNum(room)}
                      className={`h-20 rounded-2xl flex flex-col items-center justify-center p-3 transition-all border font-bold text-sm text-center ${
                        isOffice
                          ? "bg-red-50 border-red-100 text-red-700 cursor-not-allowed"
                          : isSelected
                          ? "bg-bhagwa border-bhagwa text-white shadow-lg scale-[1.03]"
                          : isSuite
                          ? "bg-orange-50/70 border-orange-100 text-bhagwa hover:bg-orange-100/50"
                          : "bg-gray-50/70 border-gray-100 text-gray-800 hover:bg-gray-100/50"
                      }`}
                    >
                      <span>{room.split(" ")[0]}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">
                        {isOffice ? "Restricted" : isSuite ? "AC Suite" : "Standard"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedRoomNum && (
                <div className="bg-orange-50/50 border border-orange-100/70 p-4 rounded-2xl text-sm font-semibold flex items-center justify-between text-black">
                  <span>Selected Facility Room: <strong className="text-bhagwa font-bold">{selectedRoomNum}</strong></span>
                  <button 
                    onClick={() => {
                      const matched = facilities.find(f => 
                        selectedRoomNum.toLowerCase().includes(f.name.toLowerCase().split(" ")[0]) ||
                        (selectedRoomNum.includes("Suite") && f.name.includes("Suite")) ||
                        (selectedRoomNum.includes("AC") && f.name.includes("Standard AC"))
                      ) || facilities[0];
                      handleBookingStart(matched);
                    }}
                    className="flex items-center gap-1.5 text-xs text-white bg-bhagwa hover:bg-bhagwa-hover px-4 py-2 rounded-xl"
                  >
                    Book Selected
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Facilities Catalog */}
        <section className="px-6 py-20 max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Available Bookable Facilities</h2>
              <p className="text-sm text-muted-text mt-1 font-medium">Filter by category to check availability and rates.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["ALL", "ROOM", "HALL", "GROUND"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                    activeType === type
                      ? "bg-bhagwa text-white shadow-md shadow-bhagwa/10"
                      : "bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFacilities.map((fac) => (
              <div
                key={fac.id}
                className="border border-light-border bg-white rounded-3xl overflow-hidden flex flex-col hover:shadow-xl transition-all hover:border-bhagwa/30"
              >
                {/* Photo Placeholder Card */}
                <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-bhagwa/80 relative">
                  <Building2 className="w-16 h-16" />
                  <span className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-100 text-xs font-bold text-gray-900 px-3 py-1 rounded-full uppercase">
                    {fac.type}
                  </span>
                </div>

                <div className="p-6 flex flex-col gap-4 flex-grow">
                  <div>
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight">{fac.name}</h3>
                    <p className="text-xs font-bold text-muted-text uppercase tracking-wider mt-1">
                      Capacity: {fac.capacity}
                    </p>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed font-medium line-clamp-3">
                    {fac.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fac.amenities.map((am) => (
                      <span
                        key={am}
                        className="bg-gray-50 border border-gray-100 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      >
                        {am}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider">Per Day Tariff</span>
                      <p className="text-lg font-black text-gray-900">₹{fac.tariff}</p>
                    </div>
                    <button
                      onClick={() => handleBookingStart(fac)}
                      className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md shadow-bhagwa/10"
                    >
                      Book Facility
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Redirecting Warning Overlay */}
        {showRedirectAlert && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 text-bhagwa flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-xl text-gray-900">Authentication Required</h3>
              <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
                You must login or register a Samaj profile first. Redirecting you to the portal login page...
              </p>
            </div>
          </div>
        )}

        {/* Success Booking Simulator Modal */}
        {selectedFacility && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 text-black">
              <button
                onClick={() => setSelectedFacility(null)}
                className="absolute top-6 right-6 p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-500"
              >
                close
              </button>

              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-xs font-bold text-bhagwa tracking-wider uppercase bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                    {selectedFacility.type} Booking
                  </span>
                  <h3 className="font-extrabold text-2xl mt-3 leading-tight">{selectedFacility.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 font-semibold">Base Price: ₹{selectedFacility.tariff} / Day</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Select Booking Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Payment Mode Option</label>
                    <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-bold">
                      <option>Online Payment (Credit Card / UPI)</option>
                      <option>Offline Cash (Pay at Counter later)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSubmitBooking}
                  className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15 mt-2"
                >
                  Submit Booking Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
