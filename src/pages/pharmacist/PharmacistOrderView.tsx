import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Package, MapPin, Download, CheckCircle, Truck, Clock } from 'lucide-react';

export default function PharmacistOrderView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id, user]);

  const fetchOrder = async () => {
    if (!user || !id) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pharmacist/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
      } else {
        throw new Error(data.error || 'Failed to load order');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!user || !id) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pharmacist/orders/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrder({ ...order, fulfillmentStatus: status });
      } else {
        const data = await res.json();
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShip = async () => {
    if (!user || !id) return;
    if (!window.confirm('Generate shipping label and mark as shipped?')) return;
    
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/pharmacist/orders/${id}/ship`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOrder({ ...order, fulfillmentStatus: 'shipped', shipment: data.shipment });
        alert('Shipment created successfully');
      } else {
        alert(data.error || 'Shipping failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadPrescription = async () => {
    if (!user || !order?.prescriptionId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/documents/${order.prescriptionId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prescription_${order.prescriptionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download document');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-neutral-400" size={32} /></div>;
  if (error || !order) return <div className="min-h-screen p-8 text-center text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Link to="/pharmacist" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to Queue
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Order #{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-neutral-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
              Paid
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              order.fulfillmentStatus === 'shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
              order.fulfillmentStatus === 'packed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              order.fulfillmentStatus === 'picking' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}>
              {order.fulfillmentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Package size={20}/> Line Items</h2>
              </div>
              <div className="space-y-4">
                {order.lineItems?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                    <div>
                      <h4 className="font-semibold text-neutral-900">{item.name}</h4>
                      <p className="text-sm text-neutral-500 mt-1">{item.dosage} - {item.frequency}</p>
                      {item.instructions && <p className="text-xs text-neutral-400 mt-1 italic">"{item.instructions}"</p>}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center justify-center bg-neutral-900 text-white font-bold text-xs rounded-full h-6 w-6">
                        {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">Workflow Actions</h2>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => updateStatus('picking')}
                  disabled={actionLoading || order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'picking' || order.fulfillmentStatus === 'packed'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-colors disabled:opacity-50 border border-neutral-200 bg-white hover:bg-neutral-50"
                >
                  <Clock size={16}/> Start Picking
                </button>
                <button
                  onClick={() => updateStatus('packed')}
                  disabled={actionLoading || order.fulfillmentStatus !== 'picking'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-colors disabled:opacity-50 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <CheckCircle size={16}/> Mark Packed
                </button>
                <button
                  onClick={handleShip}
                  disabled={actionLoading || order.fulfillmentStatus !== 'packed'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-colors disabled:opacity-50 bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  <Truck size={16}/> Generate Label & Ship
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin size={16}/> Shipping Address</h2>
              {order.shippingAddress ? (
                <div className="text-sm text-neutral-600 space-y-1">
                  <p className="font-semibold text-neutral-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">No shipping address recorded</p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Clinical Reference</h2>
              <button
                onClick={downloadPrescription}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Download size={16} /> View Prescription PDF
              </button>
            </div>

            {order.shipment && (
              <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 p-6">
                <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Truck size={16}/> Shipment Details</h2>
                <div className="space-y-3 text-sm text-indigo-800">
                  <p><span className="font-semibold">Carrier:</span> {order.shipment.carrier}</p>
                  <p><span className="font-semibold">Tracking:</span> {order.shipment.trackingNumber}</p>
                  <p><span className="font-semibold">Shipped:</span> {new Date(order.shipment.createdAt).toLocaleDateString()}</p>
                  {order.shipment.labelUrl && (
                    <a href={order.shipment.labelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-medium mt-2">
                      <Download size={14}/> Download Label
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
