const fs = require('node:fs');

let p = 'apps/web/src/app/[locale]/plus/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('<li\n                    key={f}', '// biome-ignore lint/suspicious/noArrayIndexKey: order is stable\n                  <li\n                    key={f}');
fs.writeFileSync(p, c);
