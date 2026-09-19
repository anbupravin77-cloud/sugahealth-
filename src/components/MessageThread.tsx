import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Send, Clock, User, ShieldCheck } from 'lucide-react';

export default function MessageThread({ threadId, onBack }: { threadId: string, onBack?: () => void }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [threadData, setThreadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDoctor = profile?.role === 'doctor';
  const role = isDoctor ? 'doctor' : 'patient';

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

  const fetchThreadAndMessages = async () => {
    if (!threadId) return;
    try {
      const token = await getAuthToken();
      if (!token) return;

      const [threadRes, msgsRes] = await Promise.all([
        fetch('/api/messages/threads', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/messages/threads/${threadId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (threadRes.ok) {
        const tData = await threadRes.json();
        const curThread = (tData.threads || []).find((t: any) => t.id === threadId);
        if (curThread) {
          setThreadData(curThread);
          setOtherUser({
            displayName: isDoctor ? curThread.patientName : curThread.doctorName,
            lastName: isDoctor ? curThread.patientName : curThread.doctorName,
          });
        }
      }

      if (msgsRes.ok) {
        const mData = await msgsRes.json();
        setMessages(mData.messages || []);
        markRead(token);
      }
    } catch (err) {
      console.warn('Error loading messages thread:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (token?: string) => {
    try {
      const authToken = token || (await getAuthToken());
      if (!authToken) return;
      await fetch(`/api/messages/threads/${threadId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.warn('Error marking read:', err);
    }
  };

  useEffect(() => {
    fetchThreadAndMessages();

    const channel = supabase
      .channel(`thread-messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          fetchThreadAndMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/messages/threads/${threadId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newMessage.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      await fetchThreadAndMessages();
    } catch (err) {
      console.error(err);
      alert('Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  if (!threadData) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Conversation not found.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-emerald-600 font-medium">
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 md:hidden">
              &larr; Back
            </button>
          )}
          <div>
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              {isDoctor ? (
                <>
                  <User size={18} className="text-neutral-400" />
                  {otherUser?.displayName || 'Patient'}
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="text-emerald-500" />
                  {otherUser?.displayName || 'Attending Physician'}
                </>
              )}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Consultation Reference: {threadData.consultationId ? threadData.consultationId.substring(0,8).toUpperCase() : (threadData.id ? threadData.id.substring(0,8).toUpperCase() : '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            threadData.status === 'open' || threadData.status === 'needs_reply' || threadData.status === 'waiting'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-neutral-200 text-neutral-600'
          }`}>
            {threadData.status}
          </span>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50 space-y-6 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <ShieldCheck size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">This is a secure care channel.</p>
            <p className="text-xs mt-1 max-w-md text-center">
              Messages are monitored by your care team and are part of your clinical record.
              Do not use this for medical emergencies.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender === role || msg.senderRole === role || (user && msg.senderUid === user.uid);
            const showTimestamp = i === 0 || (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 1000 * 60 * 60);

            return (
              <div key={msg.id} className="flex flex-col">
                {showTimestamp && (
                  <div className="flex justify-center mb-4 mt-2">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase bg-neutral-100 px-2 py-1 rounded-full">
                      {new Date(msg.createdAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-neutral-500 font-medium mb-1 ml-1">
                      {isDoctor ? (otherUser?.displayName || 'Patient') : (otherUser?.displayName || 'Doctor')}
                    </span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl ${
                    isMe 
                      ? 'bg-neutral-900 text-white rounded-br-xs' 
                      : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-xs shadow-2xs'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text || msg.messageText}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 mr-1">
                    <Clock size={10} className="text-neutral-400" />
                    <span className="text-[10px] text-neutral-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {threadData.status !== 'closed' && threadData.status !== 'resolved' ? (
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-neutral-100">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message securely..."
              className="flex-1 max-h-32 min-h-[44px] bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600 shrink-0"
            >
              {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2 text-center">
            Messages are securely encrypted and part of your medical record.
          </p>
        </form>
      ) : (
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 text-center">
          <p className="text-sm text-neutral-500 font-medium">This conversation is closed.</p>
        </div>
      )}
    </div>
  );
}
