"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Settings, Plus, Calendar, Trash2, X, Lock, CheckCircle2, ShieldAlert,
  ArrowLeft, Edit, Eye, AlertTriangle, Check, Globe, EyeOff, Layers, Zap,
  PartyPopper, Tag, Filter
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface RuleProfile {
  id: string;
  name: string;
  category: string;
  description?: string;
  config: any;
  is_template: boolean;
  is_public_visible?: boolean;
  status?: string;
}

interface RuleAssignment {
  id: string;
  profile_id?: string;
  label: string;
  applied_at: string;
  dates: { id: string; date: string }[];
}

interface AccommodationType {
  id: string;
  name: string;
  kind: string;
  base_price_per_night: number;
}

interface BhavanPurposeItem {
  id: string;
  name: string;
  is_active: boolean;
}

interface DateRangeState {
  start: string;
  end: string;
}

export default function AdminRulesPage() {
  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [assignments, setAssignments] = useState<RuleAssignment[]>([]);
  const [accTypes, setAccTypes] = useState<AccommodationType[]>([]);
  const [purposes, setPurposes] = useState<BhavanPurposeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states: Create / Edit Profile
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [isClosure, setIsClosure] = useState(false);
  const [isPublicVisible, setIsPublicVisible] = useState(true);
  const [globalMode, setGlobalMode] = useState("increase_percent");
  const [globalValue, setGlobalValue] = useState(20);
  const [conflictBehaviour, setConflictBehaviour] = useState("continue"); // "continue" vs "override"

  // Per-type room restrictions & pricing
  const [typeConfig, setTypeConfig] = useState<{ [id: string]: { allowed: boolean; price: number } }>({});

  // Event Purpose Restrictions (Allowed vs Blocked)
  const [purposeConfig, setPurposeConfig] = useState<{ [id: string]: boolean }>({});

  // View Details Modal
  const [viewingProfile, setViewingProfile] = useState<RuleProfile | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<RuleAssignment | null>(null);

  // Delete Confirm Modal
  const [deletingProfile, setDeletingProfile] = useState<RuleProfile | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<RuleAssignment | null>(null);

  // Modal: Assign Rule to Dates
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [assignLabel, setAssignLabel] = useState("");
  const [dateRanges, setDateRanges] = useState<DateRangeState[]>([
    { start: "2026-09-01", end: "2026-10-01" },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const pRes = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pRes.ok) setProfiles(await pRes.json());

      const aRes = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (aRes.ok) setAssignments(await aRes.json());

      const tRes = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const typesData = await tRes.json();
        setAccTypes(typesData);
        const initTypeCfg: any = {};
        typesData.forEach((t: AccommodationType) => {
          initTypeCfg[t.id] = { allowed: true, price: t.base_price_per_night };
        });
        setTypeConfig(initTypeCfg);
      }

      const purpRes = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/purposes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (purpRes.ok) {
        const purpData = await purpRes.json();
        setPurposes(purpData);
        const initPurpCfg: any = {};
        purpData.forEach((p: BhavanPurposeItem) => {
          initPurpCfg[p.id] = true; // All allowed by default
        });
        setPurposeConfig(initPurpCfg);
      }
    } catch (err) {
      console.error("Fetch rules error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProfileId(null);
    setName("");
    setCategory("custom");
    setIsClosure(false);
    setIsPublicVisible(true);
    setGlobalMode("increase_percent");
    setGlobalValue(20);
    setConflictBehaviour("continue");

    const initTypeCfg: any = {};
    accTypes.forEach((t) => {
      initTypeCfg[t.id] = { allowed: true, price: t.base_price_per_night };
    });
    setTypeConfig(initTypeCfg);

    const initPurpCfg: any = {};
    purposes.forEach((p) => {
      initPurpCfg[p.id] = true;
    });
    setPurposeConfig(initPurpCfg);

    setShowProfileModal(true);
  };

  const openEditModal = (p: RuleProfile) => {
    setEditingProfileId(p.id);
    setName(p.name);
    setCategory(p.category || "custom");
    setIsClosure(p.config?.availability?.closed === true);
    setIsPublicVisible(p.is_public_visible !== false);
    setGlobalMode(p.config?.pricing?.mode || "increase_percent");
    setGlobalValue(p.config?.pricing?.value ?? 20);
    setConflictBehaviour(p.config?.pricing?.conflict_behaviour || "continue");

    // Reconstruct Room Type Config
    const existingAccBlocking = p.config?.availability?.accommodation || {};
    const existingPerType = p.config?.pricing?.per_type || {};

    const updatedTypeCfg: any = {};
    accTypes.forEach((t) => {
      const allowed = existingAccBlocking[t.id] !== "blocked";
      const customPrice = existingPerType[t.id]?.value ?? t.base_price_per_night;
      updatedTypeCfg[t.id] = { allowed, price: customPrice };
    });
    setTypeConfig(updatedTypeCfg);

    // Reconstruct Purpose Restrictions Config
    const purpCfg = p.config?.purposes;
    const updatedPurpCfg: any = {};
    purposes.forEach((purp) => {
      if (!purpCfg) {
        updatedPurpCfg[purp.id] = true;
      } else {
        const allowedList = purpCfg.allowed || [];
        const blockedList = purpCfg.blocked || [];
        if (blockedList.length > 0) {
          updatedPurpCfg[purp.id] = !blockedList.includes(purp.id);
        } else if (allowedList.length > 0) {
          updatedPurpCfg[purp.id] = allowedList.includes(purp.id);
        } else {
          updatedPurpCfg[purp.id] = purpCfg.default !== "blocked";
        }
      }
    });
    setPurposeConfig(updatedPurpCfg);

    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!name) return;
    const token = localStorage.getItem("token");

    // 1. Room type blocking & per-type pricing
    const accBlockingMap: { [id: string]: string } = {};
    const perTypePricingMap: { [id: string]: { mode: string; value: number } } = {};

    Object.entries(typeConfig).forEach(([tid, cfg]) => {
      accBlockingMap[tid] = cfg.allowed ? "allowed" : "blocked";
      if (cfg.price > 0) {
        perTypePricingMap[tid] = { mode: "fixed", value: cfg.price };
      }
    });

    // 2. Event Purpose Applicability (Allowed vs Blocked)
    const allowedPurposeIds = Object.entries(purposeConfig)
      .filter(([_, allowed]) => allowed)
      .map(([pid]) => pid);

    const blockedPurposeIds = Object.entries(purposeConfig)
      .filter(([_, allowed]) => !allowed)
      .map(([pid]) => pid);

    // Only include purposes restriction when at least one purpose is blocked
    // Store as default="blocked" with explicit allowed list — cleaner for the rule engine
    const purposesConfig = blockedPurposeIds.length > 0
      ? {
          default: "blocked" as const,
          allowed: allowedPurposeIds,
          blocked: blockedPurposeIds,
        }
      : undefined;


    const ruleConfig: any = {
      availability: {
        closed: isClosure,
        accommodation: accBlockingMap,
      },
      pricing: {
        mode: "none",
        value: 0,
        per_type: perTypePricingMap,
        conflict_behaviour: conflictBehaviour,
      },
      public_message: isClosure ? "The Bhavan is unavailable for the selected dates." : null,
    };

    if (purposesConfig) {
      ruleConfig.purposes = purposesConfig;
    }

    const isEdit = !!editingProfileId;
    const url = isEdit
      ? `${getApiBaseUrl()}/admin/bhavan/rule-profiles/${editingProfileId}`
      : `${getApiBaseUrl()}/admin/bhavan/rule-profiles`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await safeFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          category: isClosure ? "closure" : category,
          config: ruleConfig,
          is_public_visible: isPublicVisible,
        }),
      });

      if (res.ok) {
        setShowProfileModal(false);
        setEditingProfileId(null);
        setName("");
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to save rule profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
    }
  };

  const handleDeleteProfile = async () => {
    if (!deletingProfile) return;
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-profiles/${deletingProfile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeletingProfile(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to delete rule profile");
      }
    } catch (err) {
      console.error("Delete profile error:", err);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    const token = localStorage.getItem("token");
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-assignments/${deletingAssignment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeletingAssignment(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to delete assignment");
      }
    } catch (err) {
      console.error("Delete assignment error:", err);
    }
  };

  const addDateRangeRow = () => {
    setDateRanges([...dateRanges, { start: "", end: "" }]);
  };

  const removeDateRangeRow = (idx: number) => {
    setDateRanges(dateRanges.filter((_, i) => i !== idx));
  };

  const updateDateRange = (idx: number, field: "start" | "end", val: string) => {
    const updated = [...dateRanges];
    updated[idx][field] = val;
    setDateRanges(updated);
  };

  const handleAssignRule = async () => {
    if (!selectedProfileId || !assignLabel || dateRanges.length === 0) return;
    const token = localStorage.getItem("token");

    const validRanges = dateRanges.filter((r) => r.start && r.end && r.end >= r.start);

    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile_id: selectedProfileId,
          label: assignLabel,
          date_ranges: validRanges,
        }),
      });

      if (res.ok) {
        setShowAssignModal(false);
        setAssignLabel("");
        fetchData();
      }
    } catch (err) {
      console.error("Assign rule error:", err);
    }
  };

  const getProfileAssignmentCount = (profileId: string) => {
    return assignments.filter((a) => a.profile_id === profileId).length;
  };

  const getBlockedPurposeNames = (p: RuleProfile) => {
    const blockedList = p.config?.purposes?.blocked || [];
    if (!blockedList || blockedList.length === 0) return [];
    return purposes.filter((purp) => blockedList.includes(purp.id)).map((purp) => purp.name);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/bhavan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Bhavan Overview
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Bhavan Rule Engine & Selective Event Rules</h1>
          <p className="text-xs text-zinc-500">Configure event purpose restrictions (e.g. Wedding-only dates), public/internal visibility, and default all-date rules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-400"
        >
          <Plus className="w-4 h-4" /> Create Rule Profile
        </button>
      </div>

      {/* Section 1: Rule Profiles */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">1. Reusable Rule Profiles</h2>
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border">Loading rule profiles...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border border-zinc-200">No rule profiles created yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((p) => {
              const assignCount = getProfileAssignmentCount(p.id);
              const appliesToAllDates = assignCount === 0;
              const isPublic = p.is_public_visible !== false;
              const blockedPurpNames = getBlockedPurposeNames(p);

              return (
                <div key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-sm flex flex-col justify-between hover:border-zinc-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                          {p.category}
                        </span>

                        {/* Public vs Internal Badge */}
                        {isPublic ? (
                          <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Internal Only
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingProfile(p)}
                          title="View Details"
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Rule Profile"
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProfile(p)}
                          title="Delete Rule Profile"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-zinc-900 text-base">{p.name}</h3>

                    {/* Date Applicability Badge */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {appliesToAllDates ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" /> Applies to ALL Dates
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" /> {assignCount} Date Set(s) Assigned
                        </span>
                      )}
                    </div>

                    {/* Blocked Events Warning Badge if any */}
                    {blockedPurpNames.length > 0 && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-800 space-y-0.5">
                        <p className="font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Blocked Event Purposes:
                        </p>
                        <p className="text-[10px] text-rose-600 font-medium">
                          {blockedPurpNames.join(", ")}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 font-mono mt-2">
                      {p.config?.availability?.closed
                        ? "CLOSED (Entire Bhavan Blocked)"
                        : `Pricing: ${p.config?.pricing?.mode || "standard"} (${p.config?.pricing?.conflict_behaviour === "override" ? "Override Mode" : "Stacking Mode"})`}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                    <button
                      onClick={() => setViewingProfile(p)}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => { setSelectedProfileId(p.id); setAssignLabel(p.name + " Dates"); setShowAssignModal(true); }}
                      className="text-xs font-bold text-amber-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Assign Dates
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Active Multi-Date Assignments */}
      <div className="space-y-4 pt-4 border-t border-zinc-200">
        <h2 className="text-lg font-bold text-zinc-900">2. Active Multi-Date Assignments</h2>
        {assignments.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-white rounded-xl border">No date assignments created yet. Rules without assigned dates apply automatically to all dates.</div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-zinc-900 text-sm">{a.label}</h4>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      {a.dates?.length || 0} date(s) assigned
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Applied: {new Date(a.applied_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingAssignment(a)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Dates
                  </button>
                  <button
                    onClick={() => setDeletingAssignment(a)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: View Rule Profile Details */}
      {viewingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 mb-1 inline-block">
                  {viewingProfile.category}
                </span>
                <h3 className="text-xl font-bold text-zinc-900">{viewingProfile.name}</h3>
              </div>
              <button onClick={() => setViewingProfile(null)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Website Visibility</span>
                <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                  viewingProfile.is_public_visible !== false ? "text-emerald-600" : "text-zinc-600"
                }`}>
                  {viewingProfile.is_public_visible !== false ? <><Globe className="w-3.5 h-3.5" /> Publicly Visible</> : <><EyeOff className="w-3.5 h-3.5" /> Internal Admin Only</>}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Date Applicability</span>
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                  {getProfileAssignmentCount(viewingProfile.id) === 0 ? (
                    <><Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Applies to ALL Dates</>
                  ) : (
                    <><Calendar className="w-3.5 h-3.5" /> {getProfileAssignmentCount(viewingProfile.id)} Date Set(s)</>
                  )}
                </span>
              </div>
            </div>

            {/* Bhavan Closure Notice */}
            {viewingProfile.config?.availability?.closed ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Full Bhavan Closure / Maintenance
                </p>
                <p className="text-[11px] text-rose-700 leading-tight">
                  The entire Bhavan facility is blocked for booking during these rule dates.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Pricing Strategy */}
                <div className="p-3.5 rounded-xl border border-zinc-200 bg-amber-50/30 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" /> Pricing Strategy & Adjustment
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold">Adjustment Mode:</span>
                      <span className="font-bold text-zinc-900 capitalize">
                        {(viewingProfile.config?.pricing?.mode || "standard").replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-semibold">Value:</span>
                      <span className="font-extrabold text-amber-700">
                        {viewingProfile.config?.pricing?.value ? `${viewingProfile.config.pricing.value}% / ₹${viewingProfile.config.pricing.value}` : "Base Rates"}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-amber-100">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Priority Stacking Policy:</span>
                      <span className="font-semibold text-zinc-700">
                        {viewingProfile.config?.pricing?.conflict_behaviour === "override"
                          ? "⚡ Override Mode (Resets previous rules to base rates)"
                          : "🔗 Stacking Mode (Applies on top of previous rules)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Room Type Restrictions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-600" /> Accommodation Room Restrictions
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {accTypes.map((t) => {
                      const accConfig = viewingProfile.config?.availability?.accommodation || {};
                      const perTypePrices = viewingProfile.config?.pricing?.per_type || {};

                      const isBlocked = accConfig[t.id] === "blocked";
                      const customPrice = perTypePrices[t.id]?.value;

                      return (
                        <div key={t.id} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isBlocked ? "bg-rose-50/50 border-rose-200 text-rose-900" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                        }`}>
                          <span className="font-bold">{t.name}</span>
                          <div className="flex items-center gap-2">
                            {customPrice !== undefined && !isBlocked && (
                              <span className="text-[11px] font-extrabold text-amber-600">
                                ₹{customPrice} / night
                              </span>
                            )}
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              isBlocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {isBlocked ? "Disabled (Blocked)" : "Allowed"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Event Purpose Restrictions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <PartyPopper className="w-3.5 h-3.5 text-amber-600" /> Event Purpose Applicability
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {purposes.map((purp) => {
                      const blockedList = viewingProfile.config?.purposes?.blocked || [];
                      const allowedList = viewingProfile.config?.purposes?.allowed || [];
                      let isAllowed = true;
                      if (blockedList.length > 0) {
                        isAllowed = !blockedList.includes(purp.id);
                      } else if (allowedList.length > 0) {
                        isAllowed = allowedList.includes(purp.id);
                      }

                      return (
                        <span key={purp.id} className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                          isAllowed
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          {isAllowed ? "✓" : "🚫"} {purp.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Public Message if present */}
            {viewingProfile.config?.public_message && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Public Message Notice</span>
                <p className="text-amber-900 font-medium italic mt-0.5">"{viewingProfile.config.public_message}"</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button onClick={() => setViewingProfile(null)} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs shadow-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal: View Assignment Dates */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">Assigned Dates</h3>
              <button onClick={() => setViewingAssignment(null)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            <h4 className="font-bold text-sm text-zinc-900">{viewingAssignment.label}</h4>
            <div className="max-h-60 overflow-y-auto space-y-1 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              {viewingAssignment.dates?.map((d) => (
                <p key={d.id || d.date} className="text-xs font-mono text-zinc-700 bg-white px-2.5 py-1 rounded border border-zinc-100">
                  📅 {d.date}
                </p>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingAssignment(null)} className="px-4 py-2 bg-zinc-100 font-bold rounded-lg text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Profile */}
      {deletingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Rule Profile?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to delete <strong className="text-zinc-800">{deletingProfile.name}</strong>? This will also remove any date assignments linked to this rule profile.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setDeletingProfile(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleDeleteProfile} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500">Delete Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Assignment */}
      {deletingAssignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Assignment?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to remove <strong className="text-zinc-800">{deletingAssignment.label}</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setDeletingAssignment(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleDeleteAssignment} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500">Remove Assignment</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Rule Profile */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingProfileId ? "Edit Rule Profile" : "Create Rule Profile"}
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Profile Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wedding Peak Days / Wedding Season" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            {/* Public Visibility Control */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicVisible}
                  onChange={(e) => setIsPublicVisible(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="text-xs font-bold text-zinc-900">Visible Publicly to Users on Website</span>
              </label>
              <p className="text-[11px] text-zinc-500 pl-6 leading-tight">
                When enabled, promotional badges or special rule notices are shown to public users during booking. Uncheck for internal/admin-only rules.
              </p>
            </div>

            {/* Event Purpose Applicability Section (Allowed vs Blocked Events) */}
            <div className="space-y-3 pt-3 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <PartyPopper className="w-4 h-4 text-amber-600" /> Event Purpose Applicability
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const allAllowed: any = {};
                    purposes.forEach(p => allAllowed[p.id] = true);
                    setPurposeConfig(allAllowed);
                  }}
                  className="text-[11px] font-semibold text-amber-600 hover:underline"
                >
                  Allow All Event Types
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Check events that are <strong>ALLOWED</strong> on these rule dates, and uncheck events that are <strong>NOT APPLICABLE / BLOCKED</strong> (e.g. On Wedding Peak Days, check Wedding and uncheck Camps, Social Events, Anniversaries).
              </p>

              <div className="grid grid-cols-2 gap-2">
                {purposes.map((p) => {
                  const isAllowed = purposeConfig[p.id] !== false;
                  return (
                    <label key={p.id} className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isAllowed ? "bg-emerald-50/60 border-emerald-200 text-zinc-900" : "bg-rose-50/60 border-rose-200 text-rose-900"
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={(e) => setPurposeConfig({
                            ...purposeConfig,
                            [p.id]: e.target.checked
                          })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="font-bold">{p.name}</span>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        isAllowed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {isAllowed ? "Allowed" : "Blocked"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Stacking / Conflict Behaviour Policy */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-amber-50/50 space-y-2">
              <label className="block text-xs font-bold uppercase text-amber-900">Rule Priority & Stacking Policy</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-800 font-medium">
                  <input
                    type="radio"
                    name="conflictBehaviour"
                    value="continue"
                    checked={conflictBehaviour === "continue"}
                    onChange={() => setConflictBehaviour("continue")}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span><strong>Continue & Stack</strong> with rules made before this (Adjust prices on top of previous rules)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-800 font-medium">
                  <input
                    type="radio"
                    name="conflictBehaviour"
                    value="override"
                    checked={conflictBehaviour === "override"}
                    onChange={() => setConflictBehaviour("override")}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span><strong>Override & Reset</strong> previous rules (Ignore previous rules and apply this rule fresh)</span>
                </label>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-rose-200 bg-rose-50/50">
              <input
                type="checkbox"
                checked={isClosure}
                onChange={(e) => setIsClosure(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-zinc-300 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-rose-900">Block Entire Bhavan (Maintenance / Full Closure)</span>
            </label>

            {!isClosure && (
              <>
                {/* Selective Room/Type Blocking & Custom Rates */}
                <div className="space-y-3 pt-3 border-t border-zinc-100">

                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Selective Room Blocking & Custom Pricing</h4>
                  <p className="text-[11px] text-zinc-500">Toggle whether a specific room/dormitory type is Allowed or Disabled (Blocked) for this rule, or specify a fixed rate per night.</p>

                  <div className="space-y-2">
                    {accTypes.map((t) => {
                      const cfg = typeConfig[t.id] || { allowed: true, price: t.base_price_per_night };
                      return (
                        <div key={t.id} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-zinc-900 text-xs">{t.name}</p>
                            <p className="text-[10px] text-zinc-400">Base rate: ₹{t.base_price_per_night} / night</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.allowed}
                                onChange={(e) => setTypeConfig({
                                  ...typeConfig,
                                  [t.id]: { ...cfg, allowed: e.target.checked }
                                })}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              <span className={`text-xs font-bold ${cfg.allowed ? "text-emerald-600" : "text-rose-600"}`}>
                                {cfg.allowed ? "Allowed" : "Disabled (Blocked)"}
                              </span>
                            </label>

                            {cfg.allowed && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-zinc-400">Rate: ₹</span>
                                <input
                                  type="number"
                                  value={cfg.price}
                                  onChange={(e) => setTypeConfig({
                                    ...typeConfig,
                                    [t.id]: { ...cfg, price: parseFloat(e.target.value) || 0 }
                                  })}
                                  className="w-20 px-2 py-1 border rounded text-xs bg-white"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setShowProfileModal(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleSaveProfile} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400">
                {editingProfileId ? "Update Profile" : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Rule to Multiple Date Ranges */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">Assign Rule to Multiple Date Ranges</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Date Set Assignment Label *</label>
              <input type="text" value={assignLabel} onChange={(e) => setAssignLabel(e.target.value)} placeholder="e.g. Sept & Oct Booking Dates 2026" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-500 uppercase">Selected Date Ranges</label>
                <button onClick={addDateRangeRow} className="text-xs font-bold text-amber-600 hover:underline inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Another Date Range
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {dateRanges.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-semibold uppercase">Start Date</span>
                        <input
                          type="date"
                          value={r.start}
                          onChange={(e) => updateDateRange(idx, "start", e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs bg-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-semibold uppercase">End Date</span>
                        <input
                          type="date"
                          value={r.end}
                          onChange={(e) => updateDateRange(idx, "end", e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                    {dateRanges.length > 1 && (
                      <button onClick={() => removeDateRangeRow(idx)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
              <button onClick={handleAssignRule} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400">Apply Date Ranges</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
