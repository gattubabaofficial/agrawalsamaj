"use client";

import { EyeOff, Copy } from "lucide-react";

interface ProfileTabProps {
  currentUser: any;
  myPrivacy: any;
  setMyPrivacy: any;
  handleSavePrivacy: () => void;
  addressForm: any;
  setAddressForm: any;
  handleSaveAddress: () => void;
}

export default function ProfileTab({
  currentUser,
  myPrivacy,
  setMyPrivacy,
  handleSavePrivacy,
  addressForm,
  setAddressForm,
  handleSaveAddress,
}: ProfileTabProps) {
  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-6 text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Manage your profile metadata information and directory privacy access options</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 border-b border-gray-100 pb-6">
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Full Name</span>
          <p className="font-bold text-base text-gray-900">{currentUser.first_name} {currentUser.last_name}</p>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Samaj Unique ID</span>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-bold text-base text-bhagwa tracking-wide font-black">{currentUser.samaj_id}</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(currentUser.samaj_id);
                alert("Samaj ID copied to clipboard!");
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 text-[10px] font-bold"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Mobile Line</span>
          <p className="font-bold text-sm text-gray-900">{currentUser.phone}</p>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-text font-bold uppercase tracking-wider text-[10px]">Colony Location</span>
          <p className="font-bold text-sm text-gray-900">{currentUser.address?.colony}, {currentUser.address?.area}</p>
        </div>
      </div>

      <div className="bg-orange-50/40 border border-orange-100/70 p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-black text-bhagwa uppercase tracking-wider">
          <EyeOff className="w-4 h-4" />
          <span>Interactive Directory Privacy Controls</span>
        </div>
        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
          Turn on checkboxes to prevent other Samaj directory members from viewing details. Administrators can always view values.
        </p>

        <div className="flex flex-col gap-3 font-semibold text-xs text-gray-800">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={myPrivacy.phone}
              onChange={(e) => setMyPrivacy((prev: any) => ({ ...prev, phone: e.target.checked }))}
              className="rounded border-gray-300 text-bhagwa focus:ring-bhagwa"
            />
            Hide Phone Number from other members
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={myPrivacy.email}
              onChange={(e) => setMyPrivacy((prev: any) => ({ ...prev, email: e.target.checked }))}
              className="rounded border-gray-300 text-bhagwa focus:ring-bhagwa"
            />
            Hide Email Address from other members
          </label>
        </div>

        <button
          onClick={handleSavePrivacy}
          className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-end shadow-sm"
        >
          Save Settings
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
          <span>Manage Address</span>
        </div>
        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
          Provide your permanent residential address. This will be automatically linked to your Family if you decide to register one.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">House / Flat No / Street</label>
            <input 
              value={addressForm.address_text}
              onChange={e => setAddressForm({...addressForm, address_text: e.target.value})}
              className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none bg-white"
              placeholder="e.g. 104, B-Wing, Omkar Tower"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Colony / Society</label>
            <input 
              value={addressForm.colony}
              onChange={e => setAddressForm({...addressForm, colony: e.target.value})}
              className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none bg-white"
              placeholder="e.g. Agrawal Nagar"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Area / Locality</label>
            <input 
              value={addressForm.area}
              onChange={e => setAddressForm({...addressForm, area: e.target.value})}
              className="p-3 border border-gray-200 rounded-xl text-xs font-semibold focus:border-bhagwa outline-none bg-white"
              placeholder="e.g. Navlakha Road"
            />
          </div>
        </div>

        <button
          onClick={handleSaveAddress}
          className="bg-bhagwa hover:bg-bhagwa-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all self-end shadow-sm mt-2"
        >
          Save Address
        </button>
      </div>
    </div>
  );
}
