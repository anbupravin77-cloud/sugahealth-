import { useState, useEffect, useCallback } from 'react';
import { useContent } from '../../context/ContentContext';
import { AdminHeader } from './AdminHeader';
import { GlobalTab } from './tabs/GlobalTab';
import { HomeTab } from './tabs/HomeTab';
import { WeightLossTab } from './tabs/WeightLossTab';
import { HairGrowthTab } from './tabs/HairGrowthTab';
import { SexualHealthTab } from './tabs/SexualHealthTab';
import { AboutTab } from './tabs/AboutTab';
import { ProductsTab } from './tabs/ProductsTab';
import { DoctorsTab } from './tabs/DoctorsTab';
import { SeoTab } from './tabs/SeoTab';
import { BackupTab } from './tabs/BackupTab';
import { StaffTab } from './tabs/StaffTab';
import { ConsultationsTab } from './tabs/ConsultationsTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { 
  Globe, 
  Home, 
  Scale, 
  Sparkles, 
  Heart, 
  Info, 
  Pill, 
  Users, 
  Search, 
  Database,
  Shield,
  Activity,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings
} from 'lucide-react';
import { SugaWebsiteContent } from '../../types/content';

export default function Admin() {
  const { 
    content, 
    draftContent, 
    isLoading, 
    updateDraft, 
    saveDraft,
    resetToDefaults,
    hasUnpublishedChanges 
  } = useContent();

  const [activeTab, setActiveTab] = useState<
    'global' | 'home' | 'weight' | 'hair' | 'sexual' | 'about' | 'products' | 'doctors' | 'seo' | 'backup' | 'staff' | 'consultations' | 'integrations'
  >('consultations');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local working copy initialized from draftContent or published content
  const [workingCopy, setWorkingCopy] = useState<SugaWebsiteContent | null>(null);

  useEffect(() => {
    if (draftContent) {
      setWorkingCopy(draftContent);
    } else if (content) {
      setWorkingCopy(content);
    }
  }, [draftContent, content]);

  const handleWorkingCopyChange = (updated: SugaWebsiteContent) => {
    setWorkingCopy(updated);
    updateDraft(updated);
  };

  const handleSaveDraft = useCallback(async () => {
    if (!workingCopy) return;
    setSaving(true);
    setErrorMessage(null);

    const res = await saveDraft(workingCopy);
    setSaving(false);

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to save draft to server');
    }
  }, [workingCopy, saveDraft]);

  // Keyboard shortcut Ctrl+S or Cmd+S to save draft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveDraft]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-neutral-900" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Loading Suga CMS...
          </span>
        </div>
      </div>
    );
  }

  if (!workingCopy) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p className="text-xs text-neutral-500">Initializing content store...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'consultations', label: 'Clinical Ops', icon: Activity },
    { id: 'staff', label: 'Staff Directory', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Settings },
    { id: 'home', label: 'Home Page', icon: Home },
    { id: 'weight', label: 'Weight Loss', icon: Scale },
    { id: 'hair', label: 'Hair Growth', icon: Sparkles },
    { id: 'sexual', label: 'Sexual Health', icon: Heart },
    { id: 'about', label: 'About Suga', icon: Info },
    { id: 'products', label: 'Formulary Products', icon: Pill },
    { id: 'doctors', label: 'Medical Board', icon: Users },
    { id: 'global', label: 'Global & Footer', icon: Globe },
    { id: 'seo', label: 'SEO & Metadata', icon: Search },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-neutral-100/90 text-neutral-900 flex flex-col selection:bg-neutral-950 selection:text-white">
      {/* Sticky Top Header */}
      <AdminHeader
        onSaveDraft={handleSaveDraft}
        saving={saving}
        savedSuccess={savedSuccess}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Alerts / feedback */}
        {savedSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Draft successfully saved to the server. You can preview changes before publishing live.</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-mono">⌘S saved</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Layout Grid: Sidebar Navigation + Main Editor Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs sticky lg:top-20 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Content Sections
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-neutral-950 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-neutral-400'} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-neutral-100 px-3 pb-2 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Auto-backup:</span>
                <span className="text-neutral-700 font-medium">Atomic JSON</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shortcut:</span>
                <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-[10px] text-neutral-600">Ctrl+S / ⌘S</span>
              </div>
            </div>
          </div>

          {/* Editor Workspace Panel */}
          <div className="lg:col-span-9">
            {activeTab === 'consultations' && (
              <ConsultationsTab />
            )}

            {activeTab === 'staff' && (
              <StaffTab />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsTab />
            )}

            {activeTab === 'global' && (
              <GlobalTab
                data={workingCopy.global}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, global: updated })}
              />
            )}

            {activeTab === 'home' && (
              <HomeTab
                data={workingCopy.home}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, home: updated })}
              />
            )}

            {activeTab === 'weight' && (
              <WeightLossTab
                data={workingCopy.weightLoss}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, weightLoss: updated })}
              />
            )}

            {activeTab === 'hair' && (
              <HairGrowthTab
                data={workingCopy.hairGrowth}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, hairGrowth: updated })}
              />
            )}

            {activeTab === 'sexual' && (
              <SexualHealthTab
                data={workingCopy.sexualHealth}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, sexualHealth: updated })}
              />
            )}

            {activeTab === 'about' && (
              <AboutTab
                data={workingCopy.about}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, about: updated })}
              />
            )}

            {activeTab === 'products' && (
              <ProductsTab
                products={workingCopy.products}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, products: updated })}
              />
            )}

            {activeTab === 'doctors' && (
              <DoctorsTab
                doctors={workingCopy.doctors}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, doctors: updated })}
              />
            )}

            {activeTab === 'seo' && (
              <SeoTab
                data={workingCopy.seo}
                onChange={(updated) => handleWorkingCopyChange({ ...workingCopy, seo: updated })}
              />
            )}

            {activeTab === 'backup' && (
              <BackupTab
                content={workingCopy}
                onImport={(imported) => handleWorkingCopyChange(imported)}
                onResetToDefault={resetToDefaults}
              />
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
