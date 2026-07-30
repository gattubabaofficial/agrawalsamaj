"use client";

import { CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PaymentGatewayProps {
  amount: number;
  purpose: string;
  onSuccess: (paymentId?: string) => void;
  onCancel: () => void;
  prefillName?: string;
  prefillPhone?: string;
  prefillEmail?: string;
  razorpayOrderId?: string;
}

export default function PaymentGateway({
  amount,
  purpose,
  onSuccess,
  onCancel,
  prefillName = "",
  prefillPhone = "",
  prefillEmail = "",
  razorpayOrderId = ""
}: PaymentGatewayProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  useEffect(() => {
    // Check if Razorpay script is already loaded
    if ((window as any).Razorpay) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      setSdkError(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script if needed (optional)
    };
  }, []);

  const handleRazorpayPay = () => {
    if (!(window as any).Razorpay) {
      alert("Razorpay SDK is not loaded yet. Please try again or use the simulated buttons.");
      return;
    }

    setIsProcessing(true);

    const isDummyOrder = !razorpayOrderId || razorpayOrderId.startsWith("order_dummy_");

    const options: any = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_123",
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      name: "Agrawal Samaj Mansrovar Jaipur Portal",
      description: purpose,
      handler: function (response: any) {
        setIsProcessing(false);
        onSuccess(response.razorpay_payment_id);
      },
      prefill: {
        name: prefillName,
        contact: prefillPhone,
        email: prefillEmail,
      },
      theme: {
        color: "#f59e0b", // Amber 500
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
          onCancel();
        },
      },
    };

    // Only supply order_id if it's a real non-dummy order
    if (!isDummyOrder) {
      options.order_id = razorpayOrderId;
    }

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Error opening Razorpay checkout window", err);
      setIsProcessing(false);
      alert("Failed to initialize Razorpay payment. Please use simulated fallback payment.");
    }
  };

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess("pay_mock_success_" + Math.random().toString(36).substring(2, 9));
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
          <h3 className="font-semibold text-zinc-900">Secure Online Payment</h3>
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
                  onClick={handleRazorpayPay}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay via Razorpay
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-medium">Or Developer Fallback</span></div>
                </div>

                <button 
                  onClick={handleSimulateSuccess}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Simulate Success
                </button>
                <button 
                  onClick={handleSimulateFailure}
                  className="w-full py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" /> Simulate Failure
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-2.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-semibold rounded-xl transition-colors text-sm"
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
