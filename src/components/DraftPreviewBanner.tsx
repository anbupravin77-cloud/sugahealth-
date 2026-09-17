import { Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import { Eye, ArrowLeft, Upload, Check } from 'lucide-react';
import { useState } from 'react';

export function DraftPreviewBanner() {
  const { isPreviewMode, setPreviewMode, publishLive, hasUnpublishedChanges } = useContent();
  const [publishing, setPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  if (!isPreviewMode) return null;

  const handlePublish = async () => {
    setPublishing(true);
    const res = await publishLive();
    setPublishing(false);
    if (res.success) {
      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 3000);
    }
  };

  return (
    <aside aria-label="Draft preview status" className="sticky top-0 z-50 bg-neutral-950 text-white border-b border-neutral-800 px-4 py-2.5 sm:px-6 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
            <Eye size={14} />
            Draft Preview Mode
          </span>
          <span className="text-neutral-400 hidden md:inline">
            — Viewing unpublished draft changes. Regular visitors see the published version.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            <ArrowLeft size={13} />
            Back to Admin
          </Link>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-neutral-950 hover:bg-neutral-200 font-bold transition-colors disabled:opacity-50"
          >
            {publishedSuccess ? (
              <>
                <Check size={13} className="text-emerald-600" />
                Published!
              </>
            ) : publishing ? (
              'Publishing...'
            ) : (
              <>
                <Upload size={13} />
                Publish to Live
              </>
            )}
          </button>

          <button
            onClick={() => setPreviewMode(false)}
            className="text-neutral-400 hover:text-white px-2 py-1 transition-colors"
            title="Switch view to published content"
          >
            Exit Preview
          </button>
        </div>
      </div>
    </aside>
  );
}
