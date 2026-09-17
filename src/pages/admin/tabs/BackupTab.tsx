import React, { useState, ChangeEvent } from 'react';
import { ContentData } from '../../../types/content';
import { Download, Upload, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface BackupTabProps {
  content: ContentData;
  onImport: (restored: ContentData) => void;
  onResetToDefault?: () => void;
}

export function BackupTab(props: BackupTabProps) {
  const content = props?.content || ({} as any);
  const onImport = props?.onImport || (() => {});
  const onResetToDefault = props?.onResetToDefault || (() => {});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `suga-health-content-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Content JSON snapshot downloaded successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Failed to export content: ' + err.message);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], 'UTF-8');
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.home || !parsed.about || !parsed.products) {
          throw new Error('Invalid Suga.Health backup file structure.');
        }

        if (true) {
          onImport(parsed);
          setSuccessMsg('Backup imported successfully into editor draft.');
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      } catch (err: any) {
        setErrorMsg('Error reading backup file: ' + err.message);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    };
  };

  const handleReset = () => {
    if (true) {
      if (onResetToDefault) {
        onResetToDefault();
      }
      setSuccessMsg('Website content draft reset to initial defaults.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-3">
        <h3 className="font-sans text-base font-bold text-neutral-950 flex items-center gap-2">
          <Download size={18} /> Export Content Snapshot
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
          Download a complete JSON export of all current live and draft website copy, clinical protocols, physician profiles, and SEO metadata. Use this before major marketing overhauls.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Download size={14} /> Download Backup JSON
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-3">
        <h3 className="font-sans text-base font-bold text-neutral-950 flex items-center gap-2">
          <Upload size={18} /> Restore from Backup JSON
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
          Upload a previously downloaded JSON snapshot. This loads the saved content directly into your editor where you can preview and publish it.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer">
          <Upload size={14} /> Choose Backup File (.json)
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Factory Reset */}
      {onResetToDefault && (
        <div className="bg-white p-6 rounded-2xl border border-red-200 space-y-3">
          <h3 className="font-sans text-base font-bold text-red-700 flex items-center gap-2">
            <RefreshCw size={18} /> Reset to Initial Factory Defaults
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-xl">
            Restore all medical copy, doctors, formulary pricing, and timelines back to the original Suga.Health master release defaults.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} /> Reset Entire Site to Default
          </button>
        </div>
      )}
    </div>
  );
}
