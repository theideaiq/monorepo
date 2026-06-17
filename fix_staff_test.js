const fs = require('node:fs');
const file = 'apps/admin/src/actions/staff.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("'Only Superadmins can change roles',", "'Unauthorized: Insufficient permissions',");
content = content.replace("toThrow(\n      'Unauthorized',\n    )", "toThrow('Authentication required: No user session found')");

fs.writeFileSync(file, content);
