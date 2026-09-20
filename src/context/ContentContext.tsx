import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SugaWebsiteContent } from '../types/content';
import { defaultContent } from '../data/defaultContent';
import { supabase } from '../lib/supabase';

interface ContentContextValue {
  content: SugaWebsiteContent;
  publishedContent: SugaWebsiteContent;
  draftContent: SugaWebsiteContent;
  hasUnpublishedChanges: boolean;
  lastPublishedAt: string | null;
  lastDraftSavedAt: string | null;
  isLoading: boolean;
  error: string | null;
  isPreviewMode: boolean;
  saveDraft: (updated: SugaWebsiteContent) => Promise<{ success: boolean; error?: string }>;
  updateDraft: (updated: SugaWebsiteContent) => void;
  discardDraft: () => Promise<void>;
  publishLive: () => Promise<{ success: boolean; error?: string }>;
  resetToDefaults: () => Promise<{ success: boolean; error?: string }>;
  uploadImage: (fileOrName: File | string, dataUrl?: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  setPreviewMode: (enabled: boolean) => void;
  reloadContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

const PREVIEW_FLAG_KEY = 'suga_preview_mode';

function mergeWithDefault(incoming: any): SugaWebsiteContent {
  if (!incoming) return defaultContent;
  return {
    ...defaultContent,
    ...incoming,
    global: { ...defaultContent.global, ...(incoming.global || {}) },
    seo: { ...defaultContent.seo, ...(incoming.seo || {}) },
    home: { ...defaultContent.home, ...(incoming.home || {}) },
    weightLoss: { ...defaultContent.weightLoss, ...(incoming.weightLoss || {}) },
    hairGrowth: { ...defaultContent.hairGrowth, ...(incoming.hairGrowth || {}) },
    sexualHealth: { ...defaultContent.sexualHealth, ...(incoming.sexualHealth || {}) },
    about: { ...defaultContent.about, ...(incoming.about || {}) },
    products: incoming.products || defaultContent.products,
    doctors: incoming.doctors || defaultContent.doctors,
  };
}

export function ContentProvider({ children }: { children: ReactNode } = { children: null }) {
  // Start synchronously with default content to ensure ZERO layout shift on first render
  const [publishedContent, setPublishedContent] = useState<SugaWebsiteContent>(defaultContent);
  const [draftContent, setDraftContent] = useState<SugaWebsiteContent>(defaultContent);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Preview
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(PREVIEW_FLAG_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        setCurrentUserEmail(session.user.email || null);
      } else {
        setAuthToken(null);
        setCurrentUserEmail(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthToken(session.access_token);
        setCurrentUserEmail(session.user.email || null);
      } else {
        setAuthToken(null);
        setCurrentUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch published content for public website
  const fetchPublishedContent = useCallback(async () => {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.content) {
        setPublishedContent(mergeWithDefault(data.content));
        if (data.lastPublishedAt) setLastPublishedAt(data.lastPublishedAt);
      }
    } catch (err) {
      console.warn('Using default content baseline:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch draft content when admin is authenticated
  const fetchDraftContent = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/admin/content/draft', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        // Not an admin or session expired, don't throw an error
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.draft) {
        setDraftContent(mergeWithDefault(data.draft));
        setLastDraftSavedAt(data.lastDraftSavedAt || null);
        setLastPublishedAt(data.lastPublishedAt || null);
        setHasUnpublishedChanges(Boolean(data.hasUnpublishedChanges));
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  useEffect(() => {
    if (authToken && currentUserEmail) {
      const email = currentUserEmail.toLowerCase().trim();
      const isAdmin = email === 'ramaadhiasha@gmail.com' || email.endsWith('@sugahealth.com') || email.startsWith('admin@');
      if (isAdmin) {
        fetchDraftContent(authToken);
      }
    }
  }, [authToken, currentUserEmail, fetchDraftContent]);

  const saveDraft = async (updated: SugaWebsiteContent) => {
    if (!authToken) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/admin/content/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ draft: updated })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to save draft' };
      }
      setDraftContent(updated);
      setLastDraftSavedAt(data.lastDraftSavedAt || new Date().toISOString());
      setHasUnpublishedChanges(JSON.stringify(updated) !== JSON.stringify(publishedContent));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const updateDraft = useCallback((updated: SugaWebsiteContent) => {
    setDraftContent(updated);
    setHasUnpublishedChanges(JSON.stringify(updated) !== JSON.stringify(publishedContent));
  }, [publishedContent]);

  const publishLive = async () => {
    if (!authToken) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/admin/content/publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to publish content' };
      }
      setPublishedContent(draftContent);
      setLastPublishedAt(data.lastPublishedAt || new Date().toISOString());
      setHasUnpublishedChanges(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const resetToDefaults = async () => {
    if (!authToken) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch('/api/admin/content/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}` 
        },
        body: JSON.stringify({ confirmation: 'RESET' })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset content' };
      }
      setPublishedContent(defaultContent);
      setDraftContent(defaultContent);
      setHasUnpublishedChanges(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const discardDraft = async () => {
    setDraftContent(publishedContent);
    setHasUnpublishedChanges(false);
  };

  const uploadImage = async (fileOrName: File | string, dataUrlParam?: string) => {
    if (!authToken) return { success: false, error: 'Not authenticated' };
    try {
      const filename = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
      let dataUrl = dataUrlParam;

      if (typeof fileOrName !== 'string' && fileOrName instanceof File) {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file as data URL'));
          reader.readAsDataURL(fileOrName);
        });
      }

      if (!dataUrl) {
        return { success: false, error: 'No image data provided' };
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ filename, dataUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Upload failed' };
      }
      return { success: true, url: data.url };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
    try {
      sessionStorage.setItem(PREVIEW_FLAG_KEY, enabled ? 'true' : 'false');
    } catch {}
  };

  // The active content delivered to public views:
  // In preview mode (authenticated), renders draftContent.
  // Otherwise, renders publishedContent.
  const activeContent = isPreviewMode ? draftContent : publishedContent;

  return (
    <ContentContext.Provider
      value={{
        content: activeContent,
        publishedContent,
        draftContent,
        hasUnpublishedChanges,
        lastPublishedAt,
        lastDraftSavedAt,
        isLoading,
        error,
        isPreviewMode,
        saveDraft,
        updateDraft,
        discardDraft,
        publishLive,
        resetToDefaults,
        uploadImage,
        setPreviewMode,
        reloadContent: fetchPublishedContent,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}
