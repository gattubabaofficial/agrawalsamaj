"use client";

import { Users, Plus, Link as LinkIcon, CheckCircle, ShieldAlert, X, Loader2, Edit2, Trash2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

export default function FamilyPage() {
  const router = useRouter();
  
  const handleAuthError = (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      router.push("/login");
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "create" | "join">("overview");
  
  const [isLoading, setIsLoading] = useState(true);
  const [familyData, setFamilyData] = useState<any>(null);
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [pendingCreationRequest, setPendingCreationRequest] = useState<any>(null);

  // Create Form
  const [createName, setCreateName] = useState("");
  const [createMemberLimit, setCreateMemberLimit] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createSurname, setCreateSurname] = useState("");
  const [createMobile, setCreateMobile] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createProfession, setCreateProfession] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createProfilePhoto, setCreateProfilePhoto] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isUploadingCreatePhoto, setIsUploadingCreatePhoto] = useState(false);

  const [createMembers, setCreateMembers] = useState<any[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberSurname, setNewMemberSurname] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("");
  const [newMemberMobile, setNewMemberMobile] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberProfession, setNewMemberProfession] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [newMemberPhoto, setNewMemberPhoto] = useState("");
  const [isUploadingNewMemberPhoto, setIsUploadingNewMemberPhoto] = useState(false);
  
  // Join Form
  const [joinCode, setJoinCode] = useState("");
  const [joinRelation, setJoinRelation] = useState("");

  // Edit Member States
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Add/Edit Family Member Form States
  const [memberFormData, setMemberFormData] = useState({
    first_name: "",
    surname: "",
    relation: "",
    mobile: "",
    email: "",
    profession: "",
    address: "",
    mobile_private: false,
    email_private: false,
    profile_photo: ""
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchFamily();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingPhoto(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${getApiBaseUrl()}/family/upload-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setMemberFormData(prev => ({ ...prev, profile_photo: res.data.photo_url }));
      alert("Photo uploaded successfully!");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the family?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${getApiBaseUrl()}/family/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Family member removed successfully.");
      if (editingMember && editingMember.user_id === memberId) {
        handleCancelEdit();
      }
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to remove member");
    }
  };

  const handleEditClick = (member: any) => {
    setEditingMember(member);
    setMemberFormData({
      first_name: member.first_name || "",
      surname: member.surname || "",
      relation: member.relation || "",
      mobile: member.mobile || "",
      email: member.email || "",
      profession: member.profession || "",
      address: member.address || "",
      mobile_private: member.mobile_private || false,
      email_private: member.email_private || false,
      profile_photo: member.profile_photo || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setMemberFormData({
      first_name: "",
      surname: "",
      relation: "",
      mobile: "",
      email: "",
      profession: "",
      address: "",
      mobile_private: false,
      email_private: false,
      profile_photo: ""
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: If profession is NOT "student" (case-insensitive), mobile and email are required.
    const isStudent = memberFormData.profession.trim().toLowerCase() === "student";
    if (!isStudent) {
      if (!memberFormData.mobile.trim() || !memberFormData.email.trim()) {
        alert("Mobile number and Email address are compulsory for non-student members.");
        return;
      }
    }

    if (editingMember) {
      if (editingMember.is_head) {
        setIsSavingProfile(true);
        try {
          const token = localStorage.getItem("token");
          await axios.put(`${getApiBaseUrl()}/auth/profile`, {
            first_name: memberFormData.first_name,
            surname: memberFormData.surname,
            profession: memberFormData.profession || null,
            mobile: memberFormData.mobile || null,
            email: memberFormData.email || null,
            address: memberFormData.address || null,
            mobile_private: memberFormData.mobile_private,
            email_private: memberFormData.email_private,
            profile_photo: memberFormData.profile_photo || null
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          alert("Personal details updated successfully!");
          handleCancelEdit();
          fetchFamily();
        } catch (error: any) {
          alert(error.response?.data?.detail || "Failed to save personal details.");
        } finally {
          setIsSavingProfile(false);
        }
      } else {
        setIsAddingMember(true);
        try {
          const token = localStorage.getItem("token");
          await axios.put(`${getApiBaseUrl()}/family/members/${editingMember.user_id}`, {
            first_name: memberFormData.first_name,
            surname: memberFormData.surname,
            relation: memberFormData.relation,
            mobile: memberFormData.mobile || null,
            email: memberFormData.email || null,
            profession: memberFormData.profession || null,
            address: memberFormData.address || null,
            mobile_private: memberFormData.mobile_private,
            email_private: memberFormData.email_private,
            profile_photo: memberFormData.profile_photo || null
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          alert("Family member details updated successfully!");
          handleCancelEdit();
          fetchFamily();
        } catch (error: any) {
          alert(error.response?.data?.detail || "Failed to update member details.");
        } finally {
          setIsAddingMember(false);
        }
      }
    } else {
      if (!memberFormData.relation) {
        alert("Please select a relation to the family head.");
        return;
      }
      setIsAddingMember(true);
      try {
        const token = localStorage.getItem("token");
        await axios.post(`${getApiBaseUrl()}/family/members`, {
          first_name: memberFormData.first_name,
          surname: memberFormData.surname,
          relation: memberFormData.relation,
          mobile: memberFormData.mobile || null,
          email: memberFormData.email || null,
          profession: memberFormData.profession || null,
          address: memberFormData.address || null,
          mobile_private: memberFormData.mobile_private,
          email_private: memberFormData.email_private,
          profile_photo: memberFormData.profile_photo || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Family member added successfully!");
        handleCancelEdit();
        fetchFamily();
      } catch (error: any) {
        alert(error.response?.data?.detail || "Failed to add family member.");
      } finally {
        setIsAddingMember(false);
      }
    }
  };

  const handleDeleteFamily = async () => {
    const confirmMsg = "WARNING: Dissolving your family is permanent. All family members will be detached from your family group, and your family code will be invalidated. Are you absolutely sure you want to delete this family?";
    if (!confirm(confirmMsg)) return;
    
    const doubleConfirm = prompt("To confirm deletion, please type 'DELETE' below:");
    if (doubleConfirm !== "DELETE") {
      alert("Deletion cancelled. The typed confirmation was incorrect.");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${getApiBaseUrl()}/family`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Family dissolved successfully.");
      handleCancelEdit();
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to delete family.");
    }
  };

  const fetchFamily = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      // Try to get the user's current family
      try {
        const res = await axios.get(`${getApiBaseUrl()}/family/me`, { headers });
        setFamilyData(res.data);
        setPendingCreationRequest(null);
        
        if (res.data.is_head) {
          const reqs = await axios.get(`${getApiBaseUrl()}/family/requests`, { headers });
          setRequestsData(reqs.data);
        }
      } catch (familyError: any) {
        handleAuthError(familyError);
        setFamilyData(null);
        if (familyError.response?.status === 404) {
          // No family yet — check if there's a pending creation request
          try {
            const userRes = await axios.get(`${getApiBaseUrl()}/auth/me`, { headers });
            // We'll check pending creation request via membership endpoint (admin-only)
            // Instead store in local state from create response
          } catch {}
        } else {
          console.error("Failed to fetch family", familyError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingCreatePhoto(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${getApiBaseUrl()}/family/upload-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setCreateProfilePhoto(res.data.photo_url);
      alert("Photo uploaded successfully!");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to upload photo.");
    } finally {
      setIsUploadingCreatePhoto(false);
    }
  };

  const handleFirstNameChange = (val: string) => {
    setCreateFirstName(val);
    setCreateName(`${val} ${createSurname} Parivar`.trim());
  };

  const handleSurnameChange = (val: string) => {
    setCreateSurname(val);
    setCreateName(`${createFirstName} ${val} Parivar`.trim());
  };

  useEffect(() => {
    if (activeTab === "create") {
      const fetchProfileForCreate = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${getApiBaseUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const user = res.data;
          setCreateFirstName(user.first_name || "");
          setCreateSurname(user.surname || "");
          setCreateMobile(user.mobile || "");
          setCreateEmail(user.email || "");
          setCreateProfession(user.profession || "");
          setCreateAddress(user.address || "");
          setCreateProfilePhoto(user.profile_photo || "");
          
          const defaultFamilyName = `${user.first_name || ""} ${user.surname || ""} Parivar`.trim();
          setCreateName(defaultFamilyName);
        } catch (error) {
          handleAuthError(error);
          console.error("Failed to fetch user profile for family creation", error);
        }
      };
      fetchProfileForCreate();
    }
  }, [activeTab]);

  const handleNewMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingNewMemberPhoto(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${getApiBaseUrl()}/family/upload-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setNewMemberPhoto(res.data.photo_url);
      alert("Photo uploaded successfully!");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to upload photo.");
    } finally {
      setIsUploadingNewMemberPhoto(false);
    }
  };

  const handleAddMemberToList = () => {
    if (!newMemberFirstName.trim() || !newMemberSurname.trim() || !newMemberRelation) {
      alert("First Name, Last Name, and Relation to Head are required fields.");
      return;
    }

    const isStudent = newMemberProfession.trim().toLowerCase() === "student";
    if (!isStudent) {
      if (!newMemberMobile.trim() || !newMemberEmail.trim()) {
        alert("Mobile number and Email address are compulsory for non-student family members.");
        return;
      }
    }

    const newM = {
      first_name: newMemberFirstName.trim(),
      surname: newMemberSurname.trim(),
      relation: newMemberRelation,
      mobile: newMemberMobile.trim(),
      email: newMemberEmail.trim(),
      profession: newMemberProfession.trim(),
      address: newMemberAddress.trim(),
      profile_photo: newMemberPhoto
    };

    setCreateMembers([...createMembers, newM]);
    
    setNewMemberFirstName("");
    setNewMemberSurname("");
    setNewMemberRelation("");
    setNewMemberMobile("");
    setNewMemberEmail("");
    setNewMemberProfession("");
    setNewMemberAddress("");
    setNewMemberPhoto("");
    setShowAddMemberModal(false);
  };

  const handleRemoveMemberFromList = (index: number) => {
    setCreateMembers(createMembers.filter((_, i) => i !== index));
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    try {
      const token = localStorage.getItem("token");
      
      const isStudent = createProfession.trim().toLowerCase() === "student";
      if (!isStudent) {
        if (!createMobile.trim() || !createEmail.trim()) {
          alert("Mobile number and Email address are compulsory for non-student heads.");
          setIsSubmittingCreate(false);
          return;
        }
      }

      const limitNum = createMemberLimit ? parseInt(createMemberLimit, 10) : null;
      const totalCount = 1 + createMembers.length;
      if (limitNum !== null && totalCount > limitNum) {
        alert(`The number of members (${totalCount}) exceeds the specified limit of ${limitNum}.`);
        setIsSubmittingCreate(false);
        return;
      }

      const payload = {
        family_name: createName.trim(),
        member_limit: limitNum,
        first_name: createFirstName.trim(),
        surname: createSurname.trim(),
        mobile: createMobile.trim() || null,
        email: createEmail.trim() || null,
        profession: createProfession.trim() || null,
        address: createAddress.trim() || null,
        profile_photo: createProfilePhoto || null,
        members: createMembers.map(m => ({
          first_name: m.first_name,
          surname: m.surname,
          relation: m.relation,
          mobile: m.mobile || null,
          email: m.email || null,
          profession: m.profession || null,
          address: m.address || null,
          profile_photo: m.profile_photo || null
        }))
      };

      const res = await axios.post(`${getApiBaseUrl()}/family/create`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Set pending state instead of refreshing family
      setPendingCreationRequest({
        family_name: createName.trim(),
        member_count: 1 + createMembers.length,
        request_id: res.data.request_id
      });
      setActiveTab("overview");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to submit family creation request");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/family/join?family_code=${encodeURIComponent(joinCode)}&relation=${encodeURIComponent(joinRelation)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Family joined successfully!");
      setJoinCode("");
      setJoinRelation("");
      setActiveTab("overview");
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to join family");
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${getApiBaseUrl()}/family/requests/${requestId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Request ${action}d successfully`);
      fetchFamily();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to process request");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const isStudent = (memberFormData.profession || "").trim().toLowerCase() === "student";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Family Management</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your family profile and registered members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!familyData ? (
            <div className="space-y-4">
              {/* Pending Family Creation Banner */}
              {pendingCreationRequest && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-amber-900">Family Creation Request Pending</h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Your request to create <span className="font-semibold">&quot;{pendingCreationRequest.family_name}&quot;</span> with {pendingCreationRequest.member_count} member{pendingCreationRequest.member_count > 1 ? "s" : ""} is awaiting admin approval.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">Once approved, your family will be created and you will be upgraded to a full Member.</p>
                  </div>
                </div>
              )}

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="border-b border-zinc-200 bg-zinc-50/50 p-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "overview" ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
                  >
                    Getting Started
                  </button>
                  <button 
                    onClick={() => setActiveTab("create")}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "create" ? "bg-white text-amber-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-amber-600 hover:bg-amber-50"}`}
                  >
                    Create Family
                  </button>
                  <button 
                    onClick={() => setActiveTab("join")}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "join" ? "bg-white text-amber-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-amber-600 hover:bg-amber-50"}`}
                  >
                    Join Family
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-10">
                {activeTab === "overview" && (
                  <div className="text-center max-w-2xl mx-auto py-8">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-6">
                      <Users className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-3">You are not in a Family</h2>
                    <p className="text-zinc-600 mb-8">
                      Registered Samaj members can create a new family group or join an existing one. Once joined, you can manage event passes and bookings together.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button onClick={() => setActiveTab("create")} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm transition-colors">
                        Create New Family
                      </button>
                      <button onClick={() => setActiveTab("join")} className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
                        Join Existing Family
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "create" && (
                  <form className="max-w-xl mx-auto space-y-6" onSubmit={handleCreateFamily}>
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold text-zinc-900">Create a New Family</h2>
                      <p className="text-sm text-zinc-500 mt-1">Fill in the details below and submit. Your request will go to the admin for approval. Once approved, your family will be created and you&apos;ll be upgraded to a Member.</p>
                    </div>

                    <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 p-6 space-y-4">
                      <h3 className="font-bold text-sm text-amber-900 border-b border-amber-200/50 pb-2">Family Details</h3>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Family Name <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required 
                          value={createName} 
                          onChange={e => setCreateName(e.target.value)} 
                          placeholder="e.g. Ramesh Agrawal Parivar" 
                          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 flex justify-between">
                          <span>Total Family Members Limit (Optional)</span>
                          <span className="text-[10px] text-zinc-400 font-normal">Limits how many members can join</span>
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          value={createMemberLimit} 
                          onChange={e => setCreateMemberLimit(e.target.value)} 
                          placeholder="e.g. 5" 
                          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs" 
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
                      <h3 className="font-bold text-sm text-zinc-955 border-b border-zinc-100 pb-2">Your Personal Details (Family Head)</h3>

                      <div className="space-y-2 text-xs">
                        <label className="font-semibold text-zinc-700 block">Profile Photo</label>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {createProfilePhoto ? (
                              <img 
                                src={createProfilePhoto.startsWith("http") ? createProfilePhoto : `${getApiBaseUrl()}${createProfilePhoto}`} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-zinc-400" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="inline-flex items-center px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg cursor-pointer transition-colors shadow-sm gap-1 text-[10px] font-semibold">
                              {isUploadingCreatePhoto ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Upload Photo
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleCreatePhotoUpload} 
                                className="hidden" 
                                disabled={isUploadingCreatePhoto}
                              />
                            </label>
                            {createProfilePhoto && (
                              <button
                                type="button"
                                onClick={() => setCreateProfilePhoto("")}
                                className="block text-rose-600 hover:text-rose-700 hover:underline transition-colors mt-0.5 text-[9px]"
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-700">First Name <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={createFirstName}
                            onChange={(e) => handleFirstNameChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="First Name"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-700">Last Name / Surname <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={createSurname}
                            onChange={(e) => handleSurnameChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Surname"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-700 flex justify-between">
                            <span>Phone Number {!(createProfession.trim().toLowerCase() === "student") && <span className="text-rose-500">*</span>}</span>
                          </label>
                          <input
                            type="tel"
                            value={createMobile}
                            onChange={(e) => setCreateMobile(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Phone Number"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-700 flex justify-between">
                            <span>Email ID {!(createProfession.trim().toLowerCase() === "student") && <span className="text-rose-500">*</span>}</span>
                          </label>
                          <input
                            type="email"
                            value={createEmail}
                            onChange={(e) => setCreateEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Email ID"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-semibold text-zinc-700">Profession (Optional)</label>
                        <input
                          type="text"
                          value={createProfession}
                          onChange={(e) => setCreateProfession(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. Business, Engineer, Student"
                        />
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-semibold text-zinc-700">Address (Optional)</label>
                        <textarea
                          value={createAddress}
                          onChange={(e) => setCreateAddress(e.target.value)}
                          rows={2}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="Your residential address"
                        />
                      </div>
                    </div>

                    {/* Batch Add Members Section */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <h3 className="font-bold text-sm text-zinc-955">Family Members (Optional)</h3>
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">
                          {createMembers.length} Added
                        </span>
                      </div>

                      {/* Members List */}
                      {createMembers.length > 0 && (
                        <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden bg-zinc-50/30">
                          {createMembers.map((m, idx) => (
                            <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs uppercase overflow-hidden flex-shrink-0">
                                  {m.profile_photo ? (
                                    <img src={m.profile_photo.startsWith("http") ? m.profile_photo : `${getApiBaseUrl()}${m.profile_photo}`} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    m.first_name.substring(0, 2)
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-zinc-900">{m.first_name} {m.surname}</h4>
                                  <p className="text-[10px] text-zinc-500">{m.relation} {m.profession ? `• ${m.profession}` : ""}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFromList(idx)}
                                className="p-1 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Member Sub-Form Toggle */}
                      {!showAddMemberModal ? (
                        <button
                          type="button"
                          onClick={() => setShowAddMemberModal(true)}
                          className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-zinc-500" />
                          Add a Family Member
                        </button>
                      ) : (
                        <div className="bg-zinc-50/50 border border-zinc-200/80 rounded-xl p-4 space-y-4 text-xs font-medium">
                          <div className="flex items-center justify-between border-b border-zinc-200/50 pb-2">
                            <span className="font-bold text-zinc-800">Add Member Details</span>
                            <button
                              type="button"
                              onClick={() => setShowAddMemberModal(false)}
                              className="text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Member Profile Photo */}
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-700 block">Member Photo</label>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {newMemberPhoto ? (
                                  <img src={newMemberPhoto.startsWith("http") ? newMemberPhoto : `${getApiBaseUrl()}${newMemberPhoto}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-5 h-5 text-zinc-400" />
                                )}
                              </div>
                              <label className="inline-flex items-center px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg cursor-pointer transition-colors shadow-sm gap-1 text-[10px] font-semibold">
                                {isUploadingNewMemberPhoto ? "Uploading..." : "Upload Photo"}
                                <input type="file" accept="image/*" onChange={handleNewMemberPhotoUpload} className="hidden" disabled={isUploadingNewMemberPhoto} />
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-zinc-700">First Name *</label>
                              <input type="text" value={newMemberFirstName} onChange={e => setNewMemberFirstName(e.target.value)} placeholder="First Name" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-700">Last Name / Surname *</label>
                              <input type="text" value={newMemberSurname} onChange={e => setNewMemberSurname(e.target.value)} placeholder="Surname" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-zinc-700">Relation to Head *</label>
                              <select value={newMemberRelation} onChange={e => setNewMemberRelation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white">
                                <option value="">Select...</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Parent">Parent</option>
                                <option value="Sibling">Sibling</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-700">Profession (Optional)</label>
                              <input type="text" value={newMemberProfession} onChange={e => setNewMemberProfession(e.target.value)} placeholder="e.g. Student, Engineer" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-zinc-700">
                                Phone Number {!(newMemberProfession.trim().toLowerCase() === "student") && "*"}
                              </label>
                              <input type="tel" value={newMemberMobile} onChange={e => setNewMemberMobile(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-700">
                                Email ID {!(newMemberProfession.trim().toLowerCase() === "student") && "*"}
                              </label>
                              <input type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-700">Address (Optional)</label>
                            <input type="text" value={newMemberAddress} onChange={e => setNewMemberAddress(e.target.value)} placeholder="Member's address" className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" />
                          </div>

                          <div className="flex gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddMemberModal(false)}
                              className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddMemberToList}
                              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Add to List
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                      <p>Upon creation, a unique Family Code will be generated. Share this code with your family members so they can join.</p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingCreate || isUploadingCreatePhoto}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {isSubmittingCreate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting Request...
                        </>
                      ) : (
                        "Submit Family Creation Request"
                      )}
                    </button>
                  </form>
                )}

                {activeTab === "join" && (
                  <form className="max-w-xl mx-auto space-y-6" onSubmit={handleJoinFamily}>
                    <div className="text-center mb-8">
                      <h2 className="text-xl font-bold text-zinc-900">Join an Existing Family</h2>
                      <p className="text-sm text-zinc-500 mt-1">Enter the unique Family Code provided by your family head.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Family Code</label>
                      <input type="text" required value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. FAM-1A2B3C" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm font-mono uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Your Relation to Head</label>
                      <select required value={joinRelation} onChange={e => setJoinRelation(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm bg-white">
                        <option value="">Select Relation...</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
                      Join Family
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">{familyData.family_name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                      Code: {familyData.family_code}
                    </span>
                    <span className="text-sm text-zinc-500 font-medium">
                      {familyData.members.length}{familyData.member_limit ? ` / ${familyData.member_limit}` : ""} Members
                    </span>
                  </div>
                </div>
                {familyData.is_head && (
                  <div className="flex flex-wrap gap-2.5">
                    <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer">
                      <Plus className="w-4 h-4" /> Share Code
                    </button>
                    <button 
                      onClick={handleDeleteFamily}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Family
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
                  <h3 className="font-semibold text-zinc-900">Family Members</h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {familyData.members.map((member: any) => (
                    <div key={member.user_id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm uppercase overflow-hidden flex-shrink-0">
                          {member.profile_photo ? (
                            <img 
                              src={member.profile_photo.startsWith("http") ? member.profile_photo : `${getApiBaseUrl()}${member.profile_photo}`} 
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            member.name.substring(0, 2)
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-zinc-900">{member.name}</h4>
                          <p className="text-xs text-zinc-500">Samaj ID: {member.samaj_id || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${member.is_head ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                          {member.relation}
                        </span>
                        
                        {familyData.is_head && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEditClick(member)}
                              className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title={member.is_head ? "Edit Profile Details" : "Edit Member Details"}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!member.is_head && (
                              <button 
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {familyData.is_head && requestsData.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">Pending Join Requests</h3>
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">{requestsData.length} New</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {requestsData.map(req => (
                      <div key={req.request_id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm uppercase overflow-hidden flex-shrink-0">
                            {req.user.profile_photo ? (
                              <img 
                                src={req.user.profile_photo.startsWith("http") ? req.user.profile_photo : `${getApiBaseUrl()}${req.user.profile_photo}`} 
                                alt={req.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              req.user.name.substring(0, 2)
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-zinc-900">{req.user.name}</h4>
                            <p className="text-xs text-zinc-500">Relation Requested: {req.relation}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleRequestAction(req.request_id, "approve")} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button onClick={() => handleRequestAction(req.request_id, "reject")} className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Add Family Member Form (for Family Head) */}
        <div className="space-y-6">
          {familyData && familyData.is_head ? (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg">
                  {editingMember ? (editingMember.is_head ? "Your Personal Details" : "Edit Family Member") : "Add Family Member"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {editingMember ? (editingMember.is_head ? "Review and update your personal information." : "Update details for this family member.") : "Directly add a new family member to your group."}
                </p>
              </div>
              
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-medium">
                {/* Profile Photo field */}
                <div className="space-y-2">
                  <label className="font-semibold text-zinc-700 block">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {memberFormData.profile_photo ? (
                        <img 
                          src={memberFormData.profile_photo.startsWith("http") ? memberFormData.profile_photo : `${getApiBaseUrl()}${memberFormData.profile_photo}`} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-zinc-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="inline-flex items-center px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg cursor-pointer transition-colors shadow-sm gap-1">
                        {isUploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Upload Photo
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          className="hidden" 
                          disabled={isUploadingPhoto}
                        />
                      </label>
                      {memberFormData.profile_photo && (
                        <button
                          type="button"
                          onClick={() => setMemberFormData(prev => ({ ...prev, profile_photo: "" }))}
                          className="block text-rose-600 hover:text-rose-700 hover:underline transition-colors mt-0.5 text-[10px]"
                        >
                          Remove Photo
                        </button>
                      )}
                      <p className="text-[10px] text-zinc-400">JPG, JPEG, PNG or WEBP.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">First Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={memberFormData.first_name}
                    onChange={(e) => setMemberFormData({ ...memberFormData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="First Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Last Name / Surname <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={memberFormData.surname}
                    onChange={(e) => setMemberFormData({ ...memberFormData, surname: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Surname"
                  />
                </div>

                {!editingMember?.is_head && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700">Relation to Head <span className="text-rose-500">*</span></label>
                    <select 
                      required 
                      value={memberFormData.relation} 
                      onChange={e => setMemberFormData({ ...memberFormData, relation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      <option value="">Select Relation...</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 flex justify-between">
                    <span>Phone Number {!isStudent && <span className="text-rose-500">*</span>}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">{isStudent ? "(Optional for student)" : "(Compulsory)"}</span>
                  </label>
                  <input
                    type="tel"
                    value={memberFormData.mobile}
                    onChange={(e) => setMemberFormData({ ...memberFormData, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Phone Number"
                  />
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={memberFormData.mobile_private}
                      onChange={(e) => setMemberFormData({ ...memberFormData, mobile_private: e.target.checked })}
                      className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-zinc-500 text-[10px]">Hide phone number from other Samaj members</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 flex justify-between">
                    <span>Email ID {!isStudent && <span className="text-rose-500">*</span>}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">{isStudent ? "(Optional for student)" : "(Compulsory)"}</span>
                  </label>
                  <input
                    type="email"
                    value={memberFormData.email}
                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Email ID"
                  />
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={memberFormData.email_private}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email_private: e.target.checked })}
                      className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-zinc-500 text-[10px]">Hide email address from other Samaj members</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Profession (Optional)</label>
                  <input
                    type="text"
                    value={memberFormData.profession}
                    onChange={(e) => setMemberFormData({ ...memberFormData, profession: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. Student, Housewife"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700">Address (Optional)</label>
                  <textarea
                    value={memberFormData.address}
                    onChange={(e) => setMemberFormData({ ...memberFormData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Member's address"
                  />
                </div>

                <div className="flex gap-3">
                  {editingMember && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isAddingMember || isSavingProfile}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAddingMember || isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {editingMember ? "Saving..." : "Adding..."}
                      </>
                    ) : (
                      editingMember ? "Save Changes" : "Add Member"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 text-lg">Family Group Info</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Only the designated Family Head can directly add or remove family members. 
                Other members must request to join using the family code.
              </p>
              {familyData && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                  <span className="text-xs font-bold text-amber-800">Family Code: {familyData.family_code}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
