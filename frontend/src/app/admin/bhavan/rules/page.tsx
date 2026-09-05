"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  Settings, Plus, Calendar, Trash2, X, Lock, CheckCircle2, ShieldAlert,
  ArrowLeft, Edit, Eye, AlertTriangle, Check, Globe, Layers, Zap,
  PartyPopper, Tag, Filter, Search, Loader2, Sparkles, Wrench, Gift, Percent
} from "lucide-react";
import { getApiBaseUrl, safeFetch } from "@/utils/api";

interface RuleProfile {
  id: string;
  name: string;
  category: string; // "wedding" | "closure"
  description?: string;
  config: any;
  is_template: boolean;
  is_public_visible?: boolean;
  status?: string;
  assigned_dates?: string[];
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
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  sort_order: number;
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

export default function AdminRulesAndVouchersPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "vouchers">("rules");
  const [profiles, setProfiles] = useState<RuleProfile[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accTypes, setAccTypes] = useState<AccommodationType[]>([]);
  const [purposes, setPurposes] = useState<BhavanPurposeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Rule Modal state
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleCategory, setRuleCategory] = useState<"wedding" | "closure">("wedding");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleDateRanges, setRuleDateRanges] = useState<{ start: string; end: string }[]>([
    { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }
  ]);
  const [blockedVoucherIds, setBlockedVoucherIds] = useState<string[]>([]);
  const [closureNotice, setClosureNotice] = useState("Bhavan is temporarily closed for maintenance.");
  const [typeConfig, setTypeConfig] = useState<{ [id: string]: { allowed: boolean; price: number } }>({});
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  // Voucher Modal state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDescription, setVoucherDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState<number | string>(10);
  const [minBookingAmount, setMinBookingAmount] = useState<number | string>("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | string>("");
  const [isVoucherActive, setIsVoucherActive] = useState(true);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // View / Delete Modals
  const [viewingProfile, setViewingProfile] = useState<RuleProfile | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<RuleProfile | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const [pRes, vRes, tRes, purpRes] = await Promise.all([
        safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-profiles`, { headers }),
        safeFetch(`${getApiBaseUrl()}/admin/bhavan/vouchers`, { headers }),
        safeFetch(`${getApiBaseUrl()}/admin/bhavan/accommodation-types`, { headers }),
        safeFetch(`${getApiBaseUrl()}/admin/bhavan/purposes`, { headers }),
      ]);

      if (pRes.ok) setProfiles(await pRes.json());
      if (vRes.ok) setVouchers(await vRes.json());
      if (tRes.ok) {
        const types = await tRes.json();
        setAccTypes(types);
        const initCfg: any = {};
        types.forEach((t: AccommodationType) => {
          initCfg[t.id] = { allowed: true, price: t.base_price_per_night };
        });
        setTypeConfig(initCfg);
      }
      if (purpRes.ok) setPurposes(await purpRes.json());
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Rules
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [profiles, searchQuery]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.code.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    });
  }, [vouchers, searchQuery]);

  // Helper: Date range management
  const handleAddDateRange = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRuleDateRanges((prev) => [...prev, { start: today, end: today }]);
  };

  const handleRemoveDateRange = (index: number) => {
    if (ruleDateRanges.length <= 1) {
      const today = new Date().toISOString().slice(0, 10);
      setRuleDateRanges([{ start: today, end: today }]);
      return;
    }
    setRuleDateRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDateRangeChange = (index: number, field: "start" | "end", value: string) => {
    setRuleDateRanges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Helper: Toggle blocked voucher
  const handleToggleBlockedVoucher = (vId: string) => {
    setBlockedVoucherIds((prev) =>
      prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId]
    );
  };

  // Handle Open Create Rule
  const handleOpenCreateRule = (category: "wedding" | "closure" = "wedding") => {
    setEditingProfileId(null);
    setRuleName(category === "wedding" ? "Wedding Peak Dates" : "Maintenance Closure");
    setRuleCategory(category);
    setRuleDescription("");
    const today = new Date().toISOString().slice(0, 10);
    setRuleDateRanges([{ start: today, end: today }]);
    setBlockedVoucherIds([]);
    setClosureNotice("Bhavan is temporarily closed for maintenance on these dates.");

    const initCfg: any = {};
    accTypes.forEach((t) => {
      initCfg[t.id] = { allowed: category !== "closure", price: t.base_price_per_night };
    });
    setTypeConfig(initCfg);

    setRuleError(null);
    setShowRuleModal(true);
  };

  // Handle Open Edit Rule
  const handleOpenEditRule = (p: RuleProfile) => {
    setViewingProfile(null);
    setEditingProfileId(p.id);
    setRuleName(p.name);
    setRuleCategory((p.category as any) || "wedding");
    setRuleDescription(p.description || "");

    const dates = p.assigned_dates || [];
    if (dates.length > 0) {
      // Create date ranges from contiguous dates
      const ranges: { start: string; end: string }[] = [];
      let rangeStart = dates[0];
      let prevDate = new Date(dates[0]);

      for (let i = 1; i < dates.length; i++) {
        const currDate = new Date(dates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 1) {
          ranges.push({ start: rangeStart, end: dates[i - 1] });
          rangeStart = dates[i];
        }
        prevDate = currDate;
      }
      ranges.push({ start: rangeStart, end: dates[dates.length - 1] });
      setRuleDateRanges(ranges);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setRuleDateRanges([{ start: today, end: today }]);
    }

    setBlockedVoucherIds(p.config?.blocked_vouchers || []);
    setClosureNotice(p.config?.block_reason || "Bhavan is temporarily closed for maintenance on these dates.");

    const initCfg: any = {};
    accTypes.forEach((t) => {
      const tCfg = p.config?.accommodations?.[t.id];
      const availCfg = p.config?.availability?.accommodation?.[t.id];
      const isAllowed = availCfg !== undefined ? availCfg === "allowed" : (tCfg ? tCfg.allowed !== false : true);
      initCfg[t.id] = {
        allowed: isAllowed,
        price: tCfg?.price ?? t.base_price_per_night,
      };
    });
    setTypeConfig(initCfg);

    setRuleError(null);
    setShowRuleModal(true);
  };

  // Save Rule Profile + Dates
  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      setRuleError("Please provide a rule name.");
      return;
    }

    const validDateRanges: { start: string; end: string }[] = [];
    for (let i = 0; i < ruleDateRanges.length; i++) {
      const { start, end } = ruleDateRanges[i];
      if (!start || !end) {
        setRuleError(`Please specify both start and end dates for Date Range #${i + 1}.`);
        return;
      }
      if (end < start) {
        setRuleError(`Date Range #${i + 1}: End date must be on or after Start date.`);
        return;
      }
      validDateRanges.push({ start, end });
    }

    if (validDateRanges.length === 0) {
      setRuleError("Please provide at least one valid date range.");
      return;
    }

    setIsSavingRule(true);
    setRuleError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const config: any = {
      is_closure: ruleCategory === "closure",
      block_reason: ruleCategory === "closure" ? closureNotice : null,
      availability: {
        closed: ruleCategory === "closure",
        accommodation: {},
      },
      accommodations: {},
      blocked_vouchers: blockedVoucherIds,
      pricing: {
        per_type: {},
      },
    };

    if (ruleCategory === "wedding") {
      accTypes.forEach((t) => {
        const isAllowed = typeConfig[t.id]?.allowed !== false;
        const rate = parseFloat(typeConfig[t.id]?.price as any) || t.base_price_per_night;
        config.availability.accommodation[t.id] = isAllowed ? "allowed" : "blocked";
        config.accommodations[t.id] = { allowed: isAllowed, price: rate };
        config.pricing.per_type[t.id] = { mode: "fixed", value: rate };
      });
    } else {
      // Closure blocks all accommodations
      accTypes.forEach((t) => {
        config.availability.accommodation[t.id] = "blocked";
        config.accommodations[t.id] = { allowed: false, price: 0 };
        config.pricing.per_type[t.id] = { mode: "fixed", value: 0 };
      });
    }

    const payload = {
      name: ruleName.trim(),
      category: ruleCategory,
      description: ruleDescription.trim() || null,
      config,
      is_public_visible: true,
      date_ranges: validDateRanges,
    };

    try {
      const url = editingProfileId
        ? `${getApiBaseUrl()}/admin/bhavan/rule-profiles/${editingProfileId}`
        : `${getApiBaseUrl()}/admin/bhavan/rule-profiles`;
      const method = editingProfileId ? "PUT" : "POST";

      const res = await safeFetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowRuleModal(false);
        setEditingProfileId(null);
        await fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setRuleError(errData.detail || "Failed to save rule.");
      }
    } catch (err) {
      setRuleError("Network error occurred while saving rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  // Open Create Voucher
  const handleOpenCreateVoucher = () => {
    setEditingVoucherId(null);
    setVoucherCode("");
    setVoucherTitle("");
    setVoucherDescription("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMinBookingAmount("");
    setMaxDiscountAmount("");
    setIsVoucherActive(true);
    setVoucherError(null);
    setShowVoucherModal(true);
  };

  // Open Edit Voucher
  const handleOpenEditVoucher = (v: Voucher) => {
    setViewingVoucher(null);
    setEditingVoucherId(v.id);
    setVoucherCode(v.code);
    setVoucherTitle(v.title);
    setVoucherDescription(v.description || "");
    setDiscountType((v.discount_type as any) || "percentage");
    setDiscountValue(v.discount_value);
    setMinBookingAmount(v.min_booking_amount ?? "");
    setMaxDiscountAmount(v.max_discount_amount ?? "");
    setIsVoucherActive(v.is_active);
    setVoucherError(null);
    setShowVoucherModal(true);
  };

  // Save Voucher
  const handleSaveVoucher = async () => {
    if (!voucherCode.trim() || !voucherTitle.trim()) {
      setVoucherError("Voucher Code and Title are required.");
      return;
    }

    const val = typeof discountValue === "string" ? parseFloat(discountValue) : discountValue;
    if (isNaN(val) || val <= 0) {
      setVoucherError("Please enter a valid positive discount value.");
      return;
    }

    if (discountType === "percentage" && val > 100) {
      setVoucherError("Percentage discount cannot exceed 100%.");
      return;
    }

    const parsedMin = minBookingAmount !== "" ? parseFloat(minBookingAmount as any) : null;
    const parsedMax = maxDiscountAmount !== "" ? parseFloat(maxDiscountAmount as any) : null;

    setIsSavingVoucher(true);
    setVoucherError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const payload = {
      code: voucherCode.trim().toUpperCase(),
      title: voucherTitle.trim(),
      description: voucherDescription.trim() || null,
      discount_type: discountType,
      discount_value: val,
      min_booking_amount: parsedMin,
      max_discount_amount: parsedMax,
      is_active: isVoucherActive,
      sort_order: 0,
    };

    try {
      const url = editingVoucherId
        ? `${getApiBaseUrl()}/admin/bhavan/vouchers/${editingVoucherId}`
        : `${getApiBaseUrl()}/admin/bhavan/vouchers`;
      const method = editingVoucherId ? "PUT" : "POST";

      const res = await safeFetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowVoucherModal(false);
        setEditingVoucherId(null);
        await fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setVoucherError(errData.detail || "Failed to save voucher.");
      }
    } catch (err) {
      setVoucherError("Network error occurred while saving voucher.");
    } finally {
      setIsSavingVoucher(false);
    }
  };

  // Delete Handlers
  const handleDeleteRule = async () => {
    if (!deletingProfile) return;
    setIsDeleting(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/rule-profiles/${deletingProfile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeletingProfile(null);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to delete rule.");
      }
    } catch (e) {
      alert("Network error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    setIsDeleting(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    try {
      const res = await safeFetch(`${getApiBaseUrl()}/admin/bhavan/vouchers/${deletingVoucher.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeletingVoucher(null);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to delete voucher.");
      }
    } catch (e) {
      alert("Network error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Rules & 1-Click Vouchers</h1>
          <p className="text-xs text-zinc-500">
            Manage Wedding Peak dates, Maintenance closures, and 1-click discount vouchers applied at checkout
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "rules" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateRule("wedding")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <PartyPopper className="w-4 h-4" /> Add Wedding Rule
              </button>
              <button
                onClick={() => handleOpenCreateRule("closure")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Wrench className="w-4 h-4" /> Add Maintenance
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenCreateVoucher}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <Gift className="w-4 h-4" /> Add Voucher / Offer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zinc-100/80 rounded-2xl w-fit border border-zinc-200/80">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "rules"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-500" />
          Wedding & Maintenance Rules ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vouchers"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-600" />
          1-Click Vouchers & Offers ({vouchers.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "rules" ? "Search rules by name or type..." : "Search vouchers by code or title..."}
            className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-zinc-50/50"
          />
        </div>
        <div className="text-xs font-semibold text-zinc-500">
          Total Records: <strong className="text-zinc-900">{activeTab === "rules" ? filteredProfiles.length : filteredVouchers.length}</strong>
        </div>
      </div>

      {/* TAB 1: RULES TABLE */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-400">Loading rules...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No rules configured</p>
              <p className="text-xs text-zinc-400">Click "Add Wedding Rule" or "Add Maintenance" above to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Rule Name & Details</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Assigned Dates (In-Form)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {filteredProfiles.map((p, index) => {
                    const isWed = p.category === "wedding";
                    const dates = p.assigned_dates || [];
                    return (
                      <tr key={p.id} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="py-4 px-4 text-center font-mono text-zinc-400">{index + 1}</td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-zinc-900 block text-sm group-hover:text-amber-700 transition-colors">
                            {p.name}
                          </span>
                          {p.description ? (
                            <p className="text-xs text-zinc-500 line-clamp-1">{p.description}</p>
                          ) : isWed ? (
                            <p className="text-xs text-amber-600/80 font-medium">Wedding peak rates & priority</p>
                          ) : (
                            <p className="text-xs text-rose-600/80 font-medium">Maintenance closure & blocking</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {isWed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                              <PartyPopper className="w-3 h-3" /> Wedding Peak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">
                              <Wrench className="w-3 h-3" /> Maintenance
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-zinc-700">
                          {dates.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-semibold">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                {dates[0]} {dates.length > 1 ? `to ${dates[dates.length - 1]}` : ""}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-sans">({dates.length} day{dates.length > 1 ? "s" : ""})</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs italic">No dates set (Rule inactive)</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Active
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingProfile(p)}
                              title="View Details"
                              className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditRule(p)}
                              title="Edit Rule"
                              className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingProfile(p)}
                              title="Delete Rule"
                              className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VOUCHERS TABLE */}
      {activeTab === "vouchers" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-400">Loading vouchers...</div>
          ) : filteredVouchers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Gift className="w-10 h-10 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-700">No vouchers configured</p>
              <p className="text-xs text-zinc-400">
                Click "Add Voucher / Offer" above to create 1-click discount vouchers for booking checkout.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Voucher Code & Title</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Minimum Booking</th>
                    <th className="py-3.5 px-4">Max Cap</th>
                    <th className="py-3.5 px-4">Checkout Usage</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {filteredVouchers.map((v, index) => (
                    <tr key={v.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="py-4 px-4 text-center font-mono text-zinc-400">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-xs">
                            {v.code}
                          </span>
                          <span className="font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                            {v.title}
                          </span>
                        </div>
                        {v.description && (
                          <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{v.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-sm text-emerald-600">
                          {v.discount_type === "percentage" ? `${v.discount_value}% OFF` : `₹${v.discount_value} FLAT`}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-zinc-700">
                        {v.min_booking_amount ? `₹${v.min_booking_amount}` : "None"}
                      </td>
                      <td className="py-4 px-4 font-mono text-zinc-700">
                        {v.max_discount_amount ? `₹${v.max_discount_amount}` : "No Limit"}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          <CheckCircle2 className="w-3 h-3" /> 1-Click Apply
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingVoucher(v)}
                            title="View Details"
                            className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditVoucher(v)}
                            title="Edit Voucher"
                            className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingVoucher(v)}
                            title="Delete Voucher"
                            className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          href="/admin/bhavan"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bhavan Overview
        </Link>

        <div className="flex items-center gap-2">
          {activeTab === "rules" ? (
            <>
              <button
                onClick={() => handleOpenCreateRule("wedding")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <PartyPopper className="w-4 h-4" /> Add Wedding Rule
              </button>
              <button
                onClick={() => handleOpenCreateRule("closure")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Wrench className="w-4 h-4" /> Add Maintenance
              </button>
            </>
          ) : (
            <button
              onClick={handleOpenCreateVoucher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Voucher
            </button>
          )}
        </div>
      </div>

      {/* MODAL: Create / Edit Rule (With In-Form Dates) */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                {ruleCategory === "wedding" ? <PartyPopper className="w-5 h-5 text-amber-500" /> : <Wrench className="w-5 h-5 text-zinc-700" />}
                {editingProfileId ? "Edit Rule" : "Create Rule"}
              </h3>
              <button
                onClick={() => { setShowRuleModal(false); setEditingProfileId(null); }}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ruleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{ruleError}</span>
              </div>
            )}

            {/* Rule Type Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">Rule Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRuleCategory("wedding")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    ruleCategory === "wedding"
                      ? "border-amber-500 bg-amber-50/50 text-amber-900 shadow-sm"
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                  }`}
                >
                  <PartyPopper className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Wedding Peak</span>
                    <span className="text-[10px] text-zinc-500 block">Custom rates for wedding dates</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRuleCategory("closure")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    ruleCategory === "closure"
                      ? "border-rose-500 bg-rose-50/50 text-rose-900 shadow-sm"
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                  }`}
                >
                  <Wrench className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Maintenance</span>
                    <span className="text-[10px] text-zinc-500 block">Block dates & show notice</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Rule Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Rule Name *</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Wedding Season Peak, Hall Painting Work"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* IN-FORM MULTIPLE DATES PICKER */}
            <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-800 uppercase">
                  📅 Rule Applicable Dates (Multiple Ranges Supported) *
                </label>
                <button
                  type="button"
                  onClick={handleAddDateRange}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Date Range
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Specify one or multiple date ranges when this rule is in effect.
              </p>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {ruleDateRanges.map((rng, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 w-5 text-center">#{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 block uppercase">Start Date</span>
                        <input
                          type="date"
                          value={rng.start}
                          onChange={(e) => handleDateRangeChange(idx, "start", e.target.value)}
                          className="w-full px-2 py-1 border border-zinc-200 rounded text-xs bg-white font-medium"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 block uppercase">End Date</span>
                        <input
                          type="date"
                          value={rng.end}
                          min={rng.start}
                          onChange={(e) => handleDateRangeChange(idx, "end", e.target.value)}
                          className="w-full px-2 py-1 border border-zinc-200 rounded text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                    {ruleDateRanges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDateRange(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Date Range"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Closure Notice (if Maintenance) */}
            {ruleCategory === "closure" ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Public Closure Notice Message</label>
                <textarea
                  rows={2}
                  value={closureNotice}
                  onChange={(e) => setClosureNotice(e.target.value)}
                  placeholder="e.g. Bhavan is temporarily closed for maintenance on these dates."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs resize-none focus:outline-none focus:border-rose-500"
                />
              </div>
            ) : (
              /* Wedding Accommodation Permissions & Peak Rates */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase">
                    Room Booking Permissions on These Dates
                  </label>
                  <span className="text-[10px] text-zinc-400">Select which rooms can be booked & peak rates</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {accTypes.map((t) => {
                    const isAllowed = typeConfig[t.id]?.allowed !== false;
                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isAllowed
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-zinc-200 bg-zinc-100/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={(e) => {
                                const allowed = e.target.checked;
                                setTypeConfig((prev) => ({
                                  ...prev,
                                  [t.id]: {
                                    allowed,
                                    price: prev[t.id]?.price ?? t.base_price_per_night,
                                  },
                                }));
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300"
                            />
                            <div>
                              <span className={`text-xs font-bold block ${isAllowed ? "text-zinc-900" : "text-zinc-400 line-through"}`}>
                                {t.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">Base: ₹{t.base_price_per_night}/night</span>
                            </div>
                          </label>

                          {isAllowed ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-700 font-bold uppercase">Peak Rate: ₹</span>
                              <input
                                type="number"
                                value={typeConfig[t.id]?.price ?? t.base_price_per_night}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setTypeConfig((prev) => ({
                                    ...prev,
                                    [t.id]: { allowed: true, price: val },
                                  }));
                                }}
                                className="w-20 px-2 py-1 border border-zinc-200 rounded-lg text-xs font-bold text-amber-700 text-right bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VOUCHER RESTRICTIONS / BLOCKING SELECTOR */}
            {vouchers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-800 uppercase flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-emerald-600" />
                    Voucher Restrictions on These Dates
                  </label>
                  <span className="text-[10px] font-semibold text-zinc-500">
                    {blockedVoucherIds.length} voucher(s) blocked
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Select which discount vouchers to block on these dates (e.g. disable high discounts on peak wedding days):
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {vouchers.map((v) => {
                    const isBlocked = blockedVoucherIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleToggleBlockedVoucher(v.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isBlocked
                            ? "border-rose-300 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400"
                            : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/60 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isBlocked}
                            readOnly
                            className="w-4 h-4 rounded text-rose-600 border-zinc-300"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] text-zinc-800 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                                {v.code}
                              </span>
                              <span className="text-xs font-bold text-zinc-900">{v.title}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {v.discount_type === "percentage" ? `${v.discount_value}% OFF` : `₹${v.discount_value} FLAT`}
                            </span>
                          </div>
                        </div>
                        {isBlocked ? (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                            BLOCKED 🚫
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Allowed ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={isSavingRule}
                onClick={() => { setShowRuleModal(false); setEditingProfileId(null); }}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRule}
                onClick={handleSaveRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSavingRule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSavingRule ? "Saving..." : "Save Rule & Dates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Voucher */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                {editingVoucherId ? "Edit Voucher / Offer" : "Create 1-Click Voucher"}
              </h3>
              <button
                onClick={() => { setShowVoucherModal(false); setEditingVoucherId(null); }}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {voucherError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Voucher Code *</label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAMAJ10"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Discount Type *</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Offer Title *</label>
              <input
                type="text"
                value={voucherTitle}
                onChange={(e) => setVoucherTitle(e.target.value)}
                placeholder="e.g. Samaj Member Special Discount"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1 truncate">
                  Discount Value ({discountType === "percentage" ? "%" : "₹"}) *
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "500"}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1 truncate">
                  Min Booking (₹)
                </label>
                <input
                  type="number"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Description / Note</label>
              <textarea
                rows={2}
                value={voucherDescription}
                onChange={(e) => setVoucherDescription(e.target.value)}
                placeholder="Brief details shown to customer on the clickable offer card..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs resize-none focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={isSavingVoucher}
                onClick={() => { setShowVoucherModal(false); setEditingVoucherId(null); }}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingVoucher}
                onClick={handleSaveVoucher}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isSavingVoucher && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSavingVoucher ? "Saving..." : "Save Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Rule Details */}
      {viewingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                viewingProfile.category === "wedding" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-rose-100 text-rose-800 border-rose-300"
              }`}>
                {viewingProfile.category === "wedding" ? "Wedding Peak Rule" : "Maintenance Closure"}
              </span>
              <button onClick={() => setViewingProfile(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900">{viewingProfile.name}</h2>
              {viewingProfile.description && (
                <p className="text-xs text-zinc-600 mt-1">{viewingProfile.description}</p>
              )}

              {/* Assigned Dates */}
              <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase mb-1">Assigned Dates ({viewingProfile.assigned_dates?.length || 0} days)</span>
                {viewingProfile.assigned_dates && viewingProfile.assigned_dates.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1 font-mono text-xs text-zinc-700 max-h-28 overflow-y-auto pr-1">
                    {viewingProfile.assigned_dates.map((d) => (
                      <span key={d} className="px-2 py-0.5 bg-white border border-zinc-200 rounded">{d}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">No dates assigned</span>
                )}
              </div>

              {/* Accommodations on These Dates */}
              {viewingProfile.category === "wedding" && (
                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] font-bold text-amber-800 block uppercase mb-1.5">
                    Room Permissions & Peak Rates
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {accTypes.map((t) => {
                      const tCfg = viewingProfile.config?.accommodations?.[t.id];
                      const availCfg = viewingProfile.config?.availability?.accommodation?.[t.id];
                      const isAllowed = availCfg !== undefined ? availCfg === "allowed" : (tCfg ? tCfg.allowed !== false : true);
                      const price = tCfg?.price ?? t.base_price_per_night;
                      return (
                        <div key={t.id} className="flex items-center justify-between py-1 border-b border-amber-100 last:border-0">
                          <span className={isAllowed ? "font-semibold text-zinc-800" : "text-zinc-400 line-through"}>{t.name}</span>
                          {isAllowed ? (
                            <span className="font-mono font-bold text-amber-700">₹{price}/night</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Blocked</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blocked Vouchers on These Dates */}
              {viewingProfile.config?.blocked_vouchers && viewingProfile.config.blocked_vouchers.length > 0 && (
                <div className="mt-3 p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 block uppercase mb-1">
                    Blocked Vouchers on These Dates ({viewingProfile.config.blocked_vouchers.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewingProfile.config.blocked_vouchers.map((vId: string) => {
                      const vObj = vouchers.find((v) => v.id === vId || v.code === vId);
                      return (
                        <span key={vId} className="px-2 py-0.5 bg-white border border-rose-300 rounded text-xs font-mono font-bold text-rose-700">
                          {vObj ? `${vObj.code} (${vObj.title})` : vId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setViewingProfile(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenEditRule(viewingProfile)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Voucher Details */}
      {viewingVoucher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300">
                {viewingVoucher.code}
              </span>
              <button onClick={() => setViewingVoucher(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900">{viewingVoucher.title}</h2>
              {viewingVoucher.description && (
                <p className="text-xs text-zinc-600 mt-1">{viewingVoucher.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Discount</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {viewingVoucher.discount_type === "percentage" ? `${viewingVoucher.discount_value}% OFF` : `₹${viewingVoucher.discount_value} FLAT`}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase">Min Booking</span>
                  <span className="text-base font-extrabold text-zinc-800">
                    {viewingVoucher.min_booking_amount ? `₹${viewingVoucher.min_booking_amount}` : "None"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenEditVoucher(viewingVoucher)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation */}
      {deletingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Rule?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to delete <strong className="text-zinc-800">"{deletingProfile.name}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingProfile(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Voucher Confirmation */}
      {deletingVoucher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Voucher?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to delete voucher <strong className="text-zinc-800">"{deletingVoucher.code}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingVoucher(null)}
                className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteVoucher}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
