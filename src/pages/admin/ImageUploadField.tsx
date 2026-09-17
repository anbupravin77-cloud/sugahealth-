import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Check, Image as ImageIcon, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useContent } from '../../context/ContentContext';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  description?: string;
}

export function ImageUploadField(props: ImageUploadFieldProps) {
  const label = props?.label || "";
  const value = props?.value || "";
  const onChange = props?.onChange || (() => {});
  const description = props?.description;
  const { uploadImage } = useContent();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    const res = await uploadImage(file);
    setUploading(false);

    if (res.success && res.url) {
      onChange(res.url);
    } else {
      setError(res.error || 'Failed to upload image');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
          {label}
        </label>
        <div className="flex items-center gap-1 text-[11px] bg-neutral-100 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${activeTab === 'url' ? 'bg-white shadow-xs text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${activeTab === 'upload' ? 'bg-white shadow-xs text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            Upload File
          </button>
        </div>
      </div>

      {description && (
        <p className="text-xs text-neutral-500">{description}</p>
      )}

      {activeTab === 'url' ? (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <LinkIcon size={14} />
          </div>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/... or /uploads/..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent font-mono bg-white"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 transition-colors text-xs font-semibold text-neutral-700 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin text-neutral-900" />
                Uploading image...
              </>
            ) : (
              <>
                <Upload size={16} className="text-neutral-600" />
                Click to upload image (max 5MB)
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}

      {/* Image Preview Thumbnail */}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="h-12 w-12 rounded bg-neutral-200 overflow-hidden shrink-0 relative border border-neutral-300">
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                // hide broken images
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-800 font-mono truncate">{value}</p>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <Check size={12} /> Image preview active
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
