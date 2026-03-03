const fs = require('node:fs');

let p = 'apps/web/src/components/checkout/SubscriptionCard.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('{/* biome-ignore lint/suspicious/noArrayIndexKey: order is managed carefully */}', '// biome-ignore lint/suspicious/noArrayIndexKey: order is managed carefully');
fs.writeFileSync(p, c);

p = 'apps/web/src/app/[locale]/plus/page.tsx';
c = fs.readFileSync(p, 'utf8');
c = c.replace('// biome-ignore lint/suspicious/noArrayIndexKey: static order', '');
c = c.replace('<li\n                    key={f}', '{/* biome-ignore lint/suspicious/noArrayIndexKey: order is stable */}\n                  <li\n                    key={f}');
fs.writeFileSync(p, c);
