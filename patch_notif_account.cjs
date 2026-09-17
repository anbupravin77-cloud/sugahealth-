const fs = require('fs');
let content = fs.readFileSync('src/pages/patient/NotificationPreferences.tsx', 'utf8');

const anchor = "order_status: { email: true, sms: false, push: true }";
if (!content.includes('subscriptions: {')) {
    const replacement = "order_status: { email: true, sms: false, push: true },\n    subscriptions: { email: true, sms: false, push: true }";
    content = content.replace(anchor, replacement);
}

const uiAnchor = `{/* Order Status Settings */}`;
if (!content.includes('Subscriptions & Refills')) {
    const newUI = `
      {/* Subscriptions */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
          <div className="bg-neutral-100 p-2 rounded-lg">
            <RefreshCw className="h-5 w-5 text-neutral-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">Subscriptions & Refills</h3>
            <p className="text-sm text-neutral-500">Updates about recurring billing and refill requests.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
            <span className="text-sm font-medium text-neutral-700">Email</span>
            <input
              type="checkbox"
              checked={prefs.subscriptions?.email || false}
              onChange={(e) => updatePref('subscriptions', 'email', e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
            <span className="text-sm font-medium text-neutral-700">SMS</span>
            <input
              type="checkbox"
              checked={prefs.subscriptions?.sms || false}
              onChange={(e) => updatePref('subscriptions', 'sms', e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
            <span className="text-sm font-medium text-neutral-700">In-App</span>
            <input
              type="checkbox"
              checked={prefs.subscriptions?.push || false}
              onChange={(e) => updatePref('subscriptions', 'push', e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
            />
          </label>
        </div>
      </div>
`;
    content = content.replace(uiAnchor, newUI + "\n      " + uiAnchor);
}
if (!content.includes('RefreshCw')) {
    const importAnchor = "import { Bell, Loader2, Save } from 'lucide-react';";
    content = content.replace(importAnchor, "import { Bell, Loader2, Save, RefreshCw } from 'lucide-react';");
}

fs.writeFileSync('src/pages/patient/NotificationPreferences.tsx', content);
