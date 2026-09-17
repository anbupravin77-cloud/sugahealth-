const fs = require('fs');
let content = fs.readFileSync('src/pages/doctor/Queue.tsx', 'utf8');

const importAnchor = "import { Loader2, Clock, CheckCircle2, ChevronRight, User, AlertCircle, Calendar } from 'lucide-react';";
if (content.includes(importAnchor)) {
  content = content.replace(importAnchor, "import { Loader2, Clock, CheckCircle2, ChevronRight, User, AlertCircle, Calendar, RefreshCw } from 'lucide-react';\nimport RefillRequests from './RefillRequests';");
} else {
  // alternative
  const otherAnchor = "import { Link } from 'react-router-dom';";
  content = content.replace(otherAnchor, "import { Link } from 'react-router-dom';\nimport RefillRequests from './RefillRequests';\nimport { RefreshCw } from 'lucide-react';");
}

const stateAnchor = "  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');";
const replaceState = "  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'refills'>('pending');";
content = content.replace(stateAnchor, replaceState);

const tabAnchor = `            <button
              onClick={() => setActiveTab('completed')}
              className={\`flex items-center gap-2 px-6 py-3 font-medium transition-colors \${
                activeTab === 'completed'
                  ? 'border-b-2 border-neutral-950 text-neutral-950'
                  : 'text-neutral-500 hover:text-neutral-900'
              }\`}
            >
              <CheckCircle2 size={18} /> Completed Consults
            </button>`;

const newTabs = tabAnchor + `
            <button
              onClick={() => setActiveTab('refills')}
              className={\`flex items-center gap-2 px-6 py-3 font-medium transition-colors \${
                activeTab === 'refills'
                  ? 'border-b-2 border-neutral-950 text-neutral-950'
                  : 'text-neutral-500 hover:text-neutral-900'
              }\`}
            >
              <RefreshCw size={18} /> Refill Requests
            </button>`;

content = content.replace(tabAnchor, newTabs);

const tabContentAnchor = `{/* Completed Consults Tab */}`;
const newTabContent = `
        {/* Refills Tab */}
        {activeTab === 'refills' && (
          <RefillRequests />
        )}
`;

content = content.replace(tabContentAnchor, newTabContent + "\n        " + tabContentAnchor);

fs.writeFileSync('src/pages/doctor/Queue.tsx', content);
console.log('Patched doctor queue');
