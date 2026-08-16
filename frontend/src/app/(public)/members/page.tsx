"use client";

import { useState, useEffect } from "react";
import { 
  Search, Phone, MapPin, Lock, Award, Edit3, UserPlus,
  CheckCircle2, AlertCircle, ShieldCheck, X, Send, KeyRound, UserCheck, RefreshCw, Eye, MessageSquare, User, Camera, Upload, Globe
} from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatParentage } from "@/utils/member";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  user_id: string;
  samaj_id: string | null;
  lm_no: number | null;
  zone: string | null;
  house_no: string | null;
  member_status: string | null;
  first_name: string;
  surname: string;
  father_name: string | null;
  profession: string | null;
  native_place?: string | null;
  bio?: string | null;
  profile_photo: string | null;
  family_relation: string | null;
  email: string | null;
  mobile: string | null;
  mobile_masked: string | null;
  address: string | null;
  mobile_private: boolean;
  email_private: boolean;
  address_private: boolean;
  profession_private?: boolean;
  native_place_private?: boolean;
  bio_private?: boolean;
  role: string;
  is_member: boolean;
}

// Members flagged Shifted / Expired / etc. in the source list are kept in the
// directory, not deleted — they are surfaced with a status badge instead.
const MEMBER_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  shifted: { label: "Shifted", className: "bg-amber-50 text-amber-700 border-amber-200" },
  expired: { label: "Expired", className: "bg-rose-50 text-rose-700 border-rose-200" },
  sold_out: { label: "Sold Out", className: "bg-orange-50 text-orange-700 border-orange-200" },
  shifted_sold_out: { label: "Shifted · Sold Out", className: "bg-purple-50 text-purple-700 border-purple-200" },
  double_name: { label: "Double Name", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function getStatusBadge(status: string | null | undefined) {
  if (!status || status === "active") return null;
  return MEMBER_STATUS_BADGE[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600 border-zinc-200" };
}

export default function PublicMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [viewMemberModal, setViewMemberModal] = useState<Member | null>(null);
  const [messageMemberModal, setMessageMemberModal] = useState<Member | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderMobile, setSenderMobile] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [messageReason, setMessageReason] = useState("General Inquiry");
  const [messageText, setMessageText] = useState("");
  const [msgStep, setMsgStep] = useState<"form" | "otp">("form");
  const [msgOtp, setMsgOtp] = useState("");
  const [msgSendingOtp, setMsgSendingOtp] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccessMsg, setMessageSuccessMsg] = useState("");
  const [messageError, setMessageError] = useState("");

  // OTP Edit Flow State
  const [editStep, setEditStep] = useState<"phone" | "otp" | "form">("phone");
  const [editPhone, setEditPhone] = useState("");
  const [editOtp, setEditOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  
  // Selected Member for Edit & Identifier Input
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [identifierInput, setIdentifierInput] = useState("");
  
  // Form fields for Profile Edit
  const [editFirstName, setEditFirstName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editParentRelation, setEditParentRelation] = useState("C/o");
  const [editFatherName, setEditFatherName] = useState("");
  const [editProfession, setEditProfession] = useState("");
  const [editNativePlace, setEditNativePlace] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editMobilePrivate, setEditMobilePrivate] = useState(false);
  const [editEmailPrivate, setEditEmailPrivate] = useState(false);
  const [editAddressPrivate, setEditAddressPrivate] = useState(false);
  const [editProfessionPrivate, setEditProfessionPrivate] = useState(false);
  const [editNativePlacePrivate, setEditNativePlacePrivate] = useState(false);
  const [editBioPrivate, setEditBioPrivate] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Registration Modal State (Apply for unlisted member)
  const [regStep, setRegStep] = useState<"details" | "otp">("details");
  const [regFirstName, setRegFirstName] = useState("");
  const [regSurname, setRegSurname] = useState("");
  const [regParentRelation, setRegParentRelation] = useState("C/o");
  const [regFatherName, setRegFatherName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regProfession, setRegProfession] = useState("");
  const [regNativePlace, setRegNativePlace] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPhotoUrl, setRegPhotoUrl] = useState("");
  const [regMobilePrivate, setRegMobilePrivate] = useState(false);
  const [regEmailPrivate, setRegEmailPrivate] = useState(false);
  const [regAddressPrivate, setRegAddressPrivate] = useState(false);
  const [regProfessionPrivate, setRegProfessionPrivate] = useState(false);
  const [regNativePlacePrivate, setRegNativePlacePrivate] = useState(false);
  const [regBioPrivate, setRegBioPrivate] = useState(false);
  const [regUploadingPhoto, setRegUploadingPhoto] = useState(false);
  const [regOtp, setRegOtp] = useState("");
  const [regSendingOtp, setRegSendingOtp] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/membership/members`);
      setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch members directory", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle photo file selection & upload
  const handlePhotoFileUpload = async (
    file: File,
    setPhotoUrl: (url: string) => void,
    setUploading: (val: boolean) => void,
    setError: (msg: string) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${getApiBaseUrl()}/membership/upload-photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
      setPhotoUrl(`${baseUrl}${res.data.url}`);
    } catch (err: any) {
      console.error("Photo upload failed, converting to local preview data URL", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  // Multi-keyword / multi-field search logic
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const terms = searchQuery.toLowerCase().trim().split(/\s+/);
    
    const searchableText = [
      m.first_name,
      m.surname,
      `${m.first_name} ${m.surname}`,
      m.father_name || "",
      m.samaj_id || "",
      m.lm_no != null ? String(m.lm_no) : "",
      m.zone || "",
      m.house_no || "",
      m.profession || "",
      m.native_place || "",
      m.bio || "",
      m.address || "",
      m.mobile || "",
      m.mobile_masked || "",
      m.email || "",
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => searchableText.includes(term));
  });

  // Handle Edit Profile button click on card
  const handleOpenEdit = (member?: Member) => {
    setShowEditModal(true);
    setEditStep("phone");
    setOtpError("");
    setOtpSentMessage("");
    setEditSuccessMsg("");
    setEditPhone("");
    setEditMobile("");
    setEditOtp("");
    setIdentifierInput("");
    if (member) {
      setTargetMember(member);
    } else {
      setTargetMember(null);
    }
  };

  // Step 1: Send OTP to target member's registered mobile number in DB
  const handleSendEditOtp = async () => {
    setSendingOtp(true);
    setOtpError("");
    try {
      const payload = targetMember
        ? { user_id: targetMember.user_id }
        : { identifier: identifierInput.trim() };

      if (!targetMember && !identifierInput.trim()) {
        setOtpError("Please enter your Member ID or registered phone number.");
        setSendingOtp(false);
        return;
      }

      const res = await axios.post(`${getApiBaseUrl()}/membership/send-member-edit-otp`, payload);
      setOtpSentMessage(res.data.message || `Verification code sent to registered mobile number.`);
      
      if (res.data.user_id) {
        const found = members.find(m => m.user_id === res.data.user_id);
        if (found) setTargetMember(found);
      }

      setEditStep("otp");
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || "Failed to send OTP. Please verify member details.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP for Edit
  const handleVerifyEditOtp = async () => {
    if (!editOtp.trim() || editOtp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit OTP code.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const payload = targetMember
        ? { user_id: targetMember.user_id, otp: editOtp.trim() }
        : { identifier: identifierInput.trim(), otp: editOtp.trim() };

      const res = await axios.post(`${getApiBaseUrl()}/membership/verify-member-edit-otp`, payload);
      const user = res.data.user;

      if (user) {
        const found = members.find(m => m.user_id === user.user_id) || targetMember;
        if (found) setTargetMember(found);

        setEditFirstName(user.first_name || "");
        setEditSurname(user.surname || "");
        setEditFatherName(user.father_name || "");
        setEditProfession(user.profession || "");
        setEditNativePlace(user.native_place || "");
        setEditBio(user.bio || "");
        setEditEmail(user.email || "");
        setEditMobile(user.mobile || "");
        setEditAddress(user.address || "");
        setEditPhotoUrl(user.profile_photo || "");
        setEditMobilePrivate(user.mobile_private || false);
        setEditEmailPrivate(user.email_private || false);
        setEditAddressPrivate(user.address_private || false);
        setEditProfessionPrivate(user.profession_private || false);
        setEditNativePlacePrivate(user.native_place_private || false);
        setEditBioPrivate(user.bio_private || false);
      }

      setEditStep("form");
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || "Invalid or expired OTP code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Submit Profile Update Request
  const handleSubmitProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) {
      setOtpError("Target member session invalid. Please start again.");
      return;
    }
    if (!editFirstName.trim() || !editSurname.trim()) {
      setOtpError("First name and Surname are compulsory.");
      return;
    }
    setSubmittingEdit(true);
    setOtpError("");
    try {
      await axios.post(`${getApiBaseUrl()}/membership/update-profile/request`, {
        user_id: targetMember.user_id,
        otp: editOtp.trim(),
        first_name: editFirstName.trim(),
        surname: editSurname.trim(),
        father_name: editFatherName.trim() || null,
        profession: editProfession.trim() || null,
        native_place: editNativePlace.trim() || null,
        bio: editBio.trim() || null,
        email: editEmail.trim() || null,
        mobile: editMobile.trim() || null,
        address: editAddress.trim() || null,
        profile_photo: editPhotoUrl.trim() || null,
        mobile_private: editMobilePrivate,
        email_private: editEmailPrivate,
        address_private: editAddressPrivate,
        profession_private: editProfessionPrivate,
        native_place_private: editNativePlacePrivate,
        bio_private: editBioPrivate,
      });

      setEditSuccessMsg("Your profile updates have been submitted to Agrawal Samaj Mansrovar Jaipur Admin for verification! Once approved by Admin, your updated details will appear on the live website.");
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || "Failed to submit profile update request.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Send OTP for Contact Message
  const handleSendMsgOtp = async () => {
    if (!senderName.trim() || !senderMobile.trim() || !messageText.trim()) {
      setMessageError("Your Name, Contact Mobile, and Message are required.");
      return;
    }
    setMsgSendingOtp(true);
    setMessageError("");
    try {
      await axios.post(`${getApiBaseUrl()}/auth/phone/send-otp`, { phone: senderMobile.trim() });
      setMsgStep("otp");
    } catch (err: any) {
      setMessageError(err.response?.data?.detail || "Failed to send OTP code to your phone number.");
    } finally {
      setMsgSendingOtp(false);
    }
  };

  // Submit Contact Message Form
  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageMemberModal) return;
    if (!msgOtp.trim() || msgOtp.trim().length !== 6) {
      setMessageError("Please enter the 6-digit verification OTP code.");
      return;
    }
    setSendingMessage(true);
    setMessageError("");
    try {
      const res = await axios.post(`${getApiBaseUrl()}/membership/contact-member`, {
        recipient_user_id: messageMemberModal.user_id,
        sender_name: senderName.trim(),
        sender_mobile: senderMobile.trim(),
        sender_email: senderEmail.trim() || null,
        reason: messageReason,
        message: messageText.trim(),
        otp: msgOtp.trim(),
      });
      setMessageSuccessMsg(res.data.message || `Your message request has been sent to ${messageMemberModal.first_name} ${messageMemberModal.surname}.`);
    } catch (err: any) {
      setMessageError(err.response?.data?.detail || "Failed to send message request.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Registration Modal - Send OTP
  const handleRegSendOtp = async () => {
    if (!regFirstName.trim() || !regSurname.trim() || !regMobile.trim()) {
      setRegError("First name, Surname, and Mobile number are required.");
      return;
    }
    setRegSendingOtp(true);
    setRegError("");
    try {
      await axios.post(`${getApiBaseUrl()}/auth/register/send-otp`, { identifier: regMobile.trim() });
      setRegStep("otp");
    } catch (err: any) {
      setRegError(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setRegSendingOtp(false);
    }
  };

  // Registration Modal - Submit Application with OTP
  const handleRegSubmit = async () => {
    if (!regOtp.trim() || regOtp.trim().length !== 6) {
      setRegError("Please enter the 6-digit OTP code.");
      return;
    }
    setRegSubmitting(true);
    setRegError("");
    try {
      await axios.post(`${getApiBaseUrl()}/membership/apply-with-otp`, {
        first_name: regFirstName.trim(),
        surname: regSurname.trim(),
        father_name: regFatherName.trim() || null,
        parent_relation: regParentRelation.trim() || null,
        mobile: regMobile.trim(),
        email: regEmail.trim() || null,
        profession: regProfession.trim() || null,
        native_place: regNativePlace.trim() || null,
        bio: regBio.trim() || null,
        address: regAddress.trim() || null,
        profile_photo: regPhotoUrl.trim() || null,
        mobile_private: regMobilePrivate,
        email_private: regEmailPrivate,
        address_private: regAddressPrivate,
        profession_private: regProfessionPrivate,
        native_place_private: regNativePlacePrivate,
        bio_private: regBioPrivate,
        otp: regOtp.trim(),
      });
      setRegSuccessMsg("Registration application submitted successfully! Our executive committee will verify your details and approve your membership.");
    } catch (err: any) {
      setRegError(err.response?.data?.detail || "Failed to submit registration application.");
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-50/50 pb-20 overflow-hidden">
      <div className="absolute inset-0 animated-gradient-mesh opacity-10 -z-10" />
      {/* Hero Banner Header */}
      <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white overflow-hidden py-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-black/30 pointer-events-none" />
        <motion.div
          className="absolute -top-16 -left-16 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 -right-16 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold backdrop-blur-md border border-white/10">
                <ShieldCheck className="w-4 h-4" /> Verified Samaj Directory
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Agrawal Samaj Mansrovar Jaipur Members Directory
              </h1>
              <p className="text-amber-100 text-sm sm:text-base leading-relaxed">
                Explore, search, and connect with registered members of Agrawal Samaj Mansrovar Jaipur. Search by name, phone number, member ID, address, or profession.
              </p>
            </div>

          </div>

          {/* Search Bar Input */}
          <div className="mt-8 max-w-5xl bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/30 flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, phone number, Samaj ID, address... (e.g. '901' or 'Rajeshji Shipra Path')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-zinc-800 placeholder-zinc-400 bg-transparent text-sm sm:text-base focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="px-4 py-2 bg-amber-50 rounded-xl text-xs font-bold text-amber-700 whitespace-nowrap border border-amber-200/50">
              Total Members: {filteredMembers.length}
            </div>
            <button
              onClick={() => {
                setShowRegisterModal(true);
                setRegStep("details");
                setRegError("");
                setRegSuccessMsg("");
              }}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-700 sm:w-auto"
            >
              <UserPlus className="w-4 h-4" /> Apply for New Membership
            </button>
          </div>
        </div>
      </div>

      {/* Main Directory Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {loading ? (
          <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading verified member directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-sm space-y-5 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-900">No Members Found</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                We couldn't find any member matching "{searchQuery}". Try searching with a different name, address keyword, or Samaj ID.
              </p>
            </div>
            <div className="pt-2">
              <p className="text-xs text-zinc-400 mb-3 font-semibold uppercase tracking-wider">Are you a member of Agrawal Samaj Mansrovar Jaipur?</p>
              <button
                onClick={() => {
                  setShowRegisterModal(true);
                  setRegStep("details");
                  setRegError("");
                  setRegSuccessMsg("");
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <UserPlus className="w-4 h-4" /> Member Not Listed? Apply for New Membership
              </button>
            </div>
          </div>
        ) : (
          /* Members List */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="glass-panel rounded-[1.75rem] divide-y divide-white/50 overflow-hidden shadow-xl"
          >
            {filteredMembers.map((m) => {
              const initials = `${m.first_name.charAt(0)}${m.surname.charAt(0)}`.toUpperCase();
              const badge = getStatusBadge(m.member_status);
              return (
                <div
                  key={m.user_id}
                  className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 px-4 py-3.5 border-l-2 border-transparent hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-200 group"
                >
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0 lg:w-64 xl:w-72 flex-shrink-0">
                    {m.profile_photo ? (
                      <img
                        src={m.profile_photo}
                        alt={`${m.first_name} ${m.surname}`}
                        className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500/20 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-zinc-900 text-sm sm:text-base truncate group-hover:text-amber-600 transition-colors">
                          {m.first_name} {m.surname}
                        </h3>
                        {badge && (
                          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {formatParentage(m.father_name) && (
                        <p className="text-xs text-zinc-500 truncate">{formatParentage(m.father_name)}</p>
                      )}
                      {m.samaj_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 mt-0.5">
                          <Award className="w-3 h-3 text-amber-600" /> {m.samaj_id}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">ID Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Key details */}
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                    {/* Phone */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      {m.mobile_private ? (
                        <span className="font-mono font-semibold text-zinc-600 truncate flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          {m.mobile ? `XXXXXX${m.mobile.slice(-4)}` : (m.mobile_masked || "XXXXXX")}
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-zinc-800 truncate">
                          {m.mobile || m.mobile_masked || "N/A"}
                        </span>
                      )}
                    </div>

                    {/* Zone */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-zinc-400 font-semibold flex-shrink-0">Zone:</span>
                      <span className="text-zinc-700 font-medium truncate">{m.zone || "—"}</span>
                    </div>

                    {/* House No. */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-zinc-400 font-semibold flex-shrink-0">House:</span>
                      <span className="text-zinc-700 font-medium truncate">{m.house_no || "—"}</span>
                    </div>

                    {/* Profession */}
                    {m.profession ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-zinc-700 font-medium truncate">💼 {m.profession}</span>
                      </div>
                    ) : (
                      <div className="hidden md:block" />
                    )}

                    {/* Native Place */}
                    {m.native_place ? (
                      <div className="flex items-center gap-1.5 min-w-0 col-span-2 md:col-span-2">
                        <span className="text-zinc-500 font-semibold flex-shrink-0">Origin:</span>
                        <span className="text-zinc-700 font-medium truncate">🚩 {m.native_place}</span>
                      </div>
                    ) : null}

                    {/* Address (full width) */}
                    <div className="col-span-2 md:col-span-4 flex items-start gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-600 font-medium truncate">
                        {m.address && !m.address_private
                          ? m.address
                          : m.address_private
                            ? "Address private"
                            : "No address on record"}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit (OTP), View Details & Message */}
                  <div className="flex items-center gap-2 flex-shrink-0 lg:justify-end border-t border-zinc-100 pt-3 mt-1 lg:border-t-0 lg:pt-0 lg:mt-0">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-4 h-4 text-zinc-500" /> Edit
                    </button>
                    <button
                      onClick={() => setViewMemberModal(m)}
                      className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 text-zinc-500" /> View Details
                    </button>
                    <button
                      onClick={() => {
                        setMessageMemberModal(m);
                        setSenderName("");
                        setSenderMobile("");
                        setSenderEmail("");
                        setMessageReason("General Inquiry");
                        setMessageText("");
                        setMessageError("");
                        setMessageSuccessMsg("");
                      }}
                      className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-600" /> Message
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* MODAL 1: OTP Profile Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden my-8"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Edit Profile Details</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {editSuccessMsg ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-zinc-900">Request Submitted!</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed px-4">{editSuccessMsg}</p>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                ) : editStep === "phone" ? (
                  <div className="space-y-4">
                    {targetMember ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-sm space-y-1">
                        <p className="font-bold text-zinc-900">{targetMember.first_name} {targetMember.surname} ({targetMember.samaj_id || "Member"})</p>
                        <p className="text-amber-800 font-medium">
                          OTP will be sent to registered number: <span className="font-mono font-bold">{targetMember.mobile_masked || "XXXXXXX..."}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Member ID or Registered Phone</label>
                        <input
                          type="text"
                          placeholder="Enter Member ID or registered phone number"
                          value={identifierInput}
                          onChange={(e) => setIdentifierInput(e.target.value)}
                          className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-mono"
                        />
                      </div>
                    )}

                    {otpError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {otpError}
                      </p>
                    )}

                    <button
                      onClick={handleSendEditOtp}
                      disabled={sendingOtp}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {sendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Verification OTP
                    </button>
                  </div>
                ) : editStep === "otp" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs border border-emerald-200 flex items-center justify-between">
                      <span>{otpSentMessage || `OTP sent to registered phone`}</span>
                      <button
                        onClick={() => setEditStep("phone")}
                        className="text-emerald-700 underline font-bold hover:text-emerald-900 ml-2"
                      >
                        Change
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Enter 6-Digit OTP Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={editOtp}
                        onChange={(e) => setEditOtp(e.target.value)}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {otpError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {otpError}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditStep("phone")}
                        className="w-1/3 py-3 border border-zinc-200 text-zinc-600 text-xs font-bold rounded-xl hover:bg-zinc-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleVerifyEditOtp}
                        disabled={verifyingOtp}
                        className="w-2/3 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {verifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Verify & Open Edit Panel
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProfileEdit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-medium border border-blue-200">
                      ℹ️ Edit your profile details below and toggle field visibility. Your changes will be submitted for Admin approval.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">First Name *</label>
                        <input
                          type="text"
                          required
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">Surname *</label>
                        <input
                          type="text"
                          required
                          value={editSurname}
                          onChange={(e) => setEditSurname(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Relation & Parent/Husband Name</label>
                      <div className="flex gap-2">
                        <select
                          value={editParentRelation}
                          onChange={(e) => setEditParentRelation(e.target.value)}
                          className="px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-semibold"
                        >
                          <option value="S/o">S/o</option>
                          <option value="D/o">D/o</option>
                          <option value="W/o">W/o</option>
                          <option value="C/o">C/o</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Agrawal"
                          value={editFatherName}
                          onChange={(e) => setEditFatherName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Profile Photo File Upload */}
                    <div className="space-y-1.5 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                      <label className="text-xs font-bold text-zinc-700 block">Profile Photo (Upload Image File)</label>
                      <div className="flex items-center gap-3">
                        {editPhotoUrl ? (
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-sm flex-shrink-0">
                            <img src={editPhotoUrl} alt="Profile Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditPhotoUrl("")}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                              title="Remove photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-amber-100/70 border border-dashed border-amber-400 flex flex-col items-center justify-center text-amber-700 flex-shrink-0">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">
                            {uploadingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {editPhotoUrl ? "Change Image File" : "Choose Image File"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhoto}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoFileUpload(file, setEditPhotoUrl, setUploadingPhoto, setOtpError);
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-zinc-500">Formats: JPG, PNG, WEBP (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    {/* Profession / Business + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Job / Business / Profession</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={editProfessionPrivate}
                            onChange={(e) => setEditProfessionPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Doctor, Business Owner, Architect"
                        value={editProfession}
                        onChange={(e) => setEditProfession(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Native Place + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Where you belong from / Native Place</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={editNativePlacePrivate}
                            onChange={(e) => setEditNativePlacePrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Agroha, Hisar, Jaipur, Mathura"
                        value={editNativePlace}
                        onChange={(e) => setEditNativePlace(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Bio / Description + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">About Me / Personal Bio</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={editBioPrivate}
                            onChange={(e) => setEditBioPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Brief introduction about yourself, interests, social work..."
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Email Field + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Email Address</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600">
                          <input
                            type="checkbox"
                            checked={editEmailPrivate}
                            onChange={(e) => setEditEmailPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Mobile Field + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Mobile / Phone Number *</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600">
                          <input
                            type="checkbox"
                            checked={editMobilePrivate}
                            onChange={(e) => setEditMobilePrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-mono"
                      />
                    </div>

                    {/* Address Field + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Address / Location</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600">
                          <input
                            type="checkbox"
                            checked={editAddressPrivate}
                            onChange={(e) => setEditAddressPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="House no, Street, Sector, City"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {otpError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {otpError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submittingEdit}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {submittingEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit Details for Admin Approval
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: View Full Details Modal */}
      <AnimatePresence>
        {viewMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden my-8"
            >
              {/* Header Banner */}
              <div className="px-6 py-6 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white relative">
                <button
                  onClick={() => setViewMemberModal(null)}
                  className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  {viewMemberModal.profile_photo ? (
                    <img
                      src={viewMemberModal.profile_photo}
                      alt={`${viewMemberModal.first_name} ${viewMemberModal.surname}`}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-xl border border-white/30 backdrop-blur-md shadow-md">
                      {`${viewMemberModal.first_name.charAt(0)}${viewMemberModal.surname.charAt(0)}`.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{viewMemberModal.first_name} {viewMemberModal.surname}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {viewMemberModal.samaj_id && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-lg border border-white/30">
                          <Award className="w-3.5 h-3.5" /> {viewMemberModal.samaj_id}
                        </span>
                      )}
                      {(() => {
                        const badge = getStatusBadge(viewMemberModal.member_status);
                        return badge ? (
                          <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-lg border border-white/30">
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {/* LM No. */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">LM No.</span>
                    <span className="font-semibold text-zinc-900">{viewMemberModal.lm_no ?? "Not specified"}</span>
                  </div>

                  {/* Father / Husband Name */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Father's / Husband's Name</span>
                    <span className="font-semibold text-zinc-900">{formatParentage(viewMemberModal.father_name) || "Not specified"}</span>
                  </div>

                  {/* Zone & House No. */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Zone / House No.</span>
                    <span className="font-semibold text-zinc-900">
                      {[viewMemberModal.zone, viewMemberModal.house_no].filter(Boolean).join(" / ") || "Not specified"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</span>
                    {(() => {
                      const badge = getStatusBadge(viewMemberModal.member_status);
                      return badge ? (
                        <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </span>
                      );
                    })()}
                  </div>

                  {/* Profession */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Profession / Business</span>
                    {viewMemberModal.profession_private || !viewMemberModal.profession ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900">{viewMemberModal.profession}</span>
                    )}
                  </div>

                  {/* Native Place */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Native Place / Belonging From</span>
                    {viewMemberModal.native_place_private || !viewMemberModal.native_place ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900">{viewMemberModal.native_place}</span>
                    )}
                  </div>

                  {/* Personal Bio */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex-shrink-0">About / Bio</span>
                    {viewMemberModal.bio_private || !viewMemberModal.bio ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900 text-right">{viewMemberModal.bio}</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact Phone</span>
                    {viewMemberModal.mobile_private ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-zinc-900">
                        {viewMemberModal.mobile_masked || (viewMemberModal.mobile ? `XXXXXX${viewMemberModal.mobile.slice(-4)}` : "N/A")}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</span>
                    {viewMemberModal.email_private || !viewMemberModal.email ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900">{viewMemberModal.email}</span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex-shrink-0">Address</span>
                    {viewMemberModal.address_private || !viewMemberModal.address ? (
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Hidden (Private)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900 text-right">{viewMemberModal.address}</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      const m = viewMemberModal;
                      setViewMemberModal(null);
                      handleOpenEdit(m);
                    }}
                    className="py-3 px-4 bg-amber-50 text-amber-800 border border-amber-300 font-bold rounded-2xl text-xs hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4 text-amber-600" /> Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      const m = viewMemberModal;
                      setViewMemberModal(null);
                      setMessageMemberModal(m);
                      setSenderName("");
                      setSenderMobile("");
                      setSenderEmail("");
                      setMessageReason("General Inquiry");
                      setMessageText("");
                      setMessageError("");
                      setMessageSuccessMsg("");
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl text-xs hover:from-amber-600 hover:to-orange-700 transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-4 h-4" /> Send Message
                  </button>
                  <button
                    onClick={() => setViewMemberModal(null)}
                    className="px-5 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-2xl text-sm hover:bg-zinc-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Send Message / Contact Request Form Modal */}
      <AnimatePresence>
        {messageMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full border border-zinc-200 shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Send Message to {messageMemberModal.first_name}</h3>
                </div>
                <button
                  onClick={() => setMessageMemberModal(null)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {messageSuccessMsg ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-zinc-900">Message Sent!</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed px-4">{messageSuccessMsg}</p>
                    <button
                      onClick={() => setMessageMemberModal(null)}
                      className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                ) : msgStep === "form" ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 text-amber-900 rounded-2xl text-xs font-medium border border-amber-200/70">
                      📩 Enter your contact details below. An OTP will be requested on your mobile number to verify your request to <strong>{messageMemberModal.first_name} {messageMemberModal.surname}</strong>.
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Gupta"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">Your Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          value={senderMobile}
                          onChange={(e) => setSenderMobile(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">Your Email (Optional)</label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Reason for Contacting</label>
                      <select
                        value={messageReason}
                        onChange={(e) => setMessageReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium text-zinc-800"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Community Networking">Community Networking</option>
                        <option value="Matrimonial Request">Matrimonial Request</option>
                        <option value="Business Opportunity">Business Opportunity</option>
                        <option value="Samaj Event Info">Samaj Event Info</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Message / Details *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Write your message here..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {messageError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {messageError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleSendMsgOtp}
                      disabled={msgSendingOtp}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {msgSendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Request OTP to Send Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitMessage} className="space-y-4">
                    <div className="p-3.5 bg-amber-50 text-amber-900 rounded-2xl text-xs font-medium border border-amber-200">
                      📲 Verification OTP sent to <strong>{senderMobile}</strong>. Please enter the 6-digit code below to dispatch your message.
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">6-Digit Verification OTP *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={msgOtp}
                        onChange={(e) => setMsgOtp(e.target.value)}
                        className="w-full px-3.5 py-3 border border-amber-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/30"
                      />
                    </div>

                    {messageError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {messageError}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setMsgStep("form")}
                        className="px-4 py-3 border border-zinc-200 text-zinc-700 font-bold rounded-xl text-xs hover:bg-zinc-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={sendingMessage}
                        className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {sendingMessage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Verify OTP &amp; Send Message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Non-member Registration Application Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full border border-zinc-200 shadow-2xl overflow-hidden my-8"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Apply for Agrawal Samaj Mansrovar Jaipur Membership</h3>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {regSuccessMsg ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-zinc-900">Application Submitted!</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed px-4">{regSuccessMsg}</p>
                    <button
                      onClick={() => setShowRegisterModal(false)}
                      className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : regStep === "details" ? (
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
                      <p className="font-bold text-amber-800 flex items-center gap-1.5 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> Agrawal Samaj Mansrovar Jaipur Membership Criteria & Rules:
                      </p>
                      <ul className="list-disc list-inside space-y-1 leading-relaxed text-amber-900/90 pl-1">
                        <li>Applicant must belong to the Agrawal / Vaishya community.</li>
                        <li>Valid mobile number and address are compulsory for identification.</li>
                        <li>All applications are cross-verified by the Agrawal Samaj Mansrovar Jaipur Executive Committee prior to approval.</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">First Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-700">Surname *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Agrawal / Garg"
                          value={regSurname}
                          onChange={(e) => setRegSurname(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Relation & Parent/Husband Name</label>
                      <div className="flex gap-2">
                        <select
                          value={regParentRelation}
                          onChange={(e) => setRegParentRelation(e.target.value)}
                          className="px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-semibold"
                        >
                          <option value="S/o">S/o</option>
                          <option value="D/o">D/o</option>
                          <option value="W/o">W/o</option>
                          <option value="C/o">C/o</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Agrawal"
                          value={regFatherName}
                          onChange={(e) => setRegFatherName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Profile Photo Image File Upload */}
                    <div className="space-y-1.5 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                      <label className="text-xs font-bold text-zinc-700 block">Profile Photo (Upload Image File)</label>
                      <div className="flex items-center gap-3">
                        {regPhotoUrl ? (
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-sm flex-shrink-0">
                            <img src={regPhotoUrl} alt="Profile Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setRegPhotoUrl("")}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                              title="Remove photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-amber-100/70 border border-dashed border-amber-400 flex flex-col items-center justify-center text-amber-700 flex-shrink-0">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">
                            {regUploadingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {regPhotoUrl ? "Change Image File" : "Choose Image File"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={regUploadingPhoto}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoFileUpload(file, setRegPhotoUrl, setRegUploadingPhoto, setRegError);
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-zinc-500">Formats: JPG, PNG, WEBP (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    {/* Profession / Business + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Profession / Occupation / Business</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regProfessionPrivate}
                            onChange={(e) => setRegProfessionPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Business Owner, Doctor, Engineer"
                        value={regProfession}
                        onChange={(e) => setRegProfession(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Native Place + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Where you belong from / Native Place</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regNativePlacePrivate}
                            onChange={(e) => setRegNativePlacePrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Agroha, Hisar, Jaipur, Mathura"
                        value={regNativePlace}
                        onChange={(e) => setRegNativePlace(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Personal Bio + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Personal Description / Bio</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regBioPrivate}
                            onChange={(e) => setRegBioPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Brief background, interests, community work..."
                        value={regBio}
                        onChange={(e) => setRegBio(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Mobile Number + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Mobile Number *</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regMobilePrivate}
                            onChange={(e) => setRegMobilePrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-mono"
                      />
                    </div>

                    {/* Email Address + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Email Address (Optional)</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regEmailPrivate}
                            onChange={(e) => setRegEmailPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Address + Privacy Toggle */}
                    <div className="space-y-1.5 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Address / Location</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-600 select-none">
                          <input
                            type="checkbox"
                            checked={regAddressPrivate}
                            onChange={(e) => setRegAddressPrivate(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>🔒 Hide on public directory</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Sector, Colony, City"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      />
                    </div>

                    {regError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {regError}
                      </p>
                    )}

                    <button
                      onClick={handleRegSendOtp}
                      disabled={regSendingOtp}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                      {regSendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Verify Mobile & Proceed
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs border border-emerald-200">
                      OTP sent to {regMobile}. Enter code to verify identity and submit application.
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Enter 6-Digit OTP Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value)}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {regError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {regError}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setRegStep("details")}
                        className="w-1/3 py-3 border border-zinc-200 text-zinc-600 text-xs font-bold rounded-xl hover:bg-zinc-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRegSubmit}
                        disabled={regSubmitting}
                        className="w-2/3 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {regSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Submit Application to Admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
