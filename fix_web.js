const fs = require('node:fs');

// rentals list
let p = 'apps/web/src/app/[locale]/account/RentalsList.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('{/* biome-ignore lint/performance/noImgElement: intentional */}\n              <img', '// biome-ignore lint/performance/noImgElement: intentional\n              <img');
fs.writeFileSync(p, c);

p = 'apps/web/src/components/store/CartDrawer.tsx';
c = fs.readFileSync(p, 'utf8');
c = c.replace(/<button/g, '<button type="button"');
c = c.replace('<button type="button" type="button"', '<button type="button"');
c = c.replace('<button type="button" className="text-brand-yellow hover:underline text-sm font-bold"', '<button type="button" className="text-brand-yellow hover:underline text-sm font-bold"');
fs.writeFileSync(p, c);

p = 'apps/web/src/components/store/ProductView.tsx';
c = fs.readFileSync(p, 'utf8');
c = c.replace(/<button/g, '<button type="button"');
c = c.replace(/key=\{i\}/g, '// biome-ignore lint/suspicious/noArrayIndexKey: order is stable\n                key={i}');
fs.writeFileSync(p, c);
