const fs = require('node:fs');

// 1. Remove hasAdminAccess from auth-checks.ts
let file = 'apps/admin/src/lib/auth-checks.ts';
let content = fs.readFileSync(file, 'utf8');
const regex = /\/\*\*\n \* Checks if the provided role.*?\n}/s;
content = content.replace(regex, '');
content = "import { hasAdminAccess } from './auth-utils';\n" + content;
fs.writeFileSync(file, content);

// 2. Fix auth-checks.test.ts
file = 'apps/admin/src/lib/auth-checks.test.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace("import { hasAdminAccess } from './auth-checks';", "import { hasAdminAccess } from './auth-utils';");
fs.writeFileSync(file, content);
