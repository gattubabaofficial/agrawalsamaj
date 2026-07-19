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
        <div className="px-6 py-5 bg-zinc-900 text-white flex items-center gap-3">
          <button 
            onClick={() => router.push("/admin/dashboard")}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Verify Event Pass</h1>
            <p className="text-xs text-zinc-400">Scan result verification</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-zinc-500 font-medium">Fetching pass details...</p>
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
              {/* Pass Validity Status Badge */}
              <div className="text-center p-6 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col items-center gap-3">
                {passData.status === "used" ? (
                  <>
                    <XCircle className="w-16 h-16 text-rose-500" />
                    <div>
                      <h2 className="text-lg font-bold text-rose-600 uppercase tracking-wide">INVALID TICKET (ALREADY USED)</h2>
                      <p className="text-xs text-zinc-400 mt-1">Checked in at: {formatDateTime(passData.scanned_at)}</p>
                    </div>
                  </>
                ) : passData.payment_status.toLowerCase() !== "paid" && passData.payment_status.toLowerCase() !== "verified" ? (
                  <>
                    <AlertTriangle className="w-16 h-16 text-amber-500 animate-pulse" />
                    <div>
                      <h2 className="text-lg font-bold text-amber-600 uppercase tracking-wide">PAYMENT PENDING</h2>
                      <p className="text-xs text-zinc-500 mt-1">Collect cash payment before letting user enter.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                    <div>
                      <h2 className="text-lg font-bold text-emerald-600 uppercase tracking-wide">VALID TICKET</h2>
                      <p className="text-xs text-zinc-400 mt-1">Pass is active and ready for check-in.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Event Info Card */}
              <div className="space-y-3.5 border-t border-zinc-100 pt-5">
                <h3 className="font-bold text-zinc-950 text-sm tracking-wide uppercase">Event Details</h3>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{passData.event_title}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDateTime(passData.event_start_datetime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-zinc-200/60 pt-3">
                    <MapPin className="w-5 h-5 text-zinc-400" />
                    <p className="text-xs text-zinc-600 font-medium">{passData.event_venue}</p>
                  </div>
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-3 border-t border-zinc-100 pt-5">
                <h3 className="font-bold text-zinc-950 text-sm tracking-wide uppercase">Guest Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Name</p>
                      <p className="text-xs font-semibold text-zinc-800">{passData.guest_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Phone</p>
                      <p className="text-xs font-semibold text-zinc-800">{passData.guest_phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3 border-t border-zinc-100 pt-5">
                <h3 className="font-bold text-zinc-950 text-sm tracking-wide uppercase">Payment Info</h3>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Payment Status</p>
                    <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full mt-1 border ${
                      passData.payment_status.toLowerCase() === 'paid' || passData.payment_status.toLowerCase() === 'verified'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {passData.payment_status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Payment Mode</p>
                    <p className="text-xs font-bold text-zinc-800 mt-1.5 uppercase">
                      {passData.payment_mode ? passData.payment_mode.replace("_", " ") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-zinc-100 pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/admin/dashboard")}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
                {passData.status !== "used" && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Check-In
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
