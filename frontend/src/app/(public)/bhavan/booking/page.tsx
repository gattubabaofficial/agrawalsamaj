"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Check, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft,
  Users, Building, Sparkles, Send, CheckCircle2, RefreshCw,
  Tag, Gift, Percent, ChevronLeft, ChevronRight, X, CalendarDays, Info,
  BedDouble, SlidersHorizontal, CheckCheck, Clock, Copy
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
  effective_type_prices?: Record<string, string>;
  available_units?: Record<string, number | null>;
  allocations?: {
    from: string;
    to: string;
    rooms: number;
    nights: number;
    max_available?: number;
    line_total?: string;
    type_id?: string;
    type_name?: string;
  }[];
  date_allocations?: Record<string, number>;
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
  const [configLoading, setConfigLoading] = useState<boolean>(true);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(null);
  const [customVoucherInput, setCustomVoucherInput] = useState<string>("");
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
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

  // Direct Date-by-Date accommodation selection state (Date YYYY-MM-DD -> { [typeId]: quantity })
  const [dateAllocations, setDateAllocations] = useState<Record<string, Record<string, number>>>({});
  const [bulkSelectedTypeId, setBulkSelectedTypeId] = useState<string>("");
  const [bulkQty, setBulkQty] = useState<number>(1);
  const [activeDateIndex, setActiveDateIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"tabs" | "all">("all");

  // Direct Date-by-Date amenity selection state (Date YYYY-MM-DD -> { [amenityId]: quantity })
  const [dateAmenityAllocations, setDateAmenityAllocations] = useState<Record<string, Record<string, number>>>({});
  const [activeAmenityDateIndex, setActiveAmenityDateIndex] = useState<number>(0);
  const [amenityViewMode, setAmenityViewMode] = useState<"tabs" | "all">("all");

  // Availability Popover Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarTab, setCalendarTab] = useState<"checkIn" | "checkOut">("checkIn");
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Safe timezone-independent date string helpers
  const parseDateString = (str: string): Date => {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Helper date formatting for UI display
  const formatDateDisplay = (dateStr: string, opts?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return "";
    const d = parseDateString(dateStr);
    return d.toLocaleDateString("en-IN", opts || {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Default dates: tomorrow and day after tomorrow
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const dayAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);

    setCheckIn(formatDateString(tomorrow));
    setCheckOut(formatDateString(dayAfter));

    fetchConfig();
  }, []);

  // Generate array of date strings for the stay: [checkIn, checkOut - 1 day]
  const stayDates = (() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return [];
    const list: string[] = [];
    const curr = parseDateString(checkIn);
    const stop = parseDateString(checkOut);
    while (curr < stop) {
      list.push(formatDateString(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  })();

  // Primary Room Type
  const primaryRoomType = types.find((t) => t.kind === "room" || t.name.toLowerCase().includes("room")) || types[0];

  // Initialize bulk selected type if empty
  useEffect(() => {
    if (!bulkSelectedTypeId && types.length > 0) {
      setBulkSelectedTypeId(primaryRoomType?.id || types[0].id);
    }
  }, [types, bulkSelectedTypeId, primaryRoomType]);

  // Helper to get available units for a specific accommodation type on a specific date
  const getDateTypeAvailable = (dStr: string, typeId: string) => {
    const info = calendarData[dStr];
    if (info?.room_types && Array.isArray(info.room_types)) {
      const matched = info.room_types.find((rt: any) => rt.type_id === typeId);
      if (matched && matched.available_units !== undefined) {
        return matched.available_units;
      }
    }
    const accType = types.find((t) => t.id === typeId);
    if (accType?.total_units !== undefined && accType?.total_units !== null) {
      return accType.total_units;
    }
    return 10;
  };

  // Helper to get effective price for a specific accommodation type on a specific date
  const getDateTypePrice = (dStr: string, typeId: string) => {
    const info = calendarData[dStr];
    if (info?.room_types && Array.isArray(info.room_types)) {
      const matched = info.room_types.find((rt: any) => rt.type_id === typeId);
      if (matched && matched.price !== undefined) {
        return matched.price;
      }
    }
    const accType = types.find((t) => t.id === typeId);
    if (accType?.base_price_per_night) {
      return parseFloat(String(accType.base_price_per_night));
    }
    return 0;
  };

  // Helper to get current selected quantity for a date and accommodation type (default 0)
  const getDateTypeQty = (dStr: string, typeId: string) => {
    if (dateAllocations[dStr] && dateAllocations[dStr][typeId] !== undefined) {
      return dateAllocations[dStr][typeId];
    }
    // Default to 0 for all accommodations until explicitly chosen by user
    return 0;
  };

  // Update accommodation count for a single date and single type
  const handleSetDateTypeQty = (dateStr: string, typeId: string, qty: number) => {
    const maxAvail = getDateTypeAvailable(dateStr, typeId);
    const clamped = Math.max(0, Math.min(maxAvail, qty));
    setDateAllocations((prev) => {
      const dateMap = { ...(prev[dateStr] || {}) };
      dateMap[typeId] = clamped;
      return {
        ...prev,
        [dateStr]: dateMap,
      };
    });
  };

  // Apply a quantity for a specific accommodation type to all selected stay dates
  const handleApplyBulkQty = (typeId: string, qty: number) => {
    setDateAllocations((prev) => {
      const updated: Record<string, Record<string, number>> = { ...prev };
      stayDates.forEach((d) => {
        const maxAvail = getDateTypeAvailable(d, typeId);
        const dateMap = { ...(updated[d] || {}) };
        dateMap[typeId] = Math.max(0, Math.min(maxAvail, qty));
        updated[d] = dateMap;
      });
      return updated;
    });
  };

  // Copy entire selection of one date to all other dates (1-click duplicate)
  const handleCopyDayToAll = (sourceDateStr: string) => {
    setDateAllocations((prev) => {
      const updated: Record<string, Record<string, number>> = { ...prev };
      const sourceMap = updated[sourceDateStr] || {};
      stayDates.forEach((d) => {
        const dateMap: Record<string, number> = {};
        types.forEach((t) => {
          const srcQty = sourceMap[t.id] !== undefined ? sourceMap[t.id] : 0;
          const maxAvail = getDateTypeAvailable(d, t.id);
          dateMap[t.id] = Math.max(0, Math.min(maxAvail, srcQty));
        });
        updated[d] = dateMap;
      });
      return updated;
    });
  };

  // Helper to get current selected quantity for a date and amenity (default 0)
  const getDateAmenityQty = (dStr: string, amenityId: string) => {
    if (dateAmenityAllocations[dStr] && dateAmenityAllocations[dStr][amenityId] !== undefined) {
      return dateAmenityAllocations[dStr][amenityId];
    }
    return 0;
  };

  // Update amenity count for a single date and single amenity
  const handleSetDateAmenityQty = (dateStr: string, amenityId: string, qty: number) => {
    const amen = amenities.find((a) => a.id === amenityId);
    const maxLimit =
      amen?.available_quantity !== null && amen?.available_quantity !== undefined && !amen?.allow_over_request
        ? amen.available_quantity
        : 9999;
    const clamped = Math.max(0, Math.min(maxLimit, qty));
    setDateAmenityAllocations((prev) => {
      const dateMap = { ...(prev[dateStr] || {}) };
      dateMap[amenityId] = clamped;
      return {
        ...prev,
        [dateStr]: dateMap,
      };
    });
  };

  // Apply a quantity for a specific amenity to all selected stay dates
  const handleApplyBulkAmenityQty = (amenityId: string, qty: number) => {
    const amen = amenities.find((a) => a.id === amenityId);
    const maxLimit =
      amen?.available_quantity !== null && amen?.available_quantity !== undefined && !amen?.allow_over_request
        ? amen.available_quantity
        : 9999;
    const clamped = Math.max(0, Math.min(maxLimit, qty));
    setDateAmenityAllocations((prev) => {
      const updated: Record<string, Record<string, number>> = { ...prev };
      stayDates.forEach((d) => {
        const dateMap = { ...(updated[d] || {}) };
        dateMap[amenityId] = clamped;
        updated[d] = dateMap;
      });
      return updated;
    });
  };

  // Copy entire amenity selection of one date to all other dates (1-click duplicate)
  const handleCopyAmenityDayToAll = (sourceDateStr: string) => {
    setDateAmenityAllocations((prev) => {
      const updated: Record<string, Record<string, number>> = { ...prev };
      const sourceMap = updated[sourceDateStr] || {};
      stayDates.forEach((d) => {
        const dateMap: Record<string, number> = {};
        amenities.forEach((a) => {
          const srcQty = sourceMap[a.id] !== undefined ? sourceMap[a.id] : 0;
          const maxLimit =
            a.available_quantity !== null && a.available_quantity !== undefined && !a.allow_over_request
              ? a.available_quantity
              : 9999;
          dateMap[a.id] = Math.max(0, Math.min(maxLimit, srcQty));
        });
        updated[d] = dateMap;
      });
      return updated;
    });
  };

  // Total amenity unit-days across entire stay
  const totalAmenityUnits = stayDates.reduce((sum, d) => {
    return sum + amenities.reduce((aSum, a) => aSum + getDateAmenityQty(d, a.id), 0);
  }, 0);

  // Recalculate quote whenever dates, allocations, selections, purpose, or voucher change
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      fetchQuote();
    }
  }, [
    checkIn, checkOut, purposeId, selectedTypes, selectedAmenities,
    guestsTotal, selectedVoucherId, selectedVoucherCode, dateAllocations, dateAmenityAllocations
  ]);

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
    setConfigLoading(true);
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/config`);
      if (res.ok) {
        const data = await res.json();
        const loadedTypes = data.accommodation_types || [];
        setTypes(loadedTypes);
        setAmenities(data.amenities || []);
        setVouchers(data.vouchers || []);
        const loadedPurposes = data.purposes || [];
        setPurposes(loadedPurposes);
        setMinNights(data.min_nights || 1);
        if (loadedPurposes.length > 0) {
          setPurposeId((prev) => prev || loadedPurposes[0].id);
        }
        if (loadedTypes.length > 0) {
          const prim = loadedTypes.find((t: any) => t.kind === "room" || t.name.toLowerCase().includes("room")) || loadedTypes[0];
          setBulkSelectedTypeId((prev) => prev || prim.id);
        }
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    } finally {
      setConfigLoading(false);
    }
  };

  // Re-fetch config if user enters Step 2/3 and types is empty
  useEffect(() => {
    if (types.length === 0) {
      fetchConfig();
    }
  }, [step]);

  const getValidPurposeId = () => {
    if (purposeId && purposeId.length === 36 && purposeId.includes("-")) {
      return purposeId;
    }
    return null;
  };

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      // Build date-wise multi-type allocations payload: { [date]: { [typeId]: qty } }
      const effectiveDateAllocations: Record<string, Record<string, number>> = {};
      stayDates.forEach((d) => {
        effectiveDateAllocations[d] = {};
        types.forEach((t) => {
          const qty = getDateTypeQty(d, t.id);
          if (qty > 0) {
            effectiveDateAllocations[d][t.id] = qty;
          }
        });
      });

      // Build date-wise multi-amenity allocations payload: { [date]: { [amenityId]: qty } }
      const effectiveDateAmenityAllocations: Record<string, Record<string, number>> = {};
      stayDates.forEach((d) => {
        effectiveDateAmenityAllocations[d] = {};
        amenities.forEach((a) => {
          const qty = getDateAmenityQty(d, a.id);
          if (qty > 0) {
            effectiveDateAmenityAllocations[d][a.id] = qty;
          }
        });
      });

      const amenList = amenities
        .map((a) => {
          const maxQ = Math.max(...stayDates.map((d) => getDateAmenityQty(d, a.id)), 0);
          return { amenity_id: a.id, quantity: maxQ };
        })
        .filter((a) => a.quantity > 0);

      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          purpose_id: getValidPurposeId(),
          accommodations: [],
          amenities: amenList,
          guests_total: guestsTotal,
          voucher_code: selectedVoucherCode,
          voucher_id: selectedVoucherId,
          date_allocations: effectiveDateAllocations,
          date_amenity_allocations: effectiveDateAmenityAllocations,
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

  // Fetch calendar availability on mount and when view date changes
  useEffect(() => {
    fetchCalendarData(calendarViewDate);
  }, [calendarViewDate]);

  // Click outside to close calendar popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  const fetchCalendarRange = async (startStr: string, endStr: string) => {
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/calendar?start_date=${startStr}&end_date=${endStr}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        (data.days || []).forEach((d: any) => {
          map[d.date] = d;
        });
        setCalendarData((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error("Failed to fetch calendar range:", err);
    }
  };

  // Ensure calendar availability is always loaded for the selected stay dates
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      fetchCalendarRange(checkIn, checkOut);
    }
  }, [checkIn, checkOut]);

  const fetchCalendarData = async (viewDate: Date) => {
    setCalendarLoading(true);
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      
      const nextMonthDate = new Date(year, month + 2, 0);
      const endDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(nextMonthDate.getDate()).padStart(2, "0")}`;

      const res = await safeFetch(`${getApiBaseUrl()}/bhavan/calendar?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        (data.days || []).forEach((d: any) => {
          map[d.date] = d;
        });
        setCalendarData((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error("Failed to fetch calendar availability:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const today = new Date();
    today.setDate(1);
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    if (newDate >= today || (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() === today.getMonth())) {
      setCalendarViewDate(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    setCalendarViewDate(newDate);
  };

  const handleCalendarDateSelect = (dateStr: string) => {
    const dayInfo = calendarData[dateStr];
    if (dayInfo?.is_past || dayInfo?.closed) {
      return;
    }

    if (calendarTab === "checkIn") {
      setCheckIn(dateStr);
      if (!checkOut || checkOut <= dateStr) {
        const nextD = parseDateString(dateStr);
        nextD.setDate(nextD.getDate() + 1);
        setCheckOut(formatDateString(nextD));
      }
      setCalendarTab("checkOut");
    } else {
      if (!checkIn || dateStr <= checkIn) {
        setCheckIn(dateStr);
        const nextD = parseDateString(dateStr);
        nextD.setDate(nextD.getDate() + 1);
        setCheckOut(formatDateString(nextD));
        setCalendarTab("checkOut");
      } else {
        setCheckOut(dateStr);
      }
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
        setStep(6);
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
      const effectiveDateAllocations: Record<string, Record<string, number>> = {};
      stayDates.forEach((d) => {
        effectiveDateAllocations[d] = {};
        types.forEach((t) => {
          const qty = getDateTypeQty(d, t.id);
          if (qty > 0) {
            effectiveDateAllocations[d][t.id] = qty;
          }
        });
      });

      const effectiveDateAmenityAllocations: Record<string, Record<string, number>> = {};
      stayDates.forEach((d) => {
        effectiveDateAmenityAllocations[d] = {};
        amenities.forEach((a) => {
          const qty = getDateAmenityQty(d, a.id);
          if (qty > 0) {
            effectiveDateAmenityAllocations[d][a.id] = qty;
          }
        });
      });

      const amenList = amenities
        .map((a) => {
          const maxQ = Math.max(...stayDates.map((d) => getDateAmenityQty(d, a.id)), 0);
          return { amenity_id: a.id, quantity: maxQ };
        })
        .filter((a) => a.quantity > 0);

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
          accommodations: [],
          amenities: amenList,
          voucher_code: selectedVoucherCode,
          voucher_id: selectedVoucherId,
          date_allocations: effectiveDateAllocations,
          date_amenity_allocations: effectiveDateAmenityAllocations,
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

  const updateAmenityQty = (id: string, delta: number) => {
    setSelectedAmenities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalRoomNights = stayDates.reduce((sum, d) => {
    const dateSum = types.reduce((tSum, t) => tSum + getDateTypeQty(d, t.id), 0);
    return sum + dateSum;
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-8" suppressHydrationWarning>
      <div className="max-w-6xl mx-auto">

        {/* Stepper Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === s
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
                  <p className="text-sm text-zinc-400">Choose your check-in and check-out dates to view live room availability and select event purpose</p>
                </div>

                {/* Date Selection Box & Interactive Popover Trigger */}
                <div className="relative" ref={calendarRef}>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Booking Dates & Live Availability
                  </label>

                  {/* Main Clickable Trigger Bar */}
                  <div
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`rounded-2xl border transition-all cursor-pointer p-4 sm:p-5 shadow-lg ${
                      isCalendarOpen
                        ? "border-amber-500/80 bg-zinc-900 ring-2 ring-amber-500/20 shadow-amber-500/10"
                        : "border-zinc-700 bg-zinc-800/90 hover:border-amber-500/60 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Check-in selector button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCalendarTab("checkIn");
                          setIsCalendarOpen(true);
                        }}
                        className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isCalendarOpen && calendarTab === "checkIn"
                            ? "border-amber-500 bg-amber-500/15 text-white shadow-sm"
                            : "border-zinc-700/80 bg-zinc-900/70 hover:border-zinc-600 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Check-in Date</span>
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-white">
                          {checkIn
                            ? formatDateDisplay(checkIn, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                weekday: "short",
                              })
                            : "Select Check-in"}
                        </div>
                      </button>

                      {/* Nights Count Badge */}
                      <div className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs font-bold text-amber-400 shrink-0 self-center text-center">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{quote?.nights ? `${quote.nights} Night${quote.nights > 1 ? "s" : ""}` : "Select Dates"}</span>
                      </div>

                      {/* Check-out selector button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCalendarTab("checkOut");
                          setIsCalendarOpen(true);
                        }}
                        className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isCalendarOpen && calendarTab === "checkOut"
                            ? "border-amber-500 bg-amber-500/15 text-white shadow-sm"
                            : "border-zinc-700/80 bg-zinc-900/70 hover:border-zinc-600 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Check-out Date</span>
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-white">
                          {checkOut
                            ? formatDateDisplay(checkOut, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                weekday: "short",
                              })
                            : "Select Check-out"}
                        </div>
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-700/60 flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Check-in 10:00 AM · Check-out 8:00 AM next day
                      </span>
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        {isCalendarOpen ? "Close Calendar ▲" : "Select from Calendar ▼"}
                      </span>
                    </div>
                  </div>

                  {/* Dual-Month Interactive Calendar Popover */}
                  {isCalendarOpen && (
                    <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 sm:p-6 shadow-2xl z-30 transition-all">
                      {/* Top Header Tabs */}
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <button
                            type="button"
                            onClick={() => setCalendarTab("checkIn")}
                            className={`flex items-center gap-1.5 pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                              calendarTab === "checkIn"
                                ? "border-amber-400 text-amber-400"
                                : "border-transparent text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Select Check-in</span>
                            {checkIn && (
                              <span className="text-[11px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 ml-1">
                                {formatDateDisplay(checkIn, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            )}
                          </button>

                          <span className="text-zinc-600 font-bold pb-2">-</span>

                          <button
                            type="button"
                            onClick={() => setCalendarTab("checkOut")}
                            className={`flex items-center gap-1.5 pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                              calendarTab === "checkOut"
                                ? "border-amber-400 text-amber-400"
                                : "border-transparent text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Select Check-out</span>
                            {checkOut && (
                              <span className="text-[11px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 ml-1">
                                {formatDateDisplay(checkOut, {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCalendarOpen(false)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Month Navigation Row */}
                      <div className="flex items-center justify-between py-3">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                          aria-label="Previous Month"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {(() => {
                          const m1 = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
                          const m2 = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
                          return (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 text-center gap-4">
                              <span className="font-extrabold text-base text-white">
                                {MONTH_NAMES[m1.getMonth()]} {m1.getFullYear()}
                              </span>
                              <span className="font-extrabold text-base text-white hidden md:block">
                                {MONTH_NAMES[m2.getMonth()]} {m2.getFullYear()}
                              </span>
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                          aria-label="Next Month"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Side-by-side Dual Month Grid */}
                      {(() => {
                        const todayStr = formatDateString(new Date());
                        const m1 = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
                        const m2 = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
                        const monthsToRender = [m1, m2];

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {monthsToRender.map((mDate) => {
                              const y = mDate.getFullYear();
                              const m = mDate.getMonth();
                              const daysInMonth = new Date(y, m + 1, 0).getDate();
                              const firstDayOfWeek = new Date(y, m, 1).getDay();

                              return (
                                <div key={`${y}-${m}`} className="space-y-2">
                                  <div className="md:hidden text-center font-bold text-sm text-zinc-300 pb-1">
                                    {MONTH_NAMES[m]} {y}
                                  </div>

                                  {/* Weekdays Header */}
                                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-zinc-400 pb-1">
                                    {WEEKDAYS.map((w) => (
                                      <div key={w}>{w}</div>
                                    ))}
                                  </div>

                                  {/* Days Grid */}
                                  <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                                      <div key={`empty-${idx}`} className="h-12" />
                                    ))}

                                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                                      const dayNum = idx + 1;
                                      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                                      const isPast = dateStr < todayStr;
                                      const info = calendarData[dateStr];
                                      const isClosed = info?.closed;
                                      const isSoldOut = info?.status === "sold_out";
                                      const isCheckInDate = dateStr === checkIn;
                                      const isCheckOutDate = dateStr === checkOut;
                                      const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
                                      const isDisabled = isPast || isClosed;

                                      return (
                                        <button
                                          key={dateStr}
                                          type="button"
                                          disabled={isDisabled}
                                          onClick={() => handleCalendarDateSelect(dateStr)}
                                          title={
                                            isClosed
                                              ? info?.closure_reason || "Closed"
                                              : info?.available_rooms !== undefined
                                              ? `${info.available_rooms} rooms available`
                                              : `Date: ${dateStr}`
                                          }
                                          className={`h-13 min-h-[52px] rounded-xl flex flex-col items-center justify-center relative p-1 transition-all text-xs cursor-pointer ${
                                            isCheckInDate
                                              ? "bg-amber-500 text-white font-extrabold shadow-lg scale-105 z-10 rounded-xl ring-2 ring-amber-300"
                                              : isCheckOutDate
                                              ? "bg-amber-500 text-white font-extrabold shadow-lg scale-105 z-10 rounded-xl ring-2 ring-amber-300"
                                              : isInRange
                                              ? "bg-amber-500/20 text-amber-200 rounded-none first:rounded-l-xl last:rounded-r-xl border-y border-amber-500/30"
                                              : isDisabled
                                              ? "opacity-30 cursor-not-allowed text-zinc-600 bg-zinc-900/30"
                                              : isSoldOut
                                              ? "bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800"
                                              : info?.available_rooms !== undefined && info.available_rooms > 0
                                              ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:border-amber-500/60 border border-zinc-800 shadow-sm"
                                              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:border-amber-500/50 border border-zinc-800/80"
                                          }`}
                                        >
                                          <span className="font-bold text-xs leading-none">{dayNum}</span>

                                          {!isDisabled && (
                                            <div className="flex flex-col items-center mt-1 leading-none">
                                              <span
                                                className={`text-[9px] font-extrabold truncate max-w-full px-1.5 py-0.5 rounded-full ${
                                                  isCheckInDate || isCheckOutDate
                                                    ? "text-white bg-amber-600/70"
                                                    : isSoldOut
                                                    ? "text-rose-400 bg-rose-950/60"
                                                    : info?.available_rooms !== undefined
                                                    ? info.available_rooms > 2
                                                      ? "text-emerald-400 bg-emerald-950/70 border border-emerald-500/30"
                                                      : "text-amber-400 bg-amber-950/70 border border-amber-500/30"
                                                    : "text-emerald-400 bg-emerald-950/70"
                                                }`}
                                              >
                                                {isSoldOut
                                                  ? "Full"
                                                  : info?.available_rooms !== undefined
                                                  ? `${info.available_rooms} rms`
                                                  : "Available"}
                                              </span>
                                            </div>
                                          )}

                                          {isClosed && (
                                            <span className="text-[8px] text-rose-400 font-bold leading-none mt-0.5">
                                              Closed
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Calendar Footer: Legend & Actions */}
                      <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 flex-wrap text-zinc-400 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <span>Available</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span>Fast Filling (≤2 rms)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                            <span>Sold Out / Closed</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                          >
                            Apply Dates ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purpose Selection */}
                {purposes.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Purpose of Booking
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {purposes.map((p) => {
                        const isSelected = purposeId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPurposeId(p.id)}
                            className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30 shadow-md"
                                : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 text-zinc-300"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Blocker Alert if active on selected dates */}
                {quote?.blockers && quote.blockers.length > 0 && (
                  <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-4 space-y-1 text-xs text-rose-300">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Date Notice:</span>
                    </div>
                    {quote.blockers.map((b, idx) => (
                      <p key={idx} className="pl-6 text-zinc-300">{b}</p>
                    ))}
                  </div>
                )}

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
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        {quoteLoading ? (
                          <>Checking Availability...</>
                        ) : (
                          <>Select Rooms per Date <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}


            {/* Step 2: Ultra-Simple & Intuitive Accommodation Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white">Step 2: Select Accommodations</h2>
                    {stayDates.length > 1 && (
                      <div className="inline-flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setViewMode("all")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            viewMode === "all"
                              ? "bg-amber-500 text-white shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Same for All {stayDates.length} Nights</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("tabs")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            viewMode === "tabs"
                              ? "bg-amber-500 text-white shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Customize by Date</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {stayDates.length > 1 && viewMode === "all"
                      ? `Select the rooms/spaces you need. They will be booked for all ${stayDates.length} nights of your stay.`
                      : stayDates.length > 1 && viewMode === "tabs"
                      ? "Customize different room counts or spaces for each night of your stay."
                      : "Choose the rooms, halls, or dormitories needed for your stay."}
                  </p>
                </div>

                {/* Stay Duration Overview Bar */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Stay Duration</p>
                      <p className="text-sm font-extrabold text-white mt-0.5">
                        {checkIn ? formatDateDisplay(checkIn, { weekday: "short", month: "short", day: "numeric" }) : ""}
                        {" → "}
                        {checkOut ? formatDateDisplay(checkOut, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : ""}
                        <span className="text-amber-400 font-semibold ml-2">
                          ({quote?.nights || stayDates.length} {(quote?.nights || stayDates.length) === 1 ? "Night" : "Nights"})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-sm">
                      {totalRoomNights} Total Unit{totalRoomNights === 1 ? "" : "s"} Selected
                    </span>
                  </div>
                </div>

                {/* Loading & Empty State Fallbacks */}
                {configLoading && types.length === 0 ? (
                  <div className="p-12 rounded-2xl border border-zinc-800 bg-zinc-950 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                    <p className="text-sm font-bold text-white">Loading Available Accommodations...</p>
                    <p className="text-xs text-zinc-500">Fetching room and hall inventory from server</p>
                  </div>
                ) : types.length === 0 ? (
                  <div className="p-12 rounded-2xl border border-zinc-800 bg-zinc-950 text-center space-y-4">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">No accommodation spaces available</p>
                      <p className="text-xs text-zinc-500 mt-1">Unable to load accommodation inventory</p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchConfig}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      Retry Loading
                    </button>
                  </div>
                ) : (
                  <>
                    {/* MODE A: Simple Default Mode (Same Count for All Nights / Single Night Stay) */}
                    {(viewMode === "all" || stayDates.length <= 1) && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {types.map((t) => {
                            // Find min available capacity across all stay dates for this type
                            const minAvailAcrossStay = stayDates.length > 0
                              ? Math.min(...stayDates.map((d) => getDateTypeAvailable(d, t.id)))
                              : 0;

                            // Base price per night
                            const basePrice = parseFloat(String(t.base_price_per_night || 0));
                            // Current quantity on first date
                            const currentQty = stayDates.length > 0 ? getDateTypeQty(stayDates[0], t.id) : 0;
                            const isSoldOut = minAvailAcrossStay <= 0;
                            const isLimited = minAvailAcrossStay > 0 && minAvailAcrossStay <= 2;
                            const numNights = stayDates.length || 1;
                            const totalCostForType = currentQty * basePrice * numNights;

                            return (
                              <div
                                key={t.id}
                                className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                  currentQty > 0
                                    ? "border-amber-500/50 bg-zinc-900/90 shadow-md ring-1 ring-amber-500/20"
                                    : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/50"
                                }`}
                              >
                                {/* Space Info */}
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="font-extrabold text-base sm:text-lg text-white">
                                      {t.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                                      {t.kind || "Room"}
                                    </span>
                                    {t.capacity_per_unit > 0 && (
                                      <span className="text-xs text-zinc-400">
                                        • Up to {t.capacity_per_unit} guests/unit
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isSoldOut ? "bg-rose-400" : isLimited ? "bg-amber-400" : "bg-emerald-400"
                                        }`}
                                      />
                                      <span
                                        className={
                                          isSoldOut
                                            ? "text-rose-400 font-bold"
                                            : isLimited
                                            ? "text-amber-400 font-bold"
                                            : "text-emerald-400 font-bold"
                                        }
                                      >
                                        {isSoldOut
                                          ? "Sold Out for Selected Dates"
                                          : `${minAvailAcrossStay} Available (All Dates)`}
                                      </span>
                                    </span>

                                    <span className="text-zinc-600">•</span>

                                    <span className="text-zinc-200">
                                      Rate: <strong className="text-amber-300 font-bold">₹{basePrice.toLocaleString("en-IN")}</strong> / night
                                    </span>
                                  </div>

                                  {stayDates.length > 1 && (() => {
                                    const diffDates = stayDates.map(d => ({ date: d, count: getDateTypeAvailable(d, t.id) }));
                                    const hasDiff = diffDates.some(d => d.count !== diffDates[0].count);
                                    if (hasDiff) {
                                      return (
                                        <div className="text-[11px] text-amber-400 font-medium pt-0.5 flex items-center gap-1.5 flex-wrap">
                                          <span>⚡ Daily availability:</span>
                                          <span className="font-semibold text-zinc-300">
                                            {diffDates.map(d => `${formatDateDisplay(d.date, { weekday: "short", day: "numeric" })}: ${d.count} avail`).join(" · ")}
                                          </span>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setViewMode("tabs")}
                                            className="underline font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                                          >
                                            Customize by date →
                                          </button>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {currentQty > 0 && (
                                    <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block mt-1">
                                      {currentQty} {currentQty === 1 ? "unit" : "units"} × ₹{basePrice.toLocaleString("en-IN")} × {numNights} {numNights === 1 ? "night" : "nights"} ={" "}
                                      <strong className="text-white font-extrabold">₹{totalCostForType.toLocaleString("en-IN")}</strong>
                                    </div>
                                  )}
                                </div>

                                {/* Stepper Control */}
                                <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-center">
                                  <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden p-1 shadow-inner">
                                    <button
                                      type="button"
                                      disabled={currentQty <= 0}
                                      onClick={() => handleApplyBulkQty(t.id, Math.max(0, currentQty - 1))}
                                      className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                      aria-label={`Decrease ${t.name}`}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={minAvailAcrossStay}
                                      disabled={isSoldOut}
                                      value={currentQty}
                                      onChange={(e) => {
                                        const parsed = parseInt(e.target.value, 10);
                                        handleApplyBulkQty(t.id, isNaN(parsed) ? 0 : parsed);
                                      }}
                                      className="w-16 text-center font-extrabold text-lg bg-transparent text-amber-400 focus:outline-none disabled:text-zinc-600"
                                    />
                                    <button
                                      type="button"
                                      disabled={currentQty >= minAvailAcrossStay || isSoldOut}
                                      onClick={() => handleApplyBulkQty(t.id, currentQty + 1)}
                                      className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                      aria-label={`Increase ${t.name}`}
                                    >
                                      +
                                    </button>
                                  </div>

                                  {currentQty >= minAvailAcrossStay && minAvailAcrossStay > 0 && (
                                    <span className="text-[10px] text-amber-400 font-semibold">
                                      Max available limit ({minAvailAcrossStay})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {stayDates.length > 1 && (
                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => setViewMode("tabs")}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                            >
                              <CalendarDays className="w-4 h-4" /> Need different room counts on different dates? Customize by date →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* MODE B: Customize by Date (Tabbed Night-by-Night View) */}
                {viewMode === "tabs" && stayDates.length > 1 && (() => {
                  const safeIndex = Math.min(activeDateIndex, stayDates.length - 1);
                  const activeDateStr = stayDates[safeIndex] || stayDates[0];
                  const activeNightUnits = types.reduce((sum, t) => sum + getDateTypeQty(activeDateStr, t.id), 0);
                  const activeNightCost = types.reduce((sum, t) => sum + getDateTypeQty(activeDateStr, t.id) * getDateTypePrice(activeDateStr, t.id), 0);

                  return (
                    <div className="space-y-4">
                      {/* Date Tabs Strip */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {stayDates.map((dateStr, idx) => {
                          const isSelected = idx === safeIndex;
                          const dayUnits = types.reduce((acc, t) => acc + getDateTypeQty(dateStr, t.id), 0);
                          const dayCost = types.reduce((acc, t) => acc + getDateTypeQty(dateStr, t.id) * getDateTypePrice(dateStr, t.id), 0);

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => setActiveDateIndex(idx)}
                              className={`flex-shrink-0 p-3 rounded-2xl border text-left transition-all cursor-pointer min-w-[155px] ${
                                isSelected
                                  ? "border-amber-500 bg-zinc-900 shadow-md ring-2 ring-amber-500/30"
                                  : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-400"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider mb-1">
                                <span className={isSelected ? "text-amber-400" : "text-zinc-500"}>
                                  Night {idx + 1} of {stayDates.length}
                                </span>
                                {dayUnits > 0 ? (
                                  <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-500/30">
                                    {dayUnits} {dayUnits === 1 ? "unit" : "units"}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 text-[9px]">0 units</span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm font-extrabold text-white">
                                {formatDateDisplay(dateStr, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                              <div className="text-[11px] font-mono text-amber-300/90 font-semibold mt-1">
                                {dayCost > 0 ? `₹${dayCost.toLocaleString("en-IN")}` : "₹0"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Night Space Selection Card */}
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 space-y-5">
                        {/* Night Header & Quick Copy Shortcut */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
                          <div>
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                              Configuring Night {safeIndex + 1} of {stayDates.length}
                            </span>
                            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                              {formatDateDisplay(activeDateStr)}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Night Subtotal</span>
                              <span className="text-base font-extrabold text-amber-400 font-mono">
                                ₹{activeNightCost.toLocaleString("en-IN")}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyDayToAll(activeDateStr)}
                              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Copies this night's selections to all other nights"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy to All Nights
                            </button>
                          </div>
                        </div>

                        {/* List of Accommodation Spaces for this night */}
                        <div className="space-y-3">
                          {types.map((t) => {
                            const maxAvail = getDateTypeAvailable(activeDateStr, t.id);
                            const price = getDateTypePrice(activeDateStr, t.id);
                            const currentQty = getDateTypeQty(activeDateStr, t.id);
                            const isFull = maxAvail <= 0;
                            const isLimited = maxAvail > 0 && maxAvail <= 2;
                            const itemTotal = price * currentQty;

                            return (
                              <div
                                key={t.id}
                                className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                  currentQty > 0
                                    ? "border-amber-500/40 bg-zinc-900/90 shadow-sm ring-1 ring-amber-500/10"
                                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                                }`}
                              >
                                {/* Accommodation Details */}
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-base text-white">
                                      {t.name}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      {t.kind || "Room"}
                                    </span>
                                    {t.capacity_per_unit > 0 && (
                                      <span className="text-xs text-zinc-400">
                                        · Up to {t.capacity_per_unit} guests
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isFull ? "bg-rose-400" : isLimited ? "bg-amber-400" : "bg-emerald-400"
                                        }`}
                                      />
                                      <span
                                        className={
                                          isFull
                                            ? "text-rose-400 font-bold"
                                            : isLimited
                                            ? "text-amber-400 font-bold"
                                            : "text-emerald-400 font-bold"
                                        }
                                      >
                                        {isFull ? "Sold Out on this date" : `${maxAvail} Available on this date`}
                                      </span>
                                    </span>

                                    <span className="text-zinc-600">•</span>

                                    <span className="text-zinc-300">
                                      Rate: <strong className="text-amber-300 font-bold">₹{price.toLocaleString("en-IN")}</strong> / night
                                    </span>
                                  </div>

                                  {currentQty > 0 && (
                                    <div className="text-xs text-zinc-400 pt-1">
                                      {currentQty} × ₹{price.toLocaleString("en-IN")} = <strong className="text-emerald-400 font-bold">₹{itemTotal.toLocaleString("en-IN")}</strong>
                                    </div>
                                  )}
                                </div>

                                {/* Stepper Control */}
                                <div className="flex flex-col sm:items-end gap-1 shrink-0 self-start sm:self-center">
                                  <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden p-1 shadow-inner">
                                    <button
                                      type="button"
                                      disabled={currentQty <= 0}
                                      onClick={() => handleSetDateTypeQty(activeDateStr, t.id, currentQty - 1)}
                                      className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxAvail}
                                      disabled={isFull}
                                      value={currentQty}
                                      onChange={(e) => {
                                        const parsed = parseInt(e.target.value, 10);
                                        handleSetDateTypeQty(activeDateStr, t.id, isNaN(parsed) ? 0 : parsed);
                                      }}
                                      className="w-14 text-center font-extrabold text-base bg-transparent text-amber-400 focus:outline-none disabled:text-zinc-600"
                                    />
                                    <button
                                      type="button"
                                      disabled={currentQty >= maxAvail || isFull}
                                      onClick={() => handleSetDateTypeQty(activeDateStr, t.id, currentQty + 1)}
                                      className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {currentQty >= maxAvail && maxAvail > 0 && (
                                    <span className="text-[10px] text-amber-400 font-semibold">
                                      Max available ({maxAvail})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Night Navigation Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
                          <button
                            type="button"
                            disabled={safeIndex === 0}
                            onClick={() => setActiveDateIndex(safeIndex - 1)}
                            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Previous Night
                          </button>

                          <span className="text-zinc-500 font-semibold text-[11px]">
                            Night {safeIndex + 1} of {stayDates.length}
                          </span>

                          {safeIndex < stayDates.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setActiveDateIndex(safeIndex + 1)}
                              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                            >
                              Next Night ({formatDateDisplay(stayDates[safeIndex + 1], { month: "short", day: "numeric" })}) <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-bold">✓ All Nights Configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </>
              )}

                {/* Navigation Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Dates
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    Select Amenities <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}


            {/* Step 3: Amenities Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Step 3: Select Additional Amenities</h2>
                    <p className="text-sm text-zinc-400">
                      Add coolers, chairs, mattresses or event supplies — configure for all days or customize per date
                    </p>
                  </div>

                  {stayDates.length > 1 && (
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setAmenityViewMode("all")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          amenityViewMode === "all"
                            ? "bg-amber-500 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Same for All Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmenityViewMode("tabs")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          amenityViewMode === "tabs"
                            ? "bg-amber-500 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <CalendarDays className="w-3.5 h-3.5" /> Customize by Date
                      </button>
                    </div>
                  )}
                </div>

                {/* Amenities Overview Summary Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Stay Duration</span>
                        <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                          {stayDates.length} {stayDates.length === 1 ? "Day" : "Days"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {stayDates.length > 0 && `${formatDateDisplay(stayDates[0], { month: "short", day: "numeric" })} to ${formatDateDisplay(stayDates[stayDates.length - 1], { month: "short", day: "numeric" })}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Selected Items</span>
                      <span className="text-base font-extrabold text-white">
                        {totalAmenityUnits} <span className="text-xs font-normal text-zinc-400">total unit-days</span>
                      </span>
                    </div>
                    {quote?.amenities && quote.amenities.length > 0 && (
                      <div className="text-right pl-4 border-l border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Amenities Subtotal</span>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          ₹{quote.amenities.reduce((sum, a) => sum + parseFloat(String(a.line_total || 0)), 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* MODE A: Same for All Days */}
                {amenityViewMode === "all" && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {amenities.map((a) => {
                        const isOutOfStock = a.available_quantity !== null && a.available_quantity !== undefined && a.available_quantity <= 0 && !a.allow_over_request;
                        const maxLimit = a.available_quantity !== null && a.available_quantity !== undefined && !a.allow_over_request
                          ? a.available_quantity
                          : 9999;
                        
                        // Current bulk quantity: check first date or selectedAmenities
                        const firstDateQty = stayDates.length > 0 ? getDateAmenityQty(stayDates[0], a.id) : 0;
                        const isSelected = firstDateQty > 0;
                        const itemPrice = parseFloat(String(a.price)) || 0;
                        const isPerDay = a.pricing_type !== "per_booking" && a.pricing_type !== "one_time";
                        const estimatedItemTotal = isPerDay ? itemPrice * firstDateQty * (stayDates.length || 1) : itemPrice * firstDateQty;

                        return (
                          <div
                            key={a.id}
                            className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isSelected
                                ? "border-amber-500/40 bg-zinc-900/90 shadow-md ring-1 ring-amber-500/10"
                                : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/50"
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-white text-base">{a.name}</h4>
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                                  ₹{itemPrice.toFixed(2)} ({a.pricing_type.replace("_", " ")})
                                </span>
                                {a.available_quantity !== null && a.available_quantity !== undefined ? (
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                      a.available_quantity > 0
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    }`}
                                  >
                                    {a.available_quantity > 0
                                      ? `Stock: ${a.available_quantity} available`
                                      : "Out of Stock"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    Unlimited Stock
                                  </span>
                                )}
                              </div>

                              {isSelected && (
                                <div className="text-xs text-zinc-400 pt-0.5">
                                  {isPerDay ? (
                                    <span>
                                      {firstDateQty} units × ₹{itemPrice.toLocaleString("en-IN")}/day × {stayDates.length || 1} days ={" "}
                                      <strong className="text-emerald-400 font-bold font-mono">
                                        ₹{estimatedItemTotal.toLocaleString("en-IN")}
                                      </strong>
                                    </span>
                                  ) : (
                                    <span>
                                      {firstDateQty} units × ₹{itemPrice.toLocaleString("en-IN")} (one-time) ={" "}
                                      <strong className="text-emerald-400 font-bold font-mono">
                                        ₹{estimatedItemTotal.toLocaleString("en-IN")}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Stepper Control */}
                            <div className="flex flex-col sm:items-end gap-1 shrink-0 self-start sm:self-center">
                              <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden p-1 shadow-inner">
                                <button
                                  type="button"
                                  disabled={firstDateQty <= 0}
                                  onClick={() => handleApplyBulkAmenityQty(a.id, firstDateQty - 1)}
                                  className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={maxLimit}
                                  disabled={isOutOfStock}
                                  value={firstDateQty}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    handleApplyBulkAmenityQty(a.id, isNaN(parsed) ? 0 : parsed);
                                  }}
                                  className="w-14 text-center font-extrabold text-base bg-transparent text-amber-400 focus:outline-none disabled:text-zinc-600"
                                />
                                <button
                                  type="button"
                                  disabled={firstDateQty >= maxLimit || isOutOfStock}
                                  onClick={() => handleApplyBulkAmenityQty(a.id, firstDateQty + 1)}
                                  className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>

                              {firstDateQty >= maxLimit && maxLimit < 9999 && (
                                <span className="text-[10px] text-amber-400 font-semibold">
                                  Max stock reached ({maxLimit})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {stayDates.length > 1 && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => setAmenityViewMode("tabs")}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                        >
                          <CalendarDays className="w-4 h-4" /> Need different amenity counts on specific days? Customize by date →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE B: Customize by Date (Tabbed Day-by-Day View) */}
                {amenityViewMode === "tabs" && stayDates.length > 1 && (() => {
                  const safeIndex = Math.min(activeAmenityDateIndex, stayDates.length - 1);
                  const activeDateStr = stayDates[safeIndex] || stayDates[0];
                  const activeDayUnits = amenities.reduce((sum, a) => sum + getDateAmenityQty(activeDateStr, a.id), 0);
                  const activeDayCost = amenities.reduce((sum, a) => {
                    const q = getDateAmenityQty(activeDateStr, a.id);
                    const p = parseFloat(String(a.price)) || 0;
                    return sum + q * p;
                  }, 0);

                  return (
                    <div className="space-y-4">
                      {/* Date Tabs Strip */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {stayDates.map((dateStr, idx) => {
                          const isSelected = idx === safeIndex;
                          const dayUnits = amenities.reduce((acc, a) => acc + getDateAmenityQty(dateStr, a.id), 0);
                          const dayCost = amenities.reduce((acc, a) => {
                            const q = getDateAmenityQty(dateStr, a.id);
                            const p = parseFloat(String(a.price)) || 0;
                            return acc + q * p;
                          }, 0);

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => setActiveAmenityDateIndex(idx)}
                              className={`flex-shrink-0 p-3 rounded-2xl border text-left transition-all cursor-pointer min-w-[155px] ${
                                isSelected
                                  ? "border-amber-500 bg-zinc-900 shadow-md ring-2 ring-amber-500/30"
                                  : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-400"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider mb-1">
                                <span className={isSelected ? "text-amber-400" : "text-zinc-500"}>
                                  Day {idx + 1} of {stayDates.length}
                                </span>
                                {dayUnits > 0 ? (
                                  <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-500/30">
                                    {dayUnits} {dayUnits === 1 ? "item" : "items"}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 text-[9px]">0 items</span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm font-extrabold text-white">
                                {formatDateDisplay(dateStr, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                              <div className="text-[11px] font-mono text-amber-300/90 font-semibold mt-1">
                                {dayCost > 0 ? `₹${dayCost.toLocaleString("en-IN")}` : "₹0"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Day Amenity Configuration Card */}
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 space-y-5">
                        {/* Day Header & 1-Click Copy Shortcut */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
                          <div>
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                              Configuring Day {safeIndex + 1} of {stayDates.length}
                            </span>
                            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                              {formatDateDisplay(activeDateStr)}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Day Amenity Cost</span>
                              <span className="text-base font-extrabold text-amber-400 font-mono">
                                ₹{activeDayCost.toLocaleString("en-IN")}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyAmenityDayToAll(activeDateStr)}
                              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Copies this day's amenity quantities to all other days of your stay"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy to All Days
                            </button>
                          </div>
                        </div>

                        {/* List of Amenities for Active Day */}
                        <div className="space-y-3">
                          {amenities.map((a) => {
                            const isOutOfStock = a.available_quantity !== null && a.available_quantity !== undefined && a.available_quantity <= 0 && !a.allow_over_request;
                            const maxLimit = a.available_quantity !== null && a.available_quantity !== undefined && !a.allow_over_request
                              ? a.available_quantity
                              : 9999;
                            const currentQty = getDateAmenityQty(activeDateStr, a.id);
                            const itemPrice = parseFloat(String(a.price)) || 0;
                            const itemTotal = itemPrice * currentQty;

                            return (
                              <div
                                key={a.id}
                                className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                  currentQty > 0
                                    ? "border-amber-500/40 bg-zinc-900/90 shadow-sm ring-1 ring-amber-500/10"
                                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                                }`}
                              >
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-base text-white">{a.name}</span>
                                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      ₹{itemPrice.toFixed(2)} / {a.pricing_type.replace("_", " ")}
                                    </span>
                                    {a.available_quantity !== null && a.available_quantity !== undefined ? (
                                      <span
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                          a.available_quantity > 0
                                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                        }`}
                                      >
                                        {a.available_quantity > 0
                                          ? `Stock: ${a.available_quantity} available`
                                          : "Out of Stock"}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        Unlimited Stock
                                      </span>
                                    )}
                                  </div>

                                  {currentQty > 0 && (
                                    <div className="text-xs text-zinc-400 pt-1">
                                      {currentQty} × ₹{itemPrice.toLocaleString("en-IN")} ={" "}
                                      <strong className="text-emerald-400 font-bold font-mono">
                                        ₹{itemTotal.toLocaleString("en-IN")}
                                      </strong>
                                    </div>
                                  )}
                                </div>

                                {/* Stepper Control */}
                                <div className="flex flex-col sm:items-end gap-1 shrink-0 self-start sm:self-center">
                                  <div className="flex items-center border border-zinc-700 bg-zinc-950 rounded-xl overflow-hidden p-1 shadow-inner">
                                    <button
                                      type="button"
                                      disabled={currentQty <= 0}
                                      onClick={() => handleSetDateAmenityQty(activeDateStr, a.id, currentQty - 1)}
                                      className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxLimit}
                                      disabled={isOutOfStock}
                                      value={currentQty}
                                      onChange={(e) => {
                                        const parsed = parseInt(e.target.value, 10);
                                        handleSetDateAmenityQty(activeDateStr, a.id, isNaN(parsed) ? 0 : parsed);
                                      }}
                                      className="w-14 text-center font-extrabold text-base bg-transparent text-amber-400 focus:outline-none disabled:text-zinc-600"
                                    />
                                    <button
                                      type="button"
                                      disabled={currentQty >= maxLimit || isOutOfStock}
                                      onClick={() => handleSetDateAmenityQty(activeDateStr, a.id, currentQty + 1)}
                                      className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {currentQty >= maxLimit && maxLimit < 9999 && (
                                    <span className="text-[10px] text-amber-400 font-semibold">
                                      Max stock reached ({maxLimit})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Day Navigation Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
                          <button
                            type="button"
                            disabled={safeIndex === 0}
                            onClick={() => setActiveAmenityDateIndex(safeIndex - 1)}
                            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Previous Day
                          </button>

                          <span className="text-zinc-500 font-semibold text-[11px]">
                            Day {safeIndex + 1} of {stayDates.length}
                          </span>

                          {safeIndex < stayDates.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setActiveAmenityDateIndex(safeIndex + 1)}
                              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                            >
                              Next Day ({formatDateDisplay(stayDates[safeIndex + 1], { month: "short", day: "numeric" })}) <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-bold">✓ All Days Configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Rooms
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
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

                {/* Compact E-Commerce Style Coupon Widget */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Gift className="w-4 h-4 text-emerald-400" />
                      <span>Coupons & Special Offers</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCouponModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {selectedVoucherCode ? "Change Coupon" : `View Available Coupons (${vouchers.length})`} ↗
                    </button>
                  </div>

                  {selectedVoucherCode ? (
                    <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-emerald-300">{selectedVoucherCode}</span>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Coupon Applied ✓
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {quote?.voucher_discount && quote.voucher_discount > 0 ? (
                              <span className="text-emerald-400 font-semibold">Discount of ₹{quote.voucher_discount} applied to your bill</span>
                            ) : (
                              "Promotional discount applied"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCouponModalOpen(true)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleClearVoucher}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Have a coupon code or want to browse special community offers?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCouponModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer shadow-sm"
                      >
                        Show Coupons
                      </button>
                    </div>
                  )}
                </div>

                {/* Detailed Date-wise Room Breakdown Table */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Applicant:</span>
                    <span className="font-semibold text-white">{fullName} ({mobile})</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Stay Period & Timings:</span>
                    <span className="font-semibold text-white">{checkIn} (10:00 AM) to {checkOut} (08:00 AM) ({quote?.nights || stayDates.length} nights)</span>
                  </div>

                  {/* Accommodation Allocation Breakdown */}
                  <div className="border-b border-zinc-900 pb-3 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4" /> Accommodation Booking Breakdown ({totalRoomNights} Total Units Across Stay)
                    </span>
                    <div className="space-y-2 pt-1">
                      {stayDates.map((dateStr, idx) => {
                        const dayTypes = types.filter((t) => getDateTypeQty(dateStr, t.id) > 0);
                        const dayCost = types.reduce((sum, t) => sum + getDateTypeQty(dateStr, t.id) * getDateTypePrice(dateStr, t.id), 0);

                        return (
                          <div key={dateStr} className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{formatDateDisplay(dateStr)} (Night {idx + 1})</span>
                              <span className="font-mono font-bold text-amber-300">
                                ₹{dayCost.toLocaleString("en-IN")}
                              </span>
                            </div>
                            {dayTypes.length > 0 ? (
                              <div className="space-y-1 pl-2 border-l border-amber-500/30">
                                {dayTypes.map((t) => {
                                  const qty = getDateTypeQty(dateStr, t.id);
                                  const price = getDateTypePrice(dateStr, t.id);
                                  return (
                                    <div key={t.id} className="flex justify-between text-[11px] text-zinc-300">
                                      <span>{qty} × {t.name} (@ ₹{price.toLocaleString("en-IN")}/unit)</span>
                                      <span className="font-mono text-zinc-400">₹{(qty * price).toLocaleString("en-IN")}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 block italic">No units selected for this date</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amenities Breakdown */}
                  {quote?.amenities && quote.amenities.length > 0 && (
                    <div className="border-b border-zinc-900 pb-3 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Selected Amenities Breakdown ({totalAmenityUnits} Total Unit-Days)
                      </span>
                      <div className="space-y-2 pt-1">
                        {stayDates.map((dateStr, idx) => {
                          const dayAmens = amenities.filter((a) => getDateAmenityQty(dateStr, a.id) > 0);
                          const dayAmenCost = amenities.reduce((sum, a) => {
                            const q = getDateAmenityQty(dateStr, a.id);
                            const p = parseFloat(String(a.price)) || 0;
                            return sum + q * p;
                          }, 0);

                          if (dayAmens.length === 0) return null;

                          return (
                            <div key={dateStr} className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white">{formatDateDisplay(dateStr)} (Day {idx + 1})</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  ₹{dayAmenCost.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="space-y-1 pl-2 border-l border-emerald-500/30">
                                {dayAmens.map((a) => {
                                  const qty = getDateAmenityQty(dateStr, a.id);
                                  const price = parseFloat(String(a.price)) || 0;
                                  return (
                                    <div key={a.id} className="flex justify-between text-[11px] text-zinc-300">
                                      <span>{qty} × {a.name} (@ ₹{price.toLocaleString("en-IN")})</span>
                                      <span className="font-mono text-zinc-400">₹{(qty * price).toLocaleString("en-IN")}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                    <p className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Stay Period & Timings</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{quote.check_in} (10:00 AM) → {quote.check_out} (08:00 AM)</p>
                    <p className="text-[10px] text-zinc-400">{quote.nights} night(s) · Billed per 22-hour cycle (10:00 AM to 08:00 AM next day)</p>
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

                  {/* Selected Dates Accommodation Plan in Sidebar */}
                  <div className="border-t border-zinc-900 pt-3">
                    <p className="text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-[10px] flex items-center justify-between">
                      <span>Accommodation Plan</span>
                      <span className="text-amber-400 font-bold">{totalRoomNights} units</span>
                    </p>
                    <div className="space-y-2">
                      {stayDates.map((dateStr) => {
                        const dayTypes = types.filter((t) => getDateTypeQty(dateStr, t.id) > 0);
                        const dayCost = types.reduce((sum, t) => sum + getDateTypeQty(dateStr, t.id) * getDateTypePrice(dateStr, t.id), 0);

                        return (
                          <div key={dateStr} className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-white">{formatDateDisplay(dateStr)}</span>
                              <span className="font-mono font-semibold text-amber-400">₹{dayCost.toLocaleString("en-IN")}</span>
                            </div>
                            {dayTypes.length > 0 ? (
                              <div className="text-[10px] text-zinc-400 space-y-0.5">
                                {dayTypes.map((t) => (
                                  <div key={t.id} className="flex justify-between">
                                    <span>{getDateTypeQty(dateStr, t.id)} × {t.name}</span>
                                    <span>₹{(getDateTypeQty(dateStr, t.id) * getDateTypePrice(dateStr, t.id)).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-500 italic">0 units</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {quote.amenities.length > 0 && (
                    <div className="border-t border-zinc-900 pt-3">
                      <p className="text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-[10px] flex items-center justify-between">
                        <span>Amenities Plan</span>
                        <span className="text-emerald-400 font-bold">{totalAmenityUnits} unit-days</span>
                      </p>
                      {quote.amenities.map((amen, i) => (
                        <div key={i} className="flex justify-between items-start py-1 text-zinc-300">
                          <div>
                            <span className="font-semibold">{amen.quantity} × {amen.amenity_name}</span>
                            {amen.multiplier_description && (
                              <span className="text-[10px] text-zinc-500 block">{amen.multiplier_description}</span>
                            )}
                          </div>
                          <span className="font-mono font-semibold">₹{amen.line_total}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Applied Coupon Card or Show Coupons Trigger in Sidebar */}
                  {selectedVoucherCode ? (
                    <div className="border-t border-zinc-900 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-400" /> Applied Coupon
                        </span>
                        <button
                          type="button"
                          onClick={handleClearVoucher}
                          className="text-[10px] text-rose-400 hover:underline font-semibold cursor-pointer"
                        >
                          Remove ✕
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-xs text-emerald-300">{selectedVoucherCode}</span>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30">Applied ✓</span>
                            </div>
                            <p className="text-[10px] text-emerald-400/90 font-medium truncate">
                              {quote?.voucher_discount && quote.voucher_discount > 0
                                ? `You save ₹${quote.voucher_discount}`
                                : "Coupon applied"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCouponModalOpen(true)}
                          className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer ml-2 shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-zinc-900 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-emerald-400" /> Coupons & Offers
                        </span>
                      </div>

                      {/* E-Commerce style "View Coupons" trigger button */}
                      <button
                        type="button"
                        onClick={() => setIsCouponModalOpen(true)}
                        className="w-full p-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-500/70 text-left transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
                            <Percent className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">View Available Coupons</span>
                            <span className="text-[10px] text-emerald-400 block">
                              {vouchers.length > 0 ? `${vouchers.length} offers available` : "Click to view offers"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          View →
                        </span>
                      </button>

                      {/* Manual Promo Code Input */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={customVoucherInput}
                          onChange={(e) => setCustomVoucherInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCustomCode();
                            }
                          }}
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
                  )}

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
              All room allocations and estimates are subject to admin review.
            </div>
          </div>

        </div>

      </div>

      {/* Amazon / E-Commerce Style Coupons Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsCouponModalOpen(false)}
          />
          <div className="relative w-full max-w-xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Coupons & Special Offers</h3>
                  <p className="text-xs text-zinc-400">Apply an available coupon or enter your promo code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Manual Coupon Input Box */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customVoucherInput}
                    onChange={(e) => setCustomVoucherInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCustomCode();
                        setIsCouponModalOpen(false);
                      }
                    }}
                    placeholder="ENTER PROMO / COUPON CODE"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs font-mono font-bold text-white uppercase focus:border-emerald-500 focus:outline-none placeholder:text-zinc-600 placeholder:font-sans"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyCustomCode();
                    if (customVoucherInput.trim()) {
                      setIsCouponModalOpen(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
                >
                  Apply Code
                </button>
              </div>
            </div>

            {/* Coupon List Container */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 max-h-[50vh]">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">
                <span>Available Coupons ({vouchers.length})</span>
                {selectedVoucherCode && (
                  <button
                    type="button"
                    onClick={handleClearVoucher}
                    className="text-rose-400 hover:underline normal-case text-xs font-semibold cursor-pointer"
                  >
                    Remove Applied Coupon
                  </button>
                )}
              </div>

              {vouchers.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  No public coupons currently active. Enter a code above if you have one.
                </div>
              ) : (
                vouchers.map((v) => {
                  const isApplied = selectedVoucherId === v.id || selectedVoucherCode === v.code;
                  const discountLabel = v.discount_type === "percentage"
                    ? `${v.discount_value}% OFF`
                    : `₹${v.discount_value} OFF`;

                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isApplied
                          ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      {/* Left Ticket Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-500/40 tracking-wider">
                            {v.code}
                          </span>
                          <span className="font-black text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                            {discountLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{v.title}</h4>
                        {v.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed">{v.description}</p>
                        )}
                        {v.min_booking_amount && (
                          <p className="text-[11px] text-zinc-500 font-medium">
                            • Applicable on min. booking value of ₹{v.min_booking_amount.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>

                      {/* Right Action Button */}
                      <div className="shrink-0 flex items-center justify-end sm:justify-center">
                        {isApplied ? (
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(v)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Applied
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyVoucher(v);
                              setIsCouponModalOpen(false);
                            }}
                            className="px-4 py-2 bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white font-bold text-xs rounded-xl border border-zinc-700 hover:border-emerald-500 transition-all cursor-pointer"
                          >
                            Apply Coupon
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Terms & conditions apply to all coupon discounts.</span>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
