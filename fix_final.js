const fs = require('node:fs');

let p = 'apps/admin/src/app/login/page.test.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('// biome-ignore lint/suspicious/noExplicitAny: mock\n  export const Button', '  // biome-ignore lint/suspicious/noExplicitAny: mock\n  export const Button');
fs.writeFileSync(p, c);

p = 'apps/admin/src/app/marketing/segments/SegmentForm.tsx';
c = fs.readFileSync(p, 'utf8');
c = c.replace('} catch (e: any) {', '// biome-ignore lint/suspicious/noExplicitAny: generic\n    } catch (e: any) {');
fs.writeFileSync(p, c);
