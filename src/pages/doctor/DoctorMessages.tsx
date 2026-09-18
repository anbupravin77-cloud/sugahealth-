import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Loader2, MessageSquare, User } from 'lucide-react';
import MessageThread from '../../components/MessageThread';

export default function DoctorMessages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'message_threads'),
      where('doctorId', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const fetchedThreads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch patient names for the threads via secure participant endpoint
      try {
        const token = await user.getIdToken();
        const threadsWithPatients = await Promise.all(fetchedThreads.map(async (t: any) => {
          if (!t.patientId) return t;
          try {
            const res = await fetch(`/api/messaging/participant/${t.patientId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              return { ...t, patientName: data.displayName };
            }
          } catch (e) {
            console.error('Failed to fetch patient participant info', e);
          }
          return t;
        }));
        setThreads(threadsWithPatients);
      } catch (err) {
        setThreads(fetchedThreads);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Patient Messages</h1>
        <p className="text-sm text-neutral-500 mt-1">Secure communication with your assigned patients.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        {/* Thread List */}
        <div className={`col-span-1 bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col ${activeThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Inbox</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {threads.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center justify-center h-full text-neutral-400">
                <MessageSquare size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No active conversations</p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors flex gap-3 ${activeThreadId === thread.id ? 'bg-neutral-50 border-l-2 border-neutral-900' : 'border-l-2 border-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {thread.patientName || 'Patient'}
                      </p>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">
                        {new Date(thread.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${thread.doctorUnreadCount > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                      {thread.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                  {thread.doctorUnreadCount > 0 && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 self-center shrink-0"></div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread View */}
        <div className={`col-span-1 md:col-span-2 ${!activeThreadId ? 'hidden md:flex flex-col items-center justify-center bg-neutral-50/50 rounded-xl border border-neutral-200 border-dashed text-neutral-400' : ''}`}>
          {activeThreadId ? (
            <MessageThread 
              threadId={activeThreadId} 
              onBack={() => setActiveThreadId(null)} 
            />
          ) : (
            <>
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a conversation to view messages</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
