const fs = require('fs');
let content = fs.readFileSync('src/server/notificationTemplates.ts', 'utf8');

const anchor = '| \'NEW_MESSAGE\';';
const newTypes = `| 'NEW_MESSAGE'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'REFILL_SUBMITTED';`;

content = content.replace(anchor, newTypes);
fs.writeFileSync('src/server/notificationTemplates.ts', content);
