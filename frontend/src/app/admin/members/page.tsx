"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone, MapPin, ShieldAlert, Award, FileUser, MessageSquare, HandHeart, Undo2, Edit, X, Trash2, Camera, Upload, RefreshCw, Eye } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import { formatParentage } from "@/utils/member";
import { useRouter } from "next/navigation";

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
  family_name: string | null;
  family_code: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  mobile_private?: boolean;
  email_private?: boolean;
  address_private?: boolean;
  profession_private?: boolean;
  native_place_private?: boolean;
  bio_private?: boolean;
  role: string;
  is_member: boolean;
}

const MEMBER_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  shifted: { label: "Shifted", className: "bg-amber-50 text-amber-700 border-amber-100" },
  expired: { label: "Expired", className: "bg-rose-50 text-rose-700 border-rose-100" },
  sold_out: { label: "Sold Out", className: "bg-orange-50 text-orange-700 border-orange-100" },
  shifted_sold_out: { label: "Shifted · Sold Out", className: "bg-purple-50 text-purple-700 border-purple-100" },
  double_name: { label: "Double Name", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function getStatusBadge(status: string | null | undefined) {
  if (!status || status === "active") return null;
  return MEMBER_STATUS_BADGE[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600 border-zinc-200" };
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // View Details Modal State
  const [viewMemberModal, setViewMemberModal] = useState<Member | null>(null);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    setUploadingPhoto(true);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${getApiBaseUrl()}/membership/upload-photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
      setEditForm(prev => ({ ...prev, profile_photo: `${baseUrl}${res.data.url}` }));
    } catch (err: any) {
      console.error("Photo upload failed", err);
      setEditError("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Send Message Modal State
  const [messageMember, setMessageMember] = useState<Member | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageReason, setMessageReason] = useState("General Inquiry");
  const [senderName, setSenderName] = useState("Administrator");
  const [senderMobile, setSenderMobile] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState("");
  const [msgError, setMsgError] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${getApiBaseUrl()}/membership/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, role: "volunteer" | "member") => {
    setUpdatingUserId(userId);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${getApiBaseUrl()}/membership/users/${userId}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
    } catch (error) {
      console.error("Failed to update role", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenEditModal = (m: Member) => {
    setEditingMember(m);
    setEditForm({
      first_name: m.first_name || "",
      surname: m.surname || "",
      father_name: m.father_name || "",
      mobile: m.mobile || "",
      email: m.email || "",
      address: m.address || "",
      family_relation: m.family_relation || "",
      samaj_id: m.samaj_id || "",
      lm_no: m.lm_no || undefined,
      zone: m.zone || "",
      house_no: m.house_no || "",
      member_status: m.member_status || "active",
      profession: m.profession || "",
      native_place: m.native_place || "",
      bio: m.bio || "",
      profile_photo: m.profile_photo || "",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      const token = localStorage.getItem("token");
      const payload: any = { ...editForm };
      if (payload.lm_no === "" || payload.lm_no === null || payload.lm_no === undefined) {
        payload.lm_no = null;
      } else {
        payload.lm_no = Number(payload.lm_no);
      }

      await axios.put(
        `${getApiBaseUrl()}/membership/users/${editingMember.user_id}/admin-update`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || "Failed to update member.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenMessageModal = (m: Member) => {
    setMessageMember(m);
    setMessageText("");
    setMessageReason("General Inquiry");
    setMsgSuccess("");
    setMsgError("");
    
    // Attempt to pre-fill admin details
    setSenderName("Administrator");
    setSenderMobile("");
    setSenderEmail("");
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageMember) return;
    if (!senderName.trim() || !senderMobile.trim() || !messageText.trim()) {
      setMsgError("Name, Mobile, and Message are required.");
      return;
    }
    setSendingMsg(true);
    setMsgError("");
    setMsgSuccess("");
    try {
      const payload = {
        recipient_user_id: messageMember.user_id,
        sender_name: senderName.trim(),
        sender_mobile: senderMobile.trim(),
        sender_email: senderEmail.trim() || null,
        reason: messageReason,
        message: messageText.trim(),
      };
      const res = await axios.post(`${getApiBaseUrl()}/membership/contact-member`, payload);
      setMsgSuccess(res.data.message || "Message request delivered successfully.");
    } catch (err: any) {
      setMsgError(err.response?.data?.detail || "Failed to send message request.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this member? All their booking records, event registrations, and details will be deleted permanently.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${getApiBaseUrl()}/membership/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMembers();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to delete member.");
    }
  };

  const filteredMembers = members.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const haystack = [
      m.first_name,
      m.surname,
      m.father_name,
      m.email,
      m.mobile,
      m.samaj_id,
      m.lm_no != null ? String(m.lm_no) : "",
      m.zone,
      m.house_no,
      m.profession,
      m.native_place,
      m.bio,
      m.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Manage Directory</h1>
          <p className="text-sm text-zinc-500 mt-1">Full view of Samaj members, including contact details and address details.</p>
        </div>
        <div className="px-4 py-2 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl border border-amber-200">
          Total Members: {filteredMembers.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search members by name, Samaj ID, email or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading member directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No members found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredMembers.map((m) => {
              const initials = `${m.first_name.charAt(0)}${m.surname.charAt(0)}`.toUpperCase();
              return (
                <div key={m.user_id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {m.profile_photo ? (
                        <img 
                          src={m.profile_photo} 
                          alt={`${m.first_name} ${m.surname}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-zinc-900 text-base">{m.first_name} {m.surname}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {m.samaj_id && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              <Award className="w-3.5 h-3.5" /> {m.samaj_id}
                            </span>
                          )}
                          {(() => {
                            const badge = getStatusBadge(m.member_status);
                            return badge ? (
                              <span className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${badge.className}`}>
                                {badge.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {formatParentage(m.father_name) && <p className="text-xs text-zinc-500 mt-1">{formatParentage(m.father_name)}</p>}
                        {m.profession && <p className="text-xs text-zinc-500 mt-1 italic">{m.profession}</p>}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-3 space-y-2.5 text-sm">
                      {m.family_name && (
                        <div className="flex items-center gap-2 text-zinc-600">
                          <FileUser className="w-4 h-4 text-zinc-400" />
                          <span>{m.family_name} ({m.family_relation || 'Member'})</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        <span className="break-all">{m.email || 'No email provided'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-600">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        <span>{m.mobile || 'No phone provided'}</span>
                      </div>

                      <div className="flex items-start gap-2 text-zinc-600">
                        <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <span className="line-clamp-2">{m.address || 'No address configured'}</span>
                      </div>

                      {m.native_place && (
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <span className="font-semibold text-zinc-500">Origin:</span>
                          <span>🚩 {m.native_place}</span>
                        </div>
                      )}

                      {m.bio && (
                        <div className="flex items-start gap-2 text-xs text-zinc-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          <span className="line-clamp-2">"{m.bio}"</span>
                        </div>
                      )}

                      {(m.zone || m.house_no) && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {m.zone && <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200"><span className="font-semibold">Zone:</span> {m.zone}</span>}
                          {m.house_no && <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200"><span className="font-semibold">House:</span> {m.house_no}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMemberModal(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-600" /> View Details
                      </button>
                      <button
                        onClick={() => handleOpenMessageModal(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(m.user_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                      {m.role === 'volunteer' ? (
                        <button
                          onClick={() => updateRole(m.user_id, 'member')}
                          disabled={updatingUserId === m.user_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Revoke Volunteer
                        </button>
                      ) : m.role === 'member' ? (
                        <button
                          onClick={() => updateRole(m.user_id, 'volunteer')}
                          disabled={updatingUserId === m.user_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <HandHeart className="w-3.5 h-3.5" /> Make Volunteer
                        </button>
                      ) : null}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      m.role === 'volunteer' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {m.role === 'volunteer' ? 'Volunteer' : 'Active Member'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Member Details Form */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg text-zinc-900">Edit Member Details</h3>
                <p className="text-xs text-zinc-500">Edit core, contact, zone and household attributes.</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="p-1 rounded-lg hover:bg-zinc-100">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {editError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Profile Photo File Upload */}
              <div className="space-y-1.5 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                <label className="text-xs font-bold text-zinc-700 block">Profile Photo (Upload Image File)</label>
                <div className="flex items-center gap-4">
                  {editForm.profile_photo ? (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-sm flex-shrink-0">
                      <img src={editForm.profile_photo} alt="Profile Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, profile_photo: "" }))}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-amber-100/70 border border-dashed border-amber-400 flex flex-col items-center justify-center text-amber-700 flex-shrink-0">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">
                      {uploadingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {editForm.profile_photo ? "Change Image File" : "Choose Image File"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoFileUpload(file);
                        }}
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500">Formats: JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Core Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Core Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">First Name *</label>
                    <input required type="text" value={editForm.first_name || ""} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Surname *</label>
                    <input required type="text" value={editForm.surname || ""} onChange={e => setEditForm({...editForm, surname: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Father's / Husband's Name</label>
                    <input type="text" value={editForm.father_name || ""} onChange={e => setEditForm({...editForm, father_name: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Samaj ID</label>
                    <input type="text" value={editForm.samaj_id || ""} onChange={e => setEditForm({...editForm, samaj_id: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Life Member No (LM No)</label>
                    <input type="number" value={editForm.lm_no === undefined ? "" : editForm.lm_no ?? ""} onChange={e => setEditForm({...editForm, lm_no: e.target.value ? Number(e.target.value) : null})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Relation to Head</label>
                    <select
                      value={editForm.family_relation || ""}
                      onChange={e => setEditForm({...editForm, family_relation: e.target.value})}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white"
                    >
                      <option value="">Select Relation...</option>
                      <option value="Self">Self / स्वयं (Head)</option>
                      <option value="Spouse">Spouse / पति-पत्नी</option>
                      <option value="Son">Son / पुत्र</option>
                      <option value="Daughter">Daughter / पुत्री</option>
                      <option value="Daughter-in-law">Daughter-in-law / पुत्रवधू</option>
                      <option value="Grandson">Grandson / पौत्र</option>
                      <option value="Granddaughter">Granddaughter / पौत्री</option>
                      <option value="Father">Father / पिता</option>
                      <option value="Mother">Mother / माता</option>
                      <option value="Brother">Brother / भाई</option>
                      <option value="Sister">Sister / बहन</option>
                      <option value="Other">Other / अन्य</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Mobile Phone</label>
                    <input type="tel" value={editForm.mobile || ""} onChange={e => setEditForm({...editForm, mobile: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Email Address</label>
                    <input type="email" value={editForm.email || ""} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Residential Address</label>
                    <input type="text" value={editForm.address || ""} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                </div>
              </div>

              {/* Geographic & Status */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Colony Zone & Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Colony Zone</label>
                    <input type="text" value={editForm.zone || ""} onChange={e => setEditForm({...editForm, zone: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">House Number</label>
                    <input type="text" value={editForm.house_no || ""} onChange={e => setEditForm({...editForm, house_no: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Member Status</label>
                    <select
                      value={editForm.member_status || "active"}
                      onChange={e => setEditForm({...editForm, member_status: e.target.value})}
                      className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white"
                    >
                      <option value="active">Active / सक्रिय</option>
                      <option value="shifted">Shifted / स्थान्तरित</option>
                      <option value="expired">Expired / दिवंगत</option>
                      <option value="sold_out">Sold Out / मकान बिका</option>
                      <option value="shifted_sold_out">Shifted & Sold Out</option>
                      <option value="double_name">Double Name / दोहरा नाम</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Extra Professional details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Background Profile Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Profession / Occupation</label>
                    <input type="text" value={editForm.profession || ""} onChange={e => setEditForm({...editForm, profession: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Native Place / Origin</label>
                    <input type="text" value={editForm.native_place || ""} onChange={e => setEditForm({...editForm, native_place: e.target.value})} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Bio Note</label>
                    <textarea value={editForm.bio || ""} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={2} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white z-10 py-3">
                <button type="button" onClick={() => setEditingMember(null)} className="px-5 py-2 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-zinc-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Send Message Request (replacing chat redirect) */}
      {messageMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg">Message {messageMember.first_name}</h3>
              </div>
              <button onClick={() => setMessageMember(null)} className="p-1 rounded-lg hover:bg-zinc-100">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {msgSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mx-auto">✓</div>
                <h4 className="text-xl font-bold text-zinc-950">Message Sent!</h4>
                <p className="text-sm text-zinc-500 leading-relaxed px-4">{msgSuccess}</p>
                <button onClick={() => setMessageMember(null)} className="px-6 py-2 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 text-sm cursor-pointer mt-4">
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleMessageSubmit} className="p-6 space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                  ✉️ This will send a WhatsApp/SMS alert directly to <strong>{messageMember.first_name} {messageMember.surname}</strong> with your contact information.
                </p>

                {msgError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-xl">
                    {msgError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Sender Name *</label>
                  <input required type="text" value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Sender Mobile (WhatsApp Number) *</label>
                  <input required type="tel" value={senderMobile} onChange={e => setSenderMobile(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" placeholder="e.g. 9876543210" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Sender Email (Optional)</label>
                  <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Reason for Inquiry</label>
                  <select
                    value={messageReason}
                    onChange={e => setMessageReason(e.target.value)}
                    className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Matrimonial Query">Matrimonial Query</option>
                    <option value="Business Inquiry">Business Inquiry</option>
                    <option value="Verification Assistance">Verification Assistance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Your Message *</label>
                  <textarea required rows={3} value={messageText} onChange={e => setMessageText(e.target.value)} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:border-amber-500 text-sm bg-white" placeholder="Type your message details here..." />
                </div>

                <div className="pt-4 border-t flex justify-end gap-3 py-1">
                  <button type="button" onClick={() => setMessageMember(null)} className="px-5 py-2 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-zinc-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={sendingMsg} className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
                    {sendingMsg ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-zinc-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewMemberModal.profile_photo ? (
                  <img src={viewMemberModal.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/40" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    {viewMemberModal.first_name?.[0]}{viewMemberModal.surname?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg leading-tight">{viewMemberModal.first_name} {viewMemberModal.surname}</h3>
                  <p className="text-xs text-amber-100">{viewMemberModal.samaj_id || "Samaj Member"}</p>
                </div>
              </div>
              <button onClick={() => setViewMemberModal(null)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm divide-y divide-zinc-100 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Full Name</p>
                  <p className="font-bold text-zinc-900 mt-0.5">{viewMemberModal.first_name} {viewMemberModal.surname}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Samaj ID</p>
                  <p className="font-mono font-bold text-amber-700 mt-0.5">{viewMemberModal.samaj_id || "Pending"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Father / Guardian</p>
                  <p className="font-semibold text-zinc-800 mt-0.5">{formatParentage(viewMemberModal.father_name) || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">LM No.</p>
                  <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.lm_no || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Mobile Number</p>
                  <p className="font-mono font-semibold text-zinc-800 mt-0.5">{viewMemberModal.mobile || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Email Address</p>
                  <p className="font-medium text-zinc-800 mt-0.5 break-all">{viewMemberModal.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Profession / Business</p>
                  <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.profession || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Native Place / Origin</p>
                  <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.native_place || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Zone</p>
                  <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.zone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-semibold uppercase">House No.</p>
                  <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.house_no || "N/A"}</p>
                </div>
              </div>

              <div className="pt-3">
                <p className="text-xs text-zinc-400 font-semibold uppercase">Residential Address</p>
                <p className="font-medium text-zinc-800 mt-0.5">{viewMemberModal.address || "No address configured"}</p>
              </div>

              {viewMemberModal.bio && (
                <div className="pt-3">
                  <p className="text-xs text-zinc-400 font-semibold uppercase">Bio / Note</p>
                  <p className="font-medium text-zinc-700 italic mt-0.5 bg-amber-50 p-2.5 rounded-xl border border-amber-100">"{viewMemberModal.bio}"</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setViewMemberModal(null)}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
