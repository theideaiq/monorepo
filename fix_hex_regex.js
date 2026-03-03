const fs = require('node:fs');
const file = 'packages/utils/src/string.ts';
let content = fs.readFileSync(file, 'utf8');

// Change NUMERIC_ENTITY_REGEX
content = content.replace('const NUMERIC_ENTITY_REGEX = /^&#\\d+;$/;', 'const NUMERIC_ENTITY_REGEX = /^&#[xX]?[0-9a-fA-F]+;$/;');

// Change the logic to parse Hex or Decimal correctly
content = content.replace('      return String.fromCodePoint(Number.parseInt(match.slice(2, -1), 10));', '      const isHex = match[2].toLowerCase() === "x";\n      const num = Number.parseInt(match.slice(isHex ? 3 : 2, -1), isHex ? 16 : 10);\n      return String.fromCodePoint(num);');

fs.writeFileSync(file, content);
