import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, Smartphone, BellRing } from 'lucide-react';

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ email: true, sms: false, inApp: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const token = await getAuthToken();
        if (!token) return;
        const res = await fetch('/api/notifications/preferences', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPrefs({
            email: !!data.email,
            sms: !!data.sms,
            inApp: data.inApp !== false
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      setSuccess(false);
      setError('');
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication session required');
        return;
      }
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update preferences');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-neutral-400" size={24} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-neutral-200">
            <Mail size={20} className="text-neutral-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Email Notifications</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={prefs.email}
                  onChange={(e) => setPrefs(p => ({ ...p, email: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Receive updates about your consultations, prescriptions, and orders via email.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-neutral-200">
            <Smartphone size={20} className="text-neutral-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">SMS Notifications</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={prefs.sms}
                  onChange={(e) => setPrefs(p => ({ ...p, sms: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Receive timely text messages for important updates and action items.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-neutral-200">
            <BellRing size={20} className="text-neutral-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">In-App Notifications</h3>
              <label className="relative inline-flex items-center opacity-50 cursor-not-allowed">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={prefs.inApp}
                  disabled
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Essential for the application to function. Cannot be disabled.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        {success && <span className="text-sm font-medium text-emerald-600">Preferences saved</span>}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}
