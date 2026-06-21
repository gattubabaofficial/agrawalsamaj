"use client";

import { CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

interface PaymentGatewayProps {
  amount: number;
  purpose: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentGateway({ amount, purpose, onSuccess, onCancel }: PaymentGatewayProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 1500);
  };

  const handleSimulateFailure = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert("Payment Failed! Please try again.");
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-zinc-200">
        <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-zinc-900">Mock Payment Gateway</h3>
        </div>
        
        <div className="p-6 text-center space-y-6">
          <div>
            <p className="text-sm text-zinc-500 font-medium">{purpose}</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">₹ {amount.toFixed(2)}</p>
          </div>
          
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            {isProcessing ? (
              <div className="py-8 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                <p className="text-sm font-semibold animate-pulse">Processing Payment...</p>
              </div>
            ) : (
              <>
                <button 
                  onClick={handleSimulateSuccess}
                  className="w-full py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Simulate Success
                </button>
                <button 
                  onClick={handleSimulateFailure}
                  className="w-full py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> Simulate Failure
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold rounded-xl transition-colors mt-4"
                >
                  Cancel Transaction
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
