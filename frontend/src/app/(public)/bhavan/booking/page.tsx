"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Check, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft,
  Users, Building, Sparkles, Send, CheckCircle2, RefreshCw
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface AccommodationType {
  id: string;
  name: string;
  kind: string;
  description?: string;
  capacity_per_unit: number;
  base_price_per_night: number;
}

interface Amenity {
  id: string;
  name: string;
  price: number;
  pricing_type: string;
}

interface Purpose {
  id: string;
  name: string;
}

interface QuoteResponse {
  check_in: string;
  check_out: string;
  nights: number;
  days: number;
  accommodations: { type_id: string; type_name: string; quantity: number; unit_price: number; line_total: number }[];
  amenities: { amenity_id: string; amenity_name: string; quantity: number; line_total: number; multiplier_description: string }[];
  estimated_total: number;
  blockers: string[];
  public_message?: string;
  allowed_purpose_ids?: string[];
  blocked_type_ids?: string[];
  effective_type_prices?: Record<string, string>; // type_id -> price string
}


export default function BhavanBookingPage() {
  const router = useRouter();

  // Stepper step state (1 to 6)
  const [step, setStep] = useState<number>(1);

  // Config data
  const [types, setTypes] = useState<AccommodationType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [minNights, setMinNights] = useState<number>(1);

  // Form selections
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [purposeId, setPurposeId] = useState<string>("");

  const [selectedTypes, setSelectedTypes] = useState<{ [id: string]: number }>({});
  const [selectedAmenities, setSelectedAmenities] = useState<{ [id: string]: number }>({});

  // Customer details
  const [fullName, setFullName] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [guestsTotal, setGuestsTotal] = useState<number>(1);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [specialReqs, setSpecialReqs] = useState<string>("");

  // OTP Verification state
  const [otp, setOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpChannel, setOtpChannel] = useState<string>("");
  const [verificationToken, setVerificationToken] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>("");

  // Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Quote calculation state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Default dates: tomorrow and day after tomorrow
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    setCheckIn(tomorrow.toISOString().split("T")[0]);
    setCheckOut(dayAfter.toISOString().split("T")[0]);

    fetchConfig();
  }, []);

  // Recalculate quote whenever dates, selections, or purpose change
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      fetchQuote();
    }
  }, [checkIn, checkOut, purposeId, selectedTypes, selectedAmenities, guestsTotal]);

  // Cooldown timer effect
  useEffect(() => {
    let interval: any = null;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const fetchConfig = async () => {
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/config`);
      if (res.ok) {
        const data = await res.json();
        setTypes(data.accommodation_types || []);
        setAmenities(data.amenities || []);
        const loadedPurposes = data.purposes || [];
        setPurposes(loadedPurposes);
        setMinNights(data.min_nights || 1);
        if (loadedPurposes.length > 0) {
          setPurposeId(loadedPurposes[0].id);
        }
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  const getValidPurposeId = () => {
    if (purposeId && purposeId.length === 36 && purposeId.includes("-")) {
      return purposeId;
    }
    return null;
  };

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const accList = Object.entries(selectedTypes)
        .filter(([_, qty]) => qty > 0)
        .map(([type_id, quantity]) => ({ type_id, quantity }));

      const amenList = Object.entries(selectedAmenities)
        .filter(([_, qty]) => qty > 0)
        .map(([amenity_id, quantity]) => ({ amenity_id, quantity }));

      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          purpose_id: getValidPurposeId(),
          accommodations: accList,
          amenities: amenList,
          guests_total: guestsTotal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuote(data);
        if (data.allowed_purpose_ids && data.allowed_purpose_ids.length === 1) {
          const soleAllowedId = data.allowed_purpose_ids[0];
          if (purposeId !== soleAllowedId) {
            setPurposeId(soleAllowedId);
          }
        }
      }

    } catch (err) {
      console.error("Quote error:", err);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!mobile || mobile.trim().length < 10) {
      setOtpError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpChannel(data.channel || "WhatsApp");
        setOtpCooldown(60);
      } else {
        setOtpError(data.detail || "Failed to send OTP.");
      }
    } catch (err) {
      setOtpError("Network error sending OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length < 4) {
      setOtpError("Please enter the OTP sent to your WhatsApp.");
      return;
    }
    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setIsVerified(true);
        setVerificationToken(data.verification_token);
        setStep(6); // Advance to Review & Terms step
      } else {
        setOtpError(data.detail || "Invalid OTP code.");
      }
    } catch (err) {
      setOtpError("Network error verifying OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmitEnquiry = async () => {
    if (!termsAccepted) {
      alert("Please accept the Terms & Conditions to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const accList = Object.entries(selectedTypes)
        .filter(([_, qty]) => qty > 0)
        .map(([type_id, quantity]) => ({ type_id, quantity }));

      const amenList = Object.entries(selectedAmenities)
        .filter(([_, qty]) => qty > 0)
        .map(([amenity_id, quantity]) => ({ amenity_id, quantity }));

      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/enquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Verification-Token": verificationToken,
        },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          purpose_id: getValidPurposeId(),
          full_name: fullName,
          mobile,
          whatsapp_number: whatsappNumber || mobile,
          email,
          address,
          city,
          state: stateName,
          guests_total: guestsTotal,
          adults,
          children,
          special_requirements: specialReqs,
          accommodations: accList,
          amenities: amenList,
          terms_accepted: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/bhavan/enquiry/success?ref=${data.reference}`);
      } else {
        alert(data.detail || "Failed to submit enquiry.");
      }
    } catch (err) {
      alert("Network error submitting enquiry.");
    } finally {
      setSubmitting(false);
    }
  };


  const updateTypeQty = (id: string, delta: number) => {
    setSelectedTypes((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const updateAmenityQty = (id: string, delta: number) => {
    setSelectedAmenities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-8" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto">

        {/* Stepper Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step === s
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110"
                      : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider mt-2 text-zinc-400 hidden sm:block">
                  {s === 1 && "Dates"}
                  {s === 2 && "Rooms"}
                  {s === 3 && "Amenities"}
                  {s === 4 && "Details"}
                  {s === 5 && "OTP"}
                  {s === 6 && "Review"}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((step - 1) / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Stepper Main Step Container */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">

            {/* Step 1: Dates & Purpose */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 1: Select Booking Dates & Purpose</h2>
                  <p className="text-sm text-zinc-400">Choose your check-in, check-out date range and event type</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Check-in Date</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Check-out Date</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Purpose of Booking *
                    </label>
                    {quote?.allowed_purpose_ids && quote.allowed_purpose_ids.length > 0 && (
                      <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {quote.allowed_purpose_ids.length} Event Type(s) Allowed
                      </span>
                    )}
                  </div>

                  {/* Purpose Pills Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {(purposes.length > 0 ? purposes : [
                      { id: "7bca0502-c5dc-4f24-bea9-eb246adb5fd2", name: "Wedding" },
                      { id: "48a13d41-67ff-4c9b-885b-522ff3c7187d", name: "Family Function" },
                      { id: "f8cc1510-a4b4-4e97-9bca-222af51a5179", name: "Religious Event" },
                      { id: "5801328d-2081-4c57-b08d-23e242938225", name: "Community Event" },
                      { id: "8872aab4-c8cc-424f-ad22-08466c227fc7", name: "Social Event" },
                      { id: "ddaca602-a3c3-4ebf-bb09-04ee02607dec", name: "Anniversary" },
                      { id: "52191e7d-e3e5-4e36-93a7-41dfe25433b4", name: "Camp" },
                      { id: "d3191a4d-fd91-479f-bd82-3176b41ad936", name: "Other" }
                    ]).map((p) => {
                      const isSelected = purposeId === p.id;
                      const isAllowed = !quote?.allowed_purpose_ids || quote.allowed_purpose_ids.length === 0 || quote.allowed_purpose_ids.includes(p.id);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (isAllowed) setPurposeId(p.id);
                          }}
                          disabled={!isAllowed}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                            !isAllowed
                              ? "border-rose-900/40 bg-rose-950/20 text-rose-400/60 cursor-not-allowed opacity-50"
                              : isSelected
                              ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isSelected && isAllowed && <Check className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                          {!isAllowed && <span className="text-[9px] font-extrabold text-rose-500 uppercase">Blocked</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Purpose Dropdown */}
                  <select
                    value={purposeId}
                    onChange={(e) => setPurposeId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none text-xs"
                  >
                    {(purposes.length > 0 ? purposes : [
                      { id: "7bca0502-c5dc-4f24-bea9-eb246adb5fd2", name: "Wedding" },
                      { id: "48a13d41-67ff-4c9b-885b-522ff3c7187d", name: "Family Function" },
                      { id: "f8cc1510-a4b4-4e97-9bca-222af51a5179", name: "Religious Event" },
                      { id: "5801328d-2081-4c57-b08d-23e242938225", name: "Community Event" },
                      { id: "8872aab4-c8cc-424f-ad22-08466c227fc7", name: "Social Event" },
                      { id: "ddaca602-a3c3-4ebf-bb09-04ee02607dec", name: "Anniversary" },
                      { id: "52191e7d-e3e5-4e36-93a7-41dfe25433b4", name: "Camp" },
                      { id: "d3191a4d-fd91-479f-bd82-3176b41ad936", name: "Other" }
                    ]).map((p) => {
                      const isAllowed = !quote?.allowed_purpose_ids || quote.allowed_purpose_ids.length === 0 || quote.allowed_purpose_ids.includes(p.id);
                      return (
                        <option key={p.id} value={p.id} disabled={!isAllowed}>
                          {p.name} {!isAllowed ? "(Blocked on selected dates)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Warning Alert Banner — only shown for purpose restrictions at Step 1 */}
                {(() => {
                  const isCurrentPurposeBlocked = quote?.allowed_purpose_ids && purposeId && !quote.allowed_purpose_ids.includes(purposeId);
                  // Only surface purpose-related blockers at Step 1 (units/guests/stock are Step 2 concerns)
                  const purposeBlocker = quote?.blockers?.find(b => b.includes("type of event is not available"));
                  const isBlocked = isCurrentPurposeBlocked || !!purposeBlocker;
                  if (!isBlocked) return null;
                  return (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Event Type Not Available on Selected Dates</span>
                      </div>
                      <p className="text-zinc-300 pl-6 leading-relaxed">
                        {purposeBlocker ?? "The selected event type is not allowed on these dates. Please choose an available event type to proceed."}
                      </p>
                    </div>
                  );
                })()}

                <div className="pt-4 flex justify-end">
                  {(() => {
                    const isCurrentPurposeBlocked = quote?.allowed_purpose_ids && purposeId && !quote.allowed_purpose_ids.includes(purposeId);
                    // Only purpose blockers prevent advancing from Step 1; room/unit issues are resolved in Step 2
                    const hasPurposeBlocker = quote?.blockers?.some(b => b.includes("type of event is not available"));
                    const canAdvance = checkIn && checkOut && checkOut > checkIn && !isCurrentPurposeBlocked && !hasPurposeBlocker && !quoteLoading;

                    return (
                      <button
                        disabled={!canAdvance}
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {quoteLoading ? (
                          <>Checking Rules...</>
                        ) : (
                          <>Select Rooms <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}



            {/* Step 2: Accommodation Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 2: Choose Accommodation</h2>
                  <p className="text-sm text-zinc-400">Select the number of rooms or dormitories required</p>
                </div>

                {(() => {
                  const blockedIds = new Set(quote?.blocked_type_ids || []);
                  const availableTypes = types.filter(t => !blockedIds.has(t.id));
                  const blockedCount = types.length - availableTypes.length;

                  return (
                    <>
                      {blockedCount > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 text-xs text-zinc-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <span>
                            <span className="font-semibold text-amber-400">{blockedCount} accommodation type{blockedCount > 1 ? 's are' : ' is'} not available</span> on the selected dates due to an active event rule.
                          </span>
                        </div>
                      )}

                      <div className="space-y-4">
                        {availableTypes.length === 0 ? (
                          <div className="p-6 rounded-xl border border-rose-800/40 bg-rose-950/20 text-center text-rose-300 text-sm">
                            <p className="font-bold text-rose-400 mb-1">No accommodation available</p>
                            <p className="text-xs text-zinc-400">All room types are restricted on the selected dates. Please choose different dates.</p>
                          </div>
                        ) : (
                          availableTypes.map((t) => {
                            const qty = selectedTypes[t.id] || 0;
                            const basePrice = parseFloat(String(t.base_price_per_night));
                            const effectivePriceStr = quote?.effective_type_prices?.[t.id];
                            const rawEffective = effectivePriceStr ? parseFloat(effectivePriceStr) : 0;
                            // Fall back to base price if effective is 0 (no quote yet or no rule override)
                            const effectivePrice = rawEffective > 0 ? rawEffective : basePrice;
                            const isPriceAdjusted = rawEffective > 0 && Math.abs(rawEffective - basePrice) > 0.01;
                            return (
                              <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-white text-base">{t.name}</h4>
                                      {isPriceAdjusted && (
                                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">Event Rate</span>
                                      )}
                                    </div>
                                    {t.description && (
                                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{t.description}</p>
                                    )}
                                    <p className="text-xs text-zinc-500 mt-1">Capacity: {t.capacity_per_unit} guests per unit</p>
                                    <div className="mt-2">
                                      <span className="text-base font-bold text-amber-400">₹{effectivePrice.toLocaleString('en-IN')} / night</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <button
                                      onClick={() => updateTypeQty(t.id, -1)}
                                      className="w-9 h-9 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-lg hover:bg-zinc-700"
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
                                    <button
                                      onClick={() => updateTypeQty(t.id, 1)}
                                      className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg hover:bg-amber-400"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}

                      </div>
                    </>
                  );
                })()}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400"
                  >
                    Select Amenities <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Amenities Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 3: Select Additional Amenities</h2>
                  <p className="text-sm text-zinc-400">Add chairs, coolers, mattresses or event services if needed</p>
                </div>

                <div className="space-y-4">
                  {amenities.map((a) => {
                    const qty = selectedAmenities[a.id] || 0;
                    return (
                      <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-base">{a.name}</h4>
                          <p className="text-xs text-amber-400 mt-1 font-medium">₹{a.price} ({a.pricing_type.replace("_", " ")})</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateAmenityQty(a.id, -1)}
                            className="w-9 h-9 rounded-lg bg-zinc-800 text-white flex items-center justify-center font-bold text-lg hover:bg-zinc-700"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
                          <button
                            onClick={() => updateAmenityQty(a.id, 1)}
                            className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg hover:bg-amber-400"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400"
                  >
                    Your Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Customer Details */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 4: Customer Details</h2>
                  <p className="text-sm text-zinc-400">Enter your personal and guest information</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Agrawal"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Mobile Number (WhatsApp) *</label>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Jaipur"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">State</label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Rajasthan"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Total Guests</label>
                      <input
                        type="number"
                        min="1"
                        value={guestsTotal}
                        onChange={(e) => setGuestsTotal(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Adults</label>
                      <input
                        type="number"
                        min="1"
                        value={adults}
                        onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Children</label>
                      <input
                        type="number"
                        min="0"
                        value={children}
                        onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Special Requirements / Message</label>
                    <textarea
                      rows={3}
                      value={specialReqs}
                      onChange={(e) => setSpecialReqs(e.target.value)}
                      placeholder="Any additional details or special arrangements..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    disabled={!fullName || !mobile}
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 disabled:opacity-50"
                  >
                    Verify WhatsApp OTP <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: WhatsApp OTP Verification */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 5: Mobile OTP Verification</h2>
                  <p className="text-sm text-zinc-400">Verify your mobile number via WhatsApp code</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-semibold">Mobile Number</p>
                    <p className="text-xl font-bold text-white">{mobile}</p>
                  </div>

                  {otpError && (
                    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {otpError}
                    </div>
                  )}

                  {isVerified ? (
                    <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-base">Mobile Verified</p>
                        <p className="text-xs text-emerald-500">Your signed verification token is active.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!otpSent ? (
                        <button
                          onClick={handleRequestOtp}
                          disabled={otpLoading}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-bold text-white hover:brightness-110 shadow-lg shadow-emerald-600/20"
                        >
                          {otpLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Send OTP via WhatsApp
                        </button>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Enter 6-Digit OTP</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="123456"
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-2xl tracking-widest font-mono text-white focus:border-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              disabled={otpCooldown > 0 || otpLoading}
                              onClick={handleRequestOtp}
                              className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                            >
                              {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend OTP"}
                            </button>
                            <button
                              onClick={handleVerifyOtp}
                              disabled={otpLoading || otp.length < 4}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {otpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify & Continue
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Review & Terms Acceptance */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Step 6: Review & Terms Acceptance</h2>
                  <p className="text-sm text-zinc-400">Read Terms & Conditions and submit your enquiry</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Applicant:</span>
                    <span className="font-semibold text-white">{fullName} ({mobile})</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Stay Period:</span>
                    <span className="font-semibold text-white">{checkIn} to {checkOut} ({quote?.nights || 0} nights)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Estimated Total:</span>
                    <span className="font-bold text-amber-400 text-lg">₹{quote?.estimated_total || 0}</span>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/bhavan/terms-and-conditions"
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:underline"
                    >
                      <ShieldCheck className="w-4 h-4" /> View Terms & Conditions ↗
                    </Link>
                  </div>

                  <label className="flex items-start gap-3 pt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs text-zinc-300 leading-relaxed">
                      I have read, understood, and accept the Terms & Conditions. I acknowledge that submitting this form creates a booking enquiry for admin review and does not constitute an automatically confirmed booking.
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    disabled={!termsAccepted || submitting || (quote?.blockers && quote.blockers.length > 0)}
                    onClick={handleSubmitEnquiry}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-8 py-3.5 font-bold text-white hover:scale-105 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Booking Enquiry"}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Side Summary & Live Quote Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Booking Estimate
              </h3>

              {quoteLoading ? (
                <div className="py-8 text-center text-xs text-zinc-500">Calculating running estimate...</div>
              ) : quote ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <p className="text-zinc-500">Selected Dates</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{quote.check_in} → {quote.check_out}</p>
                    <p className="text-[10px] text-zinc-400">{quote.nights} night(s) · {quote.days} day(s)</p>
                  </div>

                  {quote.public_message && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
                      {quote.public_message}
                    </div>
                  )}

                  {quote.blockers && quote.blockers.length > 0 && (
                    <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 space-y-1">
                      {quote.blockers.map((b, i) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {b}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-zinc-900 pt-3">
                    <p className="text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-[10px]">Accommodation</p>
                    {quote.accommodations.length === 0 ? (
                      <p className="text-zinc-600 italic">No room selected</p>
                    ) : (
                      quote.accommodations.map((acc, i) => (
                        <div key={i} className="flex justify-between py-1 text-zinc-300">
                          <span>{acc.quantity} × {acc.type_name}</span>
                          <span className="font-mono">₹{acc.line_total}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <p className="text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-[10px]">Amenities</p>
                    {quote.amenities.length === 0 ? (
                      <p className="text-zinc-600 italic">No amenities selected</p>
                    ) : (
                      quote.amenities.map((amen, i) => (
                        <div key={i} className="flex justify-between py-1 text-zinc-300">
                          <span>{amen.amenity_name}</span>
                          <span className="font-mono">₹{amen.line_total}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Estimated Amount</span>
                    <span className="text-2xl font-extrabold text-amber-400">₹{quote.estimated_total}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-8 border-t border-zinc-900 pt-4 text-[10px] text-zinc-500 text-center">
              All prices are subject to admin rule resolution and review.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
