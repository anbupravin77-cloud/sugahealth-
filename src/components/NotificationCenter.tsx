import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-100 z-50 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="font-bold text-neutral-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="animate-spin text-neutral-400" size={24} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 flex flex-col items-center">
                  <Bell className="mb-2 opacity-20" size={32} />
                  <p className="text-sm">You have no notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors hover:bg-neutral-50 ${notif.status === 'unread' ? 'bg-emerald-50/30' : ''}`}
                      onClick={() => {
                        if (notif.status === 'unread') markAsRead(notif.id);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.status === 'unread' ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-neutral-900 mb-1">{notif.title}</p>
                          <p className="text-sm text-neutral-600 mb-2">{notif.shortMessage}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-neutral-400">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                            {notif.relatedEntityType === 'order' && (
                              <Link 
                                to="/account"
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                              >
                                View Order
                              </Link>
                            )}
                            {notif.relatedEntityType === 'consultation' && (
                              <Link 
                                to="/account" // Or wherever they view consults
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                              >
                                View Details
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
