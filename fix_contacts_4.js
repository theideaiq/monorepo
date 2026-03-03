const fs = require('node:fs');
const file = 'apps/admin/src/app/crm/contacts/ContactsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('                // biome-ignore lint/performance/noImgElement: intentional\n', '                {/* biome-ignore lint/performance/noImgElement: intentional */}\n');

fs.writeFileSync(file, content);
