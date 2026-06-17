const fs = require('node:fs');

let p = 'apps/web/src/components/checkout/CheckoutFlow.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('<button className="text-sm text-brand-yellow font-medium">', '<button type="button" className="text-sm text-brand-yellow font-medium">');
fs.writeFileSync(p, c);

p = 'apps/web/src/components/store/CartDrawer.tsx';
c = fs.readFileSync(p, 'utf8');
c = c.replace(/<button\n                  onClick=\{\(\) => removeItem\(item\.id\)\}/g, '<button type="button"\n                  onClick={() => removeItem(item.id)}');
c = c.replace(/<button\n                    onClick=\{\(\) => updateQuantity\(item\.id, item\.quantity - 1\)\}/g, '<button type="button"\n                    onClick={() => updateQuantity(item.id, item.quantity - 1)}');
c = c.replace(/<button\n                    onClick=\{\(\) => updateQuantity\(item\.id, item\.quantity \+ 1\)\}/g, '<button type="button"\n                    onClick={() => updateQuantity(item.id, item.quantity + 1)}');
fs.writeFileSync(p, c);
