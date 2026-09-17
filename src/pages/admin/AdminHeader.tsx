import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Upload, 
  Eye, 
  RotateCcw, 
  LogOut, 
  ExternalLink, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useContent } from '../../context/ContentContext';
import { useAuth } from '../../context/AuthContext';

interface AdminHeaderProps {
  onSaveDraft: () => Promise<void>;
  saving: boolean;
  savedSuccess: boolean;
}

export function AdminHeader(props: AdminHeaderProps) {
  const onSaveDraft = props?.onSaveDraft || (async () => {});
  const saving = Boolean(props?.saving);
  const savedSuccess = Boolean(props?.savedSuccess);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { 
    publishLive, 
    discardDraft, 
    hasUnpublishedChanges, 
    setPreviewMode 
  } = useContent();

  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePublish = async () => {
    setShowPublishConfirm(false);
    setPublishing(true);
    setErrorMsg(null);

    const res = await publishLive();
    setPublishing(false);

    if (res.success) {
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to publish changes');
    }
  };

  const handleDiscard = async () => {
    setShowDiscardConfirm(false);
    await discardDraft();
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950 text-white border-b border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-3 gap-3">
          
          {/* Brand & Status */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="font-sans text-lg font-black tracking-tight uppercase">
                SUGA<span className="text-neutral-500">.</span>HEALTH
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                CMS
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {hasUnpublishedChanges ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Draft Changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live in Sync
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            
            {/* View live site */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Open public website in new tab"
            >
              <ExternalLink size={13} />
              <span className="hidden md:inline">Public Site</span>
            </a>

            {/* Preview Draft */}
            <Link
              to="/"
              onClick={() => setPreviewMode(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 transition-colors"
              title="Preview working draft across public pages"
            >
              <Eye size={13} />
              <span>Preview</span>
            </Link>

            {/* Discard Draft button */}
            {hasUnpublishedChanges && (
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                title="Discard unpublished changes and reset to live version"
              >
                <RotateCcw size={13} />
                <span className="hidden lg:inline">Reset</span>
              </button>
            )}

            {/* Save Draft Button */}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50"
              title="Save draft (Ctrl+S / Cmd+S)"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : savedSuccess ? (
                <Check size={13} className="text-emerald-400" />
              ) : (
                <Save size={13} />
              )}
              <span>{saving ? 'Saving...' : savedSuccess ? 'Draft Saved' : 'Save Draft'}</span>
            </button>

            {/* Publish Live Button */}
            <button
              type="button"
              onClick={() => setShowPublishConfirm(true)}
              disabled={publishing || !hasUnpublishedChanges}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-neutral-950 hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-xs"
              title="Publish draft to the live production database"
            >
              {publishing ? (
                <Loader2 size={13} className="animate-spin text-neutral-950" />
              ) : publishSuccess ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Upload size={13} />
              )}
              <span>{publishing ? 'Publishing...' : publishSuccess ? 'Published!' : 'Publish Live'}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
              title="Sign out of CMS"
            >
              <LogOut size={15} />
            </button>
          </div>

        </div>

        {errorMsg && (
          <div className="pb-3 text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Publish */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-950 rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h3 className="font-sans text-lg font-bold mb-2">Publish Changes to Live Site?</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              This will update the persistent production database. Your changes will immediately become visible to all visitors worldwide across all devices and browsers.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-neutral-950 hover:bg-neutral-800 text-white transition-colors"
              >
                Confirm & Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Discard */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-950 rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h3 className="font-sans text-lg font-bold mb-2 text-red-600">Discard All Draft Changes?</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Are you sure you want to discard your draft edits? Your working copy will be reset to match the currently published live site. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Discard Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
