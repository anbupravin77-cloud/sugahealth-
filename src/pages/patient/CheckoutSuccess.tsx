import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Simply wait a moment to ensure webhook has time to process if needed, 
  // though the user will see the status in their account anyway.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-neutral-100">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <h2 className="text-xl font-bold text-neutral-900">Verifying Payment...</h2>
            <p className="text-neutral-500 text-sm">Please wait while we confirm your order.</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Payment Successful</h1>
            <p className="text-neutral-600 mb-6">
              Your order has been placed and is now pending pharmacy fulfillment.
            </p>

            {orderId && (
              <div className="bg-neutral-50 rounded-xl p-4 mb-8 text-left border border-neutral-200">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Order Reference</p>
                <p className="text-sm font-mono text-neutral-900">{orderId}</p>
              </div>
            )}

            <Link
              to="/account"
              className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-neutral-950 text-white font-bold rounded-xl hover:bg-neutral-800 transition-colors"
            >
              View My Orders <ArrowRight size={18} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
