import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { supabase } from '../../lib/supabase';
import { SectionHeader } from '../../components/doctor/common/SectionHeader';
import { StatusBadge } from '../../components/doctor/common/StatusBadge';
import { PriorityIndicator } from '../../components/doctor/common/PriorityIndicator';
import {
  Search,
  MessageSquare,
  Send,
  User,
  Paperclip,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';

export interface DoctorThreadItem {
  id: string;
  consultationId?: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  patientMrn: string;
  subject: string;
  status: 'needs_reply' | 'waiting' | 'resolved' | 'open' | 'closed';
  unread: boolean;
  patientUnreadCount?: number;
  doctorUnreadCount?: number;
  lastMessageSnippet: string;
  lastMessageTime: string;
  lastMessageAt?: string;
  priority: 'normal' | 'urgent';
}

export interface DoctorMessageItem {
  id: string;
  threadId: string;
  sender: 'doctor' | 'patient';
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: string;
  timeFormatted: string;
}

export function mapThreadPresentationStatus(thread: {
  status?: string;
  doctorUnreadCount?: number;
  patientUnreadCount?: number;
  unread?: boolean;
}): 'needs_reply' | 'waiting' | 'resolved' {
  if (thread.status === 'closed') {
    return 'resolved';
  }
  const unreadCount = thread.doctorUnreadCount ?? (thread.unread ? 1 : 0);
  if (unreadCount > 0) {
    return 'needs_reply';
  }
  return 'waiting';
}

export default function DoctorMessages() {
  const { doctor } = useDoctorAuth();
  const [threads, setThreads] = useState<DoctorThreadItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [messages, setMessages] = useState<DoctorMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [tabFilter, setTabFilter] = useState<'all' | 'needs_reply' | 'waiting' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/messages/threads', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const loadedThreads = data.threads || [];
        setThreads(loadedThreads);
        if (loadedThreads.length > 0 && !selectedThreadId) {
          setSelectedThreadId(loadedThreads[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching doctor threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    if (!threadId) return;
    setLoadingMessages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/messages/threads/${threadId}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        // Mark thread as read
        fetch(`/api/messages/threads/${threadId}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Error fetching thread messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();

    const channel = supabase
      .channel('doctor-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchThreads();
          if (selectedThreadId) {
            fetchMessages(selectedThreadId);
          }
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
  }, [selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      (t.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.patientMrn || '').toLowerCase().includes(searchQuery.toLowerCase());
    const presentationStatus = mapThreadPresentationStatus(t);
    const matchesTab = tabFilter === 'all' || presentationStatus === tabFilter;
    return matchesSearch && matchesTab;
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || !activeThread || sending) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/messages/threads/${activeThread.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: composerText.trim() }),
      });

      if (res.ok) {
        setComposerText('');
        await fetchMessages(activeThread.id);
        await fetchThreads();
      }
    } catch (err) {
      console.warn('Error sending doctor message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleInsertTemplate = (text: string) => {
    setComposerText((prev) => (prev ? `${prev} ${text}` : text));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header */}
      <SectionHeader
        tagline="Provider Communication"
        title="Clinical Messages"
        subtitle="Asynchronous provider-patient messaging for symptom check-ins, lab clarifications, and dosage guidance."
        badge={`${threads.filter((t) => t.unread || (t.doctorUnreadCount && t.doctorUnreadCount > 0)).length} Unread`}
      />

      {/* 2. Main Inbox Workspace (Split 2 Columns) */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column (5 of 12 cols): Thread List */}
        <div className="lg:col-span-5 border-r border-stone-200 flex flex-col">
          {/* Filter Bar */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/50 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages by patient or subject..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder-stone-400 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 text-2xs overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'needs_reply', label: 'Needs Reply' },
                { id: 'waiting', label: 'Waiting' },
                { id: 'resolved', label: 'Resolved' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTabFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    tabFilter === tab.id
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loadingThreads ? (
              <div className="p-8 flex justify-center items-center gap-2 text-xs text-stone-400">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No conversations found.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread?.id;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left p-3.5 transition-colors block ${
                      isSelected ? 'bg-stone-100/80 border-l-2 border-stone-900' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                        {(thread.unread || (thread.doctorUnreadCount && thread.doctorUnreadCount > 0)) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                        )}
                        {thread.patientName}
                      </span>
                      <span className="text-3xs text-stone-400">{thread.lastMessageTime}</span>
                    </div>

                    <p className="text-2xs font-medium text-stone-800 line-clamp-1">
                      {thread.subject}
                    </p>
                    <p className="text-2xs text-stone-500 line-clamp-1 mt-0.5">
                      {thread.lastMessageSnippet}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={mapThreadPresentationStatus(thread)} size="sm" />
                      {thread.priority === 'urgent' && (
                        <PriorityIndicator priority="urgent" size="sm" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (7 of 12 cols): Thread Viewer & Composer */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-stone-50/30">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-stone-900 font-sans">
                      {activeThread.patientName}
                    </span>
                    {activeThread.patientMrn && (
                      <span className="font-mono text-2xs text-stone-500">{activeThread.patientMrn}</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium">{activeThread.subject}</p>
                </div>

                <div className="flex items-center gap-2">
                  {activeThread.patientId && (
                    <Link
                      to={`/doctor/patients/${activeThread.patientId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-2xs font-medium transition-colors"
                    >
                      <span>Patient Chart</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Bubbles History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[380px]">
                {loadingMessages ? (
                  <div className="p-8 flex justify-center items-center gap-2 text-xs text-stone-400">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400">
                    No messages in this consultation yet.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'doctor' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-3xs text-stone-400 mb-1">
                        <span>{msg.sender === 'doctor' ? (doctor?.name || 'Attending Physician') : (activeThread.patientName || 'Patient')}</span>
                        <span>•</span>
                        <span>{msg.timeFormatted || new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-md p-3.5 rounded-xl text-xs ${
                          msg.sender === 'doctor'
                            ? 'bg-stone-900 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-900 shadow-2xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Clinical Quick Templates & Composer */}
              <div className="p-3.5 bg-white border-t border-stone-200 space-y-3">
                {/* Clinical Template Quick-Replies */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-2xs pb-1">
                  <span className="text-3xs uppercase font-semibold text-stone-400">Templates:</span>
                  {[
                    'Hydration Protocol (64oz water daily with electrolytes)',
                    'Mild Nausea Advisory (Take dose at bedtime with food)',
                    'Clinical review verified and acknowledged',
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertTemplate(tpl)}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap transition-colors"
                    >
                      + {tpl.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Composer Form */}
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <textarea
                    rows={3}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder={`Write clinical advisory response to ${activeThread.patientName}...`}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-hidden font-sans"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-3xs text-stone-400 font-mono">
                      Attending: {doctor?.name || 'Attending Physician'}
                    </span>
                    <button
                      type="submit"
                      disabled={!composerText.trim() || sending}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Response</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
