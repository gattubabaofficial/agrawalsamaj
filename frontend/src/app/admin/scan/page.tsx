"use client";

import { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, Loader2, Calendar, MapPin, Phone, User, Camera, Mail } from "lucide-react";
import { getApiBaseUrl, safeFetch, formatErrorMessage } from "@/utils/api";

export default function AdminScanPage() {
  const [passId, setPassId] = useState("");
  const [passData, setPassData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Camera Scanning State
  const [cameraScanning, setCameraScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState<any>(null);

  const startCamera = async () => {
    setError(null);
    setCameraScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      setTimeout(() => {
        const html5QrCode = new Html5Qrcode("reader");
        setScannerInstance(html5QrCode);

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
            const match = decodedText.match(uuidRegex);
            const resolvedId = match ? match[0] : decodedText.trim();
            setPassId(resolvedId);

            html5QrCode.stop().then(() => {
              setCameraScanning(false);
              setScannerInstance(null);
              triggerLookup(resolvedId);
            }).catch(() => {
              setCameraScanning(false);
              setScannerInstance(null);
              triggerLookup(resolvedId);
            });
          },
          () => {}
        ).catch(() => {
          setError("Failed to access camera. Please verify camera permissions are granted.");
          setCameraScanning(false);
        });
      }, 200);
    } catch {
      setError("Error initializing scanner.");
      setCameraScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerInstance) {
      try {
        await scannerInstance.stop();
      } catch (err) {
        console.error(err);
      }
    }
    setCameraScanning(false);
    setScannerInstance(null);
  };

  const triggerLookup = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setPassData(null);
    setSuccessMsg(null);

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/passes/${id.trim()}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setPassData(data);
      } else {
        setError(formatErrorMessage(data?.detail, "Pass not found. Please verify the Pass ID is correct."));
      }
    } catch (err: any) {
      setError(formatErrorMessage(err, "Pass not found. Please verify the Pass ID is correct."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passId.trim()) return;
    triggerLookup(passId);
  };

  const handleCheckIn = async () => {
    const token = localStorage.getItem("token");
    if (!token || !passData) return;

    setCheckingIn(true);
    setSuccessMsg(null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/passes/admin/${passData.pass_id}/check-in`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Pass successfully checked in!");
        const refreshRes = await safeFetch(`${getApiBaseUrl()}/passes/${passData.pass_id}`, { headers });
        if (refreshRes.ok) {
          setPassData(await refreshRes.json());
        }
      } else {
        alert(formatErrorMessage(data?.detail, "Check-in failed."));
      }
    } catch {
      alert("Check-in failed.");
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Inject custom laser animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanner-laser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scanner-laser {
          animation: scanner-laser 3s infinite linear;
        }
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}} />

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Event Pass Check-In</h1>
        <p className="text-sm text-zinc-500 mt-1">Verify tickets and confirm entry for samaj events</p>
      </div>

      {/* Camera Scanning Viewport */}
      {cameraScanning && (
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center gap-5">
          <div className="text-center">
            <h3 className="font-bold text-zinc-900 text-sm">Scan Pass QR Code</h3>
            <p className="text-xs text-zinc-500 mt-1">Align the QR code inside the target boundary box</p>
          </div>
          <div className="relative w-full max-w-sm aspect-square bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-700 shadow-inner flex items-center justify-center">
            <div id="reader" className="w-full h-full"></div>
            
            {/* Viewfinder Overlay Box */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-dashed border-amber-500 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Pulsating/Laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent top-0 animate-scanner-laser"></div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={stopCamera}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            Cancel Camera Scan
          </button>
        </div>
      )}

      {/* Lookup Form */}
      <form onSubmit={handleLookup} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Enter Pass ID</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              required
              placeholder="e.g. 4ced02f3-6d90-42be-aada-9c920718f3ea"
              value={passId}
              onChange={(e) => setPassId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button
            type="button"
            onClick={cameraScanning ? stopCamera : startCamera}
            className="flex-1 sm:flex-none px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Camera className="w-4.5 h-4.5" />
            Scan QR
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-none px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Lookup Pass
          </button>
        </div>
      </form>

      {/* Success notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Details Section */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm text-zinc-500 font-medium">Loading pass details...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-center space-y-3">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <div>
            <h3 className="font-bold text-zinc-900 text-base">Lookup Failed</h3>
            <p className="text-sm text-zinc-500 mt-1">{error}</p>
          </div>
        </div>
      ) : passData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-scale-up">
          {/* Status and Actions Card */}
          <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wide">Ticket Status</h3>
              
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col items-center gap-3 text-center">
                {passData.status === "used" ? (
                  <>
                    <XCircle className="w-12 h-12 text-rose-500" />
                    <div>
                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Used / Checked In
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-2">
                        Checked In:<br />
                        {formatDateTime(passData.scanned_at)}
                      </p>
                    </div>
                  </>
                ) : (passData.payment_status.toLowerCase() !== "paid" && passData.payment_status.toLowerCase() !== "verified" && passData.payment_status.toLowerCase() !== "not_applicable") ? (
                  <>
                    <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
                    <div>
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Payment Pending
                      </span>
                      <p className="text-[11px] text-zinc-500 mt-2">
                        Please collect cash payment of ticket price at the venue entrance.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Valid & Active
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-2">
                        Pass is active and ready for check-in.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {passData.status !== "used" && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Check-In
              </button>
            )}
          </div>

          {/* Details Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wide">Pass Specifications</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Event Info */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Event Name</p>
                <div className="flex gap-2">
                  <Calendar className="w-4.5 h-4.5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-800">{passData.event_title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {formatDateTime(passData.event_start_datetime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Venue */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Venue</p>
                <div className="flex gap-2">
                  <MapPin className="w-4.5 h-4.5 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-700">{passData.event_venue}</p>
                </div>
              </div>

              {/* Attendee / Pass Name */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Pass Attendee Name</p>
                <div className="flex gap-2">
                  <User className="w-4.5 h-4.5 text-zinc-400" />
                  <p className="text-xs font-bold text-zinc-800">{passData.guest_name}</p>
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Booked By (Primary Contact)</p>
                <div className="flex gap-2">
                  <User className="w-4.5 h-4.5 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-700">{passData.primary_contact_name}</p>
                </div>
              </div>

              {/* Guest Phone */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">WhatsApp Phone</p>
                <div className="flex gap-2">
                  <Phone className="w-4.5 h-4.5 text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-800">{passData.guest_phone}</p>
                </div>
              </div>

              {/* Guest Email */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Email Address</p>
                <div className="flex gap-2">
                  <Mail className="w-4.5 h-4.5 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-700">{passData.guest_email}</p>
                </div>
              </div>

              {/* Samaj ID */}
              {passData.samaj_id && (
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Samaj ID</p>
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
                    {passData.samaj_id}
                  </p>
                </div>
              )}

              {/* Payment Mode */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Payment Mode &amp; Status</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-800 uppercase">
                    {passData.payment_mode ? passData.payment_mode.replace("_", " ") : "FREE"}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    passData.payment_status === 'verified' || passData.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    passData.payment_status === 'not_applicable' ? 'bg-zinc-100 text-zinc-700 border border-zinc-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {passData.payment_status}
                  </span>
                </div>
              </div>

              {/* Pass ID */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Pass Ticket ID</p>
                <p className="text-xs font-mono text-zinc-600 select-all">
                  {passData.pass_id}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50 p-12 rounded-3xl border border-zinc-200 text-center text-zinc-400">
          <Search className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
          <p className="text-sm">Please input or paste a Pass ID, or scan the QR code using your camera</p>
        </div>
      )}
    </div>
  );
}
