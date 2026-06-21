"use client";

import { Heart, CreditCard, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";
import PaymentGateway from "@/components/PaymentGateway";

export default function UserDonationsPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showDonateForm, setShowDonateForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [donationsRes, categoriesRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/donations/`, { headers }),
        axios.get(`${getApiBaseUrl()}/donations/categories`, { headers })
      ]);
      
      setDonations(donationsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Failed to fetch donations data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!categoryId) {
      alert("Please select a donation category.");
      return;
    }
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentGateway(false);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${getApiBaseUrl()}/donations/`,
        {
          category_id: categoryId,
          amount: parseFloat(amount),
          message: message
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Donation successful! Thank you for your support.");
      setShowDonateForm(false);
      setAmount("");
      setMessage("");
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Donation failed");
    }
  };

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Donations</h1>
          <p className="text-sm text-zinc-500 mt-1">Your contribution history and tax receipts.</p>
        </div>
        <button 
          onClick={() => setShowDonateForm(!showDonateForm)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          <Heart className="w-4 h-4" /> {showDonateForm ? "Cancel" : "Make a Donation"}
        </button>
      </div>

      {showDonateForm && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Make a Contribution</h2>
          <form onSubmit={handleDonateSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Donation Category</label>
                <select 
                  required 
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Select Purpose --</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Amount (₹)</label>
                <input type="number" required min="1" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Message (Optional)</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm" value={message} onChange={e => setMessage(e.target.value)} placeholder="In memory of..." />
            </div>
            <button type="submit" className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-colors">
              Proceed to Payment
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-sm text-white md:col-span-2 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div>
            <p className="font-medium text-emerald-100 mb-1">Total Lifetime Contributions</p>
            <h2 className="text-4xl font-bold tracking-tight">₹{totalDonated.toFixed(2)}</h2>
          </div>
          <p className="text-sm text-emerald-100 mt-6">Thank you for your generous support to the Samaj.</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-900">80G Tax Exemption</h3>
          <p className="text-xs text-zinc-500 mt-1">All donations are eligible for tax deduction under section 80G.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/50">
          <h3 className="font-semibold text-zinc-900">Donation History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Category / Purpose</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No donations found.
                  </td>
                </tr>
              ) : (
                donations.map((donation) => {
                  const catName = categories.find(c => c.category_id === donation.category_id)?.name || "Donation";
                  return (
                    <tr key={donation.donation_id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-zinc-900 font-medium">{new Date(donation.donated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-zinc-600">
                        {catName}
                        {donation.message && <span className="block text-xs text-zinc-400 mt-0.5">Note: {donation.message}</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-900 font-bold">₹{donation.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase">
                          {donation.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {donation.payment_status === "paid" && (
                          <button className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1">
                            <Download className="w-4 h-4" /> PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentGateway && (
        <PaymentGateway
          amount={parseFloat(amount)}
          purpose={`Donation`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}
    </div>
  );
}
