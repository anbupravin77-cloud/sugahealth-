const fs = require('fs');
let content = fs.readFileSync('src/pages/doctor/PrescriptionBuilder.tsx', 'utf8');

// 1. Add new state for refill eligibility
const stateAnchor = "  const [savedSuccess, setSavedSuccess] = useState(false);";
const stateNew = `
  const [refillEligible, setRefillEligible] = useState(false);
  const [refillIntervalDays, setRefillIntervalDays] = useState(30);
  const [treatmentCategory, setTreatmentCategory] = useState('');
`;
content = content.replace(stateAnchor, stateAnchor + "\n" + stateNew);

// 2. Fetch data properly
const fetchAnchor = `setMedications(data.medications || []);
          setStatus(data.status);`;
const fetchNew = `
          setRefillEligible(data.refillEligible || false);
          setRefillIntervalDays(data.refillIntervalDays || 30);
          setTreatmentCategory(data.treatmentCategory || '');
`;
content = content.replace(fetchAnchor, fetchAnchor + "\n" + fetchNew);

// 3. Save draft payload
const saveAnchor = `body: JSON.stringify({ medications, prescriptionId })`;
const saveNew = `body: JSON.stringify({ medications, prescriptionId, refillEligible, refillIntervalDays, treatmentCategory })`;
content = content.replace(saveAnchor, saveNew);

// 4. Render the toggles in UI
const uiAnchor = `<div className="space-y-6">
        {medications.map((med, index) => (`;
const uiNew = `
        {/* Refill Eligibility Settings */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-2">Treatment & Refill Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Treatment Category</label>
              <input
                type="text"
                value={treatmentCategory}
                onChange={e => setTreatmentCategory(e.target.value)}
                disabled={isLocked}
                placeholder="e.g. Weight Loss Protocol"
                className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-neutral-950 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={refillEligible}
                  onChange={e => setRefillEligible(e.target.checked)}
                  disabled={isLocked}
                  className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
                />
                <span className="ml-3 text-sm font-medium text-neutral-700">Eligible for Subscription Refills</span>
              </label>
            </div>
            
            {refillEligible && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Refill Interval (Days)</label>
                <select
                  value={refillIntervalDays}
                  onChange={e => setRefillIntervalDays(parseInt(e.target.value))}
                  disabled={isLocked}
                  className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm bg-white focus:border-neutral-950 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-500"
                >
                  <option value={15}>15 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}
          </div>
        </div>
`;
content = content.replace(uiAnchor, uiNew + "\n        " + uiAnchor);

fs.writeFileSync('src/pages/doctor/PrescriptionBuilder.tsx', content);
