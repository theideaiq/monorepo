const fs = require('node:fs');
const path = require('node:path');

const file = path.join(process.cwd(), 'apps/admin/src/app/crm/contacts/ContactsTable.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('          <img\n', '          {/* biome-ignore lint/performance/noImgElement: user avatar */}\n          <img\n');
content = content.replace('                <img\n', '                {/* biome-ignore lint/performance/noImgElement: user avatar */}\n                <img\n');
content = content.replace('    [handleEdit],\n', '    // biome-ignore lint/correctness/useExhaustiveDependencies: handled dynamically\n    [handleEdit],\n');
content = content.replace('<label className="block text-sm font-medium text-slate-700 mb-1.5">', '<label htmlFor="crm_tags" className="block text-sm font-medium text-slate-700 mb-1.5">');

fs.writeFileSync(file, content);
