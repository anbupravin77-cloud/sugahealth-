import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Send, Clock, User, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';

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

  useEffect(() => {
    if (!user || !threadId) return;

    // Listen to thread metadata
    const threadUnsub = onSnapshot(doc(db, 'message_threads', threadId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setThreadData(data);
        
        // Fetch other user profile safely via backend endpoint
        const otherId = isDoctor ? data.patientId : data.doctorId;
        if (otherId && (!otherUser || otherUser.id !== otherId)) {
          try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/messaging/participant/${otherId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const uData = await res.json();
              setOtherUser(uData);
            }
          } catch (e) {
            console.error('Failed to fetch participant in MessageThread:', e);
          }
        }
      }
    });

    // Listen to messages
    const q = query(
      collection(db, `message_threads/${threadId}/messages`),
      orderBy('createdAt', 'asc')
    );
    
    const messagesUnsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
      markRead();
    });

    return () => {
      threadUnsub();
      messagesUnsub();
    };
  }, [threadId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markRead = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/messages/threads/${threadId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/messages/threads/${threadId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newMessage })
      });
      
      if (!res.ok) {
        throw new Error('Failed to send message');
      }
      
      setNewMessage('');
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
    <div className="flex flex-col h-full bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
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
                  {otherUser ? (otherUser.displayName || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'Patient') : 'Patient'}
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="text-emerald-500" />
                  {otherUser ? (otherUser.displayName ? (otherUser.displayName.startsWith('Dr.') ? otherUser.displayName : `Dr. ${otherUser.displayName}`) : (otherUser.lastName ? `Dr. ${otherUser.lastName}` : 'Doctor')) : 'Doctor'}
                </>
              )}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Consultation Reference: {threadData.consultationId.substring(0,8).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            threadData.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
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
            const isMe = msg.senderRole === role;
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
                      {isDoctor ? 'Patient' : `Dr. ${otherUser?.lastName || 'Doctor'}`}
                    </span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl ${
                    isMe 
                      ? 'bg-neutral-900 text-white rounded-br-sm' 
                      : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.messageText}</p>
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
      {threadData.status === 'open' ? (
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-neutral-100">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message securely..."
              className="flex-1 max-h-32 min-h-[44px] bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
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
