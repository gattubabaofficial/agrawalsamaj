"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Check, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft,
  Users, Building, Sparkles, Send, CheckCircle2, RefreshCw,
  Tag, Gift, Percent
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface AccommodationType {
  id: string;
  name: string;
  kind: string;
  description?: string;
  capacity_per_unit: number;
  base_price_per_night: number;
  total_units?: number | null;
}

interface Amenity {
  id: string;
  name: string;
  price: number;
  pricing_type: string;
  available_quantity?: number | null;
  allow_over_request?: boolean;
}

interface Purpose {
  id: string;
  name: string;
}

interface Voucher {
  id: string;
  code: string;
  title: string;
  description?: string;
  discount_type: string; // "percentage" | "flat"
  discount_value: number;
  min_booking_amount?: number | null;
  max_discount_amount?: number | null;
}

interface QuoteResponse {
  check_in: string;
  check_out: string;
  nights: number;
  days: number;
  accommodations: { type_id: string; type_name: string; quantity: number; unit_price: number; line_total: number }[];
  amenities: { amenity_id: string; amenity_name: string; quantity: number; line_total: number; multiplier_description: string }[];
  subtotal?: number;
  voucher_discount?: number;
  applied_voucher?: string;
  estimated_total: number;
  blockers: string[];
  public_message?: string;
  allowed_purpose_ids?: string[];
  blocked_type_ids?: string[];
  effective_type_prices?: Record<string, string>; // type_id -> price string
  available_units?: Record<string, number | null>;
}


export default function BhavanBookingPage() {
  const router = useRouter();

  // Stepper step state (1 to 6)
  const [step, setStep] = useState<number>(1);

  // Config data
  const [types, setTypes] = useState<AccommodationType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(null);
  const [customVoucherInput, setCustomVoucherInput] = useState<string>("");
  const [minNights, setMinNights] = useState<number>(1);

  const handleApplyVoucher = (v: Voucher) => {
    if (selectedVoucherId === v.id || selectedVoucherCode === v.code) {
      setSelectedVoucherId(null);
      setSelectedVoucherCode(null);
    } else {
      setSelectedVoucherId(v.id);
      setSelectedVoucherCode(v.code);
    }
  };

  const handleApplyCustomCode = () => {
    if (!customVoucherInput.trim()) return;
    const code = customVoucherInput.trim().toUpperCase();
    const matched = vouchers.find((v) => v.code.toUpperCase() === code);
    if (matched) {
      setSelectedVoucherId(matched.id);
      setSelectedVoucherCode(matched.code);
    } else {
      setSelectedVoucherId(null);
      setSelectedVoucherCode(code);
    }
  };

  const handleClearVoucher = () => {
    setSelectedVoucherId(null);
    setSelectedVoucherCode(null);
    setCustomVoucherInput("");
  };

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

  // Recalculate quote whenever dates, selections, purpose, or voucher change
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      fetchQuote();
    }
  }, [checkIn, checkOut, purposeId, selectedTypes, selectedAmenities, guestsTotal, selectedVoucherId, selectedVoucherCode]);

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

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
        setVouchers(data.vouchers || []);
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
          voucher_code: selectedVoucherCode,
          voucher_id: selectedVoucherId,
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
          voucher_code: selectedVoucherCode,
          voucher_id: selectedVoucherId,
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

                {/* Navigation Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <Link
                    href="/bhavan"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Bhavan
                  </Link>
                  {(() => {
                    const isClosed = quote?.blockers?.some((b) => b.includes("closed") || b.includes("maintenance"));
                    const canAdvance = checkIn && checkOut && checkOut > checkIn && !isClosed && !quoteLoading;

                    return (
                      <button
                        disabled={!canAdvance}
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {quoteLoading ? (
                          <>Checking Availability...</>
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

                {/* 1-Click Offers Banner in Step 2 */}
                {vouchers && vouchers.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <Gift className="w-4 h-4 text-emerald-400" />
                        <span>Special Offers & Vouchers Available (Click to Apply)</span>
                      </div>
                      {selectedVoucherCode && (
                        <button
                          type="button"
                          onClick={handleClearVoucher}
                          className="text-[11px] font-semibold text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove Voucher ✕
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {vouchers.map((v) => {
                        const isSelected = selectedVoucherId === v.id || selectedVoucherCode === v.code;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleApplyVoucher(v)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-900/50 text-white shadow-sm ring-1 ring-emerald-500"
                                : "border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/40 text-zinc-300"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-extrabold text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400">
                                  {v.code}
                                </span>
                                <span className="font-bold text-xs truncate text-white">{v.title}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                                Special Discount on Rooms
                              </span>
                            </div>
                            {isSelected ? (
                              <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-400 shrink-0">
                                APPLIED ✓
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                                Apply
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                            const hasQuoteAvailability = quote?.available_units && t.id in quote.available_units;
                            const availableUnits = hasQuoteAvailability
                              ? quote.available_units![t.id]
                              : (t.total_units !== undefined ? t.total_units : null);

                            const isOutOfStock = availableUnits !== null && availableUnits !== undefined && availableUnits <= 0;
                            const isRoom = t.kind === "room" || t.name.toLowerCase().includes("room");
                            const unitLabel = isRoom
                              ? (availableUnits === 1 ? "room" : "rooms")
                              : (availableUnits === 1 ? "unit" : "units");

                            return (
                              <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className="font-bold text-white text-base">{t.name}</h4>
                                      {isPriceAdjusted && (
                                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">Event Rate</span>
                                      )}
                                    </div>
                                    {t.description && (
                                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{t.description}</p>
                                    )}
                                    <p className="text-xs text-zinc-500 mt-1">Capacity: {t.capacity_per_unit} guests per unit</p>
                                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                                      <span className="text-base font-bold text-amber-400">₹{effectivePrice.toLocaleString('en-IN')} / night</span>
                                      <span className="text-zinc-600 text-xs">•</span>
                                      {availableUnits !== null && availableUnits !== undefined ? (
                                        <span
                                          className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                            availableUnits > 0
                                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                          }`}
                                        >
                                          {availableUnits > 0
                                            ? `Available: ${availableUnits} ${unitLabel}`
                                            : "Out of Stock (0 available)"}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                          Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                      Quantity
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      disabled={isOutOfStock}
                                      max={availableUnits !== null && availableUnits !== undefined ? availableUnits : undefined}
                                      value={selectedTypes[t.id] === undefined || selectedTypes[t.id] === 0 ? "" : selectedTypes[t.id]}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || val === "0") {
                                          setSelectedTypes((prev) => {
                                            const next = { ...prev };
                                            delete next[t.id];
                                            return next;
                                          });
                                        } else {
                                          const parsed = parseInt(val, 10);
                                          if (!isNaN(parsed) && parsed >= 0) {
                                            const maxLimit = (availableUnits !== null && availableUnits !== undefined)
                                              ? availableUnits
                                              : Infinity;
                                            const finalVal = Math.min(parsed, maxLimit);
                                            setSelectedTypes((prev) => ({ ...prev, [t.id]: finalVal }));
                                          }
                                        }
                                      }}
                                      className="w-24 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-lg font-bold text-white focus:border-amber-500 focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
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
                    const isOutOfStock = a.available_quantity !== null && a.available_quantity !== undefined && a.available_quantity <= 0 && !a.allow_over_request;
                    return (
                      <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-base">{a.name}</h4>
                          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                            <span className="text-xs text-amber-400 font-semibold">
                              ₹{parseFloat(String(a.price)).toFixed(2)} ({a.pricing_type.replace("_", " ")})
                            </span>
                            <span className="text-zinc-600 text-xs">•</span>
                            {a.available_quantity !== null && a.available_quantity !== undefined ? (
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  a.available_quantity > 0
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {a.available_quantity > 0
                                  ? `Available: ${a.available_quantity} ${a.available_quantity === 1 ? "unit" : "units"}`
                                  : "Out of Stock (0 available)"}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                Available: Unlimited
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={isOutOfStock}
                            max={
                              a.available_quantity !== null && a.available_quantity !== undefined && !a.allow_over_request
                                ? a.available_quantity
                                : undefined
                            }
                            value={selectedAmenities[a.id] === undefined || selectedAmenities[a.id] === 0 ? "" : selectedAmenities[a.id]}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || val === "0") {
                                setSelectedAmenities((prev) => {
                                  const next = { ...prev };
                                  delete next[a.id];
                                  return next;
                                });
                              } else {
                                const parsed = parseInt(val, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  const maxLimit =
                                    a.available_quantity !== null && a.available_quantity !== undefined && !a.allow_over_request
                                      ? a.available_quantity
                                      : Infinity;
                                  const finalVal = Math.min(parsed, maxLimit);
                                  setSelectedAmenities((prev) => ({ ...prev, [a.id]: finalVal }));
                                }
                              }
                            }}
                            className="w-24 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-lg font-bold text-white focus:border-amber-500 focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          />
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
                  <p className="text-sm text-zinc-400">Select any applicable vouchers, review summary and submit your enquiry</p>
                </div>

                {/* 1-Click Offers & Vouchers Selection */}
                {vouchers && vouchers.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                      <Gift className="w-4 h-4 text-emerald-400" />
                      <span>Available Vouchers & Special Offers (Click to Apply)</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Click any offer below to instantly apply discount to your booking bill. No code typing required!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {vouchers.map((v) => {
                        const isSelected = selectedVoucherId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedVoucherId(null);
                                setSelectedVoucherCode(null);
                              } else {
                                setSelectedVoucherId(v.id);
                                setSelectedVoucherCode(v.code);
                              }
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex items-start gap-3 ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-900/40 text-white shadow-lg ring-2 ring-emerald-500/50"
                                : "border-zinc-800 bg-zinc-900/80 hover:border-emerald-500/40 hover:bg-zinc-900 text-zinc-300"
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-emerald-500 text-white" : "bg-zinc-800 text-emerald-400"}`}>
                              <Percent className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 pr-8">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-extrabold text-xs text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                                  {v.code}
                                </span>
                                <span className="font-extrabold text-xs text-emerald-400">
                                  Special Offer
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-white mt-1.5 truncate">{v.title}</h4>
                              {v.description && (
                                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{v.description}</p>
                              )}
                              {v.min_booking_amount && (
                                <p className="text-[10px] text-zinc-500 mt-1">Min. Subtotal: ₹{v.min_booking_amount}</p>
                              )}
                            </div>
                            {isSelected ? (
                              <span className="absolute top-3 right-3 text-[10px] font-extrabold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-400">
                                APPLIED ✓
                              </span>
                            ) : (
                              <span className="absolute top-3 right-3 text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                                Click to Apply
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Applicant:</span>
                    <span className="font-semibold text-white">{fullName} ({mobile})</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Stay Period:</span>
                    <span className="font-semibold text-white">{checkIn} to {checkOut} ({quote?.nights || 0} nights)</span>
                  </div>

                  {quote?.voucher_discount && quote.voucher_discount > 0 ? (
                    <>
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs text-zinc-400">
                        <span>Subtotal:</span>
                        <span className="font-mono">₹{quote.subtotal || quote.estimated_total}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs font-bold text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" /> Voucher Discount ({quote.applied_voucher}):
                        </span>
                        <span className="font-mono text-emerald-400">-₹{quote.voucher_discount}</span>
                      </div>
                    </>
                  ) : null}

                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Estimated Total Payable:</span>
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

                  {/* 1-Click Voucher / Special Offers Widget in Sidebar */}
                  <div className="border-t border-zinc-900 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-emerald-400" /> Apply Voucher / Offer
                      </span>
                      {selectedVoucherCode && (
                        <button
                          type="button"
                          onClick={handleClearVoucher}
                          className="text-[10px] text-rose-400 hover:underline font-semibold cursor-pointer"
                        >
                          Remove ✕
                        </button>
                      )}
                    </div>

                    {/* 1-Click Available Voucher Chips */}
                    {vouchers.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        {vouchers.map((v) => {
                          const isSelected = selectedVoucherId === v.id || selectedVoucherCode === v.code;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleApplyVoucher(v)}
                              className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500"
                                  : "border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/50 hover:bg-zinc-900 text-zinc-300"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-extrabold text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400">
                                    {v.code}
                                  </span>
                                  <span className="font-bold text-[11px] truncate text-white">{v.title}</span>
                                </div>
                                <span className="text-[10px] text-emerald-400 block mt-0.5">
                                  Special Discount on Rooms
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-400 shrink-0">
                                  APPLIED ✓
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                                  Apply
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Manual Promo Code Input */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customVoucherInput}
                        onChange={(e) => setCustomVoucherInput(e.target.value.toUpperCase())}
                        placeholder="Enter Voucher Code..."
                        className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-white uppercase focus:border-emerald-500 focus:outline-none placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomCode}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {quote.voucher_discount && quote.voucher_discount > 0 ? (
                    <div className="border-t border-zinc-900 pt-3 space-y-1.5">
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal</span>
                        <span className="font-mono">₹{quote.subtotal || quote.estimated_total}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Offer ({quote.applied_voucher})
                        </span>
                        <span className="font-mono">-₹{quote.voucher_discount}</span>
                      </div>
                    </div>
                  ) : null}

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
