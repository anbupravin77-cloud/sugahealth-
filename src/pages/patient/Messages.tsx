import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import MessageThread from '../../components/MessageThread';

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch {}
    if (user && typeof (user as any).getIdToken === 'function') {
      try {
        return await (user as any).getIdToken();
      } catch {}
    }
    return null;
  };

  const fetchThreads = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch('/api/messages/threads', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const loadedThreads = data.threads || [];
        setThreads(loadedThreads);
        if (loadedThreads.length > 0 && !activeThreadId) {
          setActiveThreadId(loadedThreads[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch patient threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();

    const channel = supabase
      .channel('patient-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_threads' },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Messages</h1>
        <p className="text-sm text-neutral-500 mt-1">Secure communication with your clinical care team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Thread List */}
        <div className={`col-span-1 bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col ${activeThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-neutral-100 bg-neutral-50">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {threads.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center justify-center h-full text-neutral-400">
                <MessageSquare size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No active conversations</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  A conversation will appear once a physician reviews your consultation intake.
                </p>
              </div>
            ) : (
              threads.map((thread) => {
                const docName = thread.doctorName || 'Attending Physician';
                const hasUnread = thread.unread || (thread.patientUnreadCount && thread.patientUnreadCount > 0);
                return (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors flex gap-3 ${activeThreadId === thread.id ? 'bg-neutral-50 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {docName}
                        </p>
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">
                          {thread.lastMessageTime || (thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : 'Recent')}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${hasUnread ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                        {thread.lastMessageSnippet || thread.lastMessagePreview || 'No messages yet'}
                      </p>
                    </div>
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 self-center shrink-0"></div>
                    )}
                  </button>
                );
              })
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
              <p className="text-sm font-medium">Select a conversation</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
