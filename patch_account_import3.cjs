const fs = require('fs');
let content = fs.readFileSync('src/pages/Account.tsx', 'utf8');

content = content.replace("import { OrdersList } from './patient/OrdersList';", "import { OrdersList } from './patient/OrdersList';\nimport SubscriptionsList from './patient/SubscriptionsList';");
fs.writeFileSync('src/pages/Account.tsx', content);
