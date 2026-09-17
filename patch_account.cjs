const fs = require('fs');
let content = fs.readFileSync('src/pages/Account.tsx', 'utf8');

const importAnchor = "import OrdersList from './patient/OrdersList';";
if (content.includes(importAnchor)) {
  content = content.replace(importAnchor, importAnchor + "\nimport SubscriptionsList from './patient/SubscriptionsList';");
}

const tabButtonAnchor = "<button\n                  onClick={() => setActiveTab('notifications')}";
const subTabButton = `
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={\`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors \${
                    activeTab === 'subscriptions'
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }\`}
                >
                  <RefreshCw className="mr-3 inline-block h-4 w-4" />
                  Subscriptions
                </button>
`;
if (content.includes(tabButtonAnchor)) {
  content = content.replace(tabButtonAnchor, subTabButton + "                " + tabButtonAnchor);
}

const notificationsTabRenderAnchor = "{/* Notifications Tab */}";
const subTabRender = `
              {/* Subscriptions Tab */}
              {activeTab === 'subscriptions' && (
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Subscriptions & Treatment Plans</h2>
                  <SubscriptionsList />
                </div>
              )}
`;
if (content.includes(notificationsTabRenderAnchor)) {
  content = content.replace(notificationsTabRenderAnchor, subTabRender + "\n              " + notificationsTabRenderAnchor);
}

fs.writeFileSync('src/pages/Account.tsx', content);
