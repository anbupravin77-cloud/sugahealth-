const fs = require('fs');
let content = fs.readFileSync('src/pages/Account.tsx', 'utf8');

if (!content.includes('import SubscriptionsList')) {
  content = content.replace("import OrdersList from './patient/OrdersList';", "import OrdersList from './patient/OrdersList';\nimport SubscriptionsList from './patient/SubscriptionsList';");
  fs.writeFileSync('src/pages/Account.tsx', content);
} else {
  console.log('Already has import');
}
