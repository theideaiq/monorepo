const fs = require('node:fs');
const file = 'apps/admin/src/app/crm/contacts/ContactsTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<img/g, '{/* biome-ignore lint/performance/noImgElement: user avatar */}\n<img');
content = content.replace('<label className="block text-sm font-medium text-slate-700 mb-1.5">', '<label htmlFor="crm_tags" className="block text-sm font-medium text-slate-700 mb-1.5">');
content = content.replace('  const columns = useMemo<ColumnDef<Profile>[]>(', '  // biome-ignore lint/correctness/useExhaustiveDependencies: static structure\n  const columns = useMemo<ColumnDef<Profile>[]>(');
content = content.replace('      console.error(error);', '      // biome-ignore lint/suspicious/noConsole: generic error\n      console.error(error);');

fs.writeFileSync(file, content);
