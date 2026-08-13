"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2, Calendar, MapPin, Phone, User, DollarSign } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function VerifyPassPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const passId = params.passId as string;
  
  const [passData, setPassData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole")?.toUpperCase();

    if (!token || (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "VOLUNTEER")) {
      // Redirect to admin login with redirect parameter
      const redirectUrl = encodeURIComponent(`/verify-pass/${passId}`);
      router.push(`/admin-login?redirect=${redirectUrl}`);
      return;
    }

    setIsAdmin(true);
    fetchPassDetails(token);
  }, [passId, router]);

  const fetchPassDetails = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/passes/${passId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPassData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to retrieve pass details. Please verify the Pass ID is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setCheckingIn(true);
    try {
      await axios.post(`${getApiBaseUrl()}/passes/admin/${passId}/check-in`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh details
      await fetchPassDetails(token);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };

  // Helper to format Date and Time
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-zinc-600 font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-6 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/admin/dashboard")}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200">Agrawal Samaj Mansrovar Jaipur</p>
              <h1 className="font-bold text-lg leading-tight">Official Event Entry Ticket</h1>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-lg shadow-sm">
            🎟️
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-zinc-500 font-medium">Loading ticket details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-4">
              <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 text-lg">Verification Failed</h3>
                <p className="text-sm text-zinc-500 px-4">{error}</p>
              </div>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ticket Banner / Gate Notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  🎟️ Gate Entry Notice
                </p>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  This is your official ticket for <strong className="font-bold text-zinc-900">{passData.event_title}</strong>. It will be scanned at the gate for entry verification.
                </p>
              </div>

              {/* Pass Validity Status Badge */}
              <div className="text-center p-5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col items-center gap-3">
                {passData.status === "used" ? (
                  <>
                    <XCircle className="w-14 h-14 text-rose-500" />
                    <div>
                      <h2 className="text-base font-bold text-rose-600 uppercase tracking-wide">ENTRY COMPLETED (ALREADY CHECKED IN)</h2>
                      <p className="text-xs text-zinc-500 mt-1">Scanned at gate on: {formatDateTime(passData.scanned_at)}</p>
                    </div>
                  </>
                ) : passData.payment_mode === "pay_at_venue" && passData.payment_status.toLowerCase() !== "paid" && passData.payment_status.toLowerCase() !== "verified" ? (
                  <>
                    <AlertTriangle className="w-14 h-14 text-amber-500" />
                    <div>
                      <h2 className="text-base font-bold text-amber-700 uppercase tracking-wide">CASH ENTRY TICKET (PAY AT DESK)</h2>
                      <p className="text-xs text-zinc-600 mt-1">Please verify ticket at entry desk upon cash payment.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                    <div>
                      <h2 className="text-base font-bold text-emerald-700 uppercase tracking-wide">VALID EVENT TICKET</h2>
                      <p className="text-xs text-zinc-500 mt-1">Pass is active and ready for gate scanner verification.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Event Details Card */}
              <div className="space-y-3 border-t border-zinc-100 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-zinc-950 text-sm tracking-wide uppercase">Event Details</h3>
                  {passData.event_category && (
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                      {passData.event_category}
                    </span>
                  )}
                </div>
                
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{passData.event_title}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        📅 {formatDateTime(passData.event_start_datetime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-zinc-200/60 pt-3">
                    <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-zinc-700 font-medium">
                      📍 {passData.event_venue} {passData.event_address ? `(${passData.event_address})` : ""}
                    </p>
                  </div>
                  {passData.event_description && (
                    <div className="border-t border-zinc-200/60 pt-3 text-xs text-zinc-600 leading-relaxed">
                      <p className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider mb-1">About Event:</p>
                      <p className="line-clamp-3">{passData.event_description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Holder Details */}
              <div className="space-y-3 border-t border-zinc-100 pt-5">
                <h3 className="font-bold text-zinc-950 text-sm tracking-wide uppercase">Attendee Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Attendee Name</p>
                      <p className="text-xs font-bold text-zinc-900">{passData.guest_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">WhatsApp Phone</p>
                      <p className="text-xs font-semibold text-zinc-800">{passData.guest_phone}</p>
                    </div>
                  </div>
                  {passData.samaj_id && (
                    <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-zinc-200/60">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Samaj Member ID:</span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        {passData.samaj_id}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 flex items-center justify-between pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                    <span>Issued By: Agrawal Samaj Mansrovar</span>
                    <span className="font-mono text-[10px] select-all">Ticket ID: {passData.pass_id?.slice(0, 13)}...</span>
                  </div>
                </div>
              </div>

              {/* Actions for Volunteers / Admins */}
              <div className="border-t border-zinc-100 pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/admin/dashboard")}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Back to Dashboard
                </button>
                {passData.status !== "used" && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Gate Entry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
