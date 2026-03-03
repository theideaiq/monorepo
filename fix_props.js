const fs = require('node:fs');
const file = 'apps/admin/src/app/finance/dashboard/components/CashFlowChartWrapper.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('_endDate,', '// biome-ignore lint/correctness/noUnusedFunctionParameters: unused prop\n  endDate,');
content = content.replace('_endDate: string;', 'endDate: string;');

fs.writeFileSync(file, content);
