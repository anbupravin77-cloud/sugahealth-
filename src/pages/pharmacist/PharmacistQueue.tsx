import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Loader2, Package, Search, ShoppingBag, Clock } from 'lucide-react';

export default function PharmacistQueue() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/pharmacist/orders', {
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

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.shippingAddress?.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.shippingAddress?.lastName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Pharmacy Workspace</h1>
            <p className="text-sm text-neutral-500">Manage fulfillment queue and shipping</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search Order ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:border-neutral-950 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-neutral-400" size={32} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package size={48} className="text-neutral-200 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900">No Orders</h3>
              <p className="text-sm text-neutral-500">The fulfillment queue is currently empty.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Order ID</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Date</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Patient</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900">#{order.id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-neutral-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.fulfillmentStatus === 'shipped' ? 'bg-emerald-100 text-emerald-700' :
                          order.fulfillmentStatus === 'packed' ? 'bg-blue-100 text-blue-700' :
                          order.fulfillmentStatus === 'picking' ? 'bg-amber-100 text-amber-700' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {order.fulfillmentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          to={`/pharmacist/order/${order.id}`}
                          className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
