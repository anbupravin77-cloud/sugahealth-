import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle2, Clock, Package, Truck, XCircle, RefreshCcw } from 'lucide-react';

export default function OrderTimeline({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [orderId]);

  const fetchTimeline = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/orders/${orderId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'PAYMENT_PENDING': return <Clock size={16} className="text-amber-500" />;
      case 'PAYMENT_CONFIRMED': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'ORDER_PROCESSING': return <RefreshCcw size={16} className="text-blue-500" />;
      case 'ORDER_PACKED': return <Package size={16} className="text-indigo-500" />;
      case 'ORDER_SHIPPED': return <Truck size={16} className="text-purple-500" />;
      case 'ORDER_DELIVERED': return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'ORDER_CANCELLED': 
      case 'ORDER_REFUNDED': return <XCircle size={16} className="text-red-500" />;
      default: return <CheckCircle2 size={16} className="text-neutral-400" />;
    }
  };

  const getEventTitle = (type: string) => {
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  if (loading) {
    return <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin text-neutral-400" /></div>;
  }

  if (events.length === 0) {
    return null; // Or return a placeholder if desired
  }

  return (
    <div className="mt-6 pt-6 border-t border-neutral-100">
      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Order Timeline</h4>
      <div className="relative pl-3 space-y-4">
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-neutral-200"></div>
        
        {events.map((event, index) => (
          <div key={event.eventId} className="relative flex gap-3">
            <div className="relative z-10 w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              {getEventIcon(event.eventType)}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm font-semibold text-neutral-900">{getEventTitle(event.eventType)}</p>
              <p className="text-xs text-neutral-500">{new Date(event.timestamp).toLocaleString()}</p>
              {event.metadata?.trackingNumber && (
                <p className="text-xs text-neutral-600 mt-1">Tracking: {event.metadata.carrier} {event.metadata.trackingNumber}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
