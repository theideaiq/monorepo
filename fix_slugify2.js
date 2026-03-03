const fs = require('node:fs');
const file = 'packages/utils/src/string.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('export function slugify(text: string): string {\n  return text', 'export function slugify(text: string): string {\n  if (!text) return \'\';\n  return text');

fs.writeFileSync(file, content);
