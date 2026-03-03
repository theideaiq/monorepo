const fs = require('node:fs');
const file = 'apps/admin/src/lib/auth-checks.ts';
let content = fs.readFileSync(file, 'utf8');

// Remove the hasAdminAccess function definition
const regex = /\/\*\*\n \* Checks if the provided role.*?}\n/s;
content = content.replace(regex, '');

fs.writeFileSync(file, content);
