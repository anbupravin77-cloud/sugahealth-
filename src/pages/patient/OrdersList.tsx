import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Receipt, ArrowRight, CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrderTimeline from '../../components/OrderTimeline';

interface Order {
  id: string;
  prescriptionId: string;
  consultationId: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus?: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: Array<{
    medicationName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
}

export function OrdersList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Failed to load orders');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (orderId: string) => {
    if (!user) return;
    setCheckingOut(orderId);
    setError('');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        if (data.url.startsWith('/')) {
          navigate(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err: any) {
      setError(err.message);
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl">
        <Receipt size={32} className="mx-auto text-neutral-300 mb-3" />
        <h3 className="text-sm font-medium text-neutral-900 mb-1">No Orders Yet</h3>
        <p className="text-xs text-neutral-500">
          Your orders will appear here once your prescriptions are approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {orders.map(order => (
        <div key={order.id} className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">Order #{order.id.slice(-8).toUpperCase()}</div>
              <div className="text-sm text-neutral-900 font-medium">{new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
            
            <div className="flex items-center gap-3">
              {order.paymentStatus === 'paid' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  <CheckCircle2 size={14} /> Paid
                </span>
              ) : order.paymentStatus === 'failed' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  <AlertCircle size={14} /> Payment Failed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  <Clock size={14} /> Pending Payment
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 md:p-6">
            <h4 className="text-sm font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-2">Prescription Items</h4>
            <div className="space-y-3 mb-6">
              {order.lineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{item.medicationName}</div>
                    <div className="text-xs text-neutral-500">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-sm font-medium text-neutral-900">
                    ${item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Shipping</span>
                <span>${order.shippingAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Tax</span>
                <span>${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2">
                <span>Total</span>
                <span>${order.totalAmount.toFixed(2)} {order.currency}</span>
              </div>
            </div>

            {order.paymentStatus === 'paid' && order.fulfillmentStatus && (
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  Status: 
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.fulfillmentStatus.replace('_', ' ')}
                  </span>
                </h4>
                
                {(order as any).shipment && (
                  <div className="bg-neutral-50 rounded-lg p-4 space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-2">Tracking Information</p>
                    <p className="text-sm font-medium text-neutral-900">Carrier: {(order as any).shipment.carrier}</p>
                    <p className="text-sm font-medium text-neutral-900">Tracking: {(order as any).shipment.trackingNumber}</p>
                  </div>
                )}
              </div>
            )}

            {order.paymentStatus !== 'paid' && (
              <div className="mt-6 pt-6 border-t border-neutral-100 space-y-4">
                {(order as any).shippingAddress && (
                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Shipping To</h4>
                    <div className="text-sm text-neutral-700">
                      <p>{(order as any).shippingAddress.firstName} {(order as any).shippingAddress.lastName}</p>
                      <p>{(order as any).shippingAddress.addressLine1}</p>
                      {/* Only conditionally render line 2 if it's there */}
                      {(order as any).shippingAddress.addressLine2 && <p>{(order as any).shippingAddress.addressLine2}</p>}
                      <p>{(order as any).shippingAddress.city}, {(order as any).shippingAddress.state} {(order as any).shippingAddress.postalCode}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => handleCheckout(order.id)}
                    disabled={checkingOut === order.id}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-950 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {checkingOut === order.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CreditCard size={18} />
                    )}
                    Proceed to Payment <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            <OrderTimeline orderId={order.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
