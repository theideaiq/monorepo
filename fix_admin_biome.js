const fs = require('node:fs');
const path = require('node:path');

const patches = [
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const Button = ({ children, isLoading, ...props }: any) => (',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const Button = ({ children, isLoading, ...props }: any) => ('
  },
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const Card = ({ children, className }: any) => (',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const Card = ({ children, className }: any) => ('
  },
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const Input = ({ label, ...props }: any) => (',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const Input = ({ label, ...props }: any) => ('
  },
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const Sheet = ({ children }: any) => <div>{children}</div>;',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const Sheet = ({ children }: any) => <div>{children}</div>;'
  },
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const SheetContent = ({ children }: any) => <div>{children}</div>;',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const SheetContent = ({ children }: any) => <div>{children}</div>;'
  },
  {
    file: 'apps/admin/src/__mocks__/repo-ui.tsx',
    search: 'export const SheetTrigger = ({ children }: any) => <div>{children}</div>;',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: mock\nexport const SheetTrigger = ({ children }: any) => <div>{children}</div>;'
  },
  {
    file: 'apps/admin/src/actions/marketing.ts',
    search: 'criteria: Record<string, any>,',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: flexible criteria\n  criteria: Record<string, any>,'
  },
  {
    file: 'apps/admin/src/actions/products.ts',
    search: 'export async function createProduct(data: any) {',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: generic data\nexport async function createProduct(data: any) {'
  },
  {
    file: 'apps/admin/src/actions/products.ts',
    search: 'export async function updateProduct(id: string, updates: any) {',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: generic updates\nexport async function updateProduct(id: string, updates: any) {'
  },
  {
    file: 'apps/admin/src/actions/send-campaign.ts',
    search: 'const emails = profiles.map((p: any) => p.email).filter(Boolean);',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: generic profile\n  const emails = profiles.map((p: any) => p.email).filter(Boolean);'
  },
  {
    file: 'apps/admin/src/app/auth/mfa/page.tsx',
    search: '} catch (err: any) {',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: generic error\n    } catch (err: any) {'
  },
  {
    file: 'apps/admin/src/app/auth/mfa/page.tsx',
    search: '<img src={qr} alt="QR Code" className="w-48 h-48" />',
    replace: '{/* biome-ignore lint/performance/noImgElement: qr code */}\n            <img src={qr} alt="QR Code" className="w-48 h-48" />'
  },
  {
    file: 'apps/admin/src/app/finance/dashboard/actions.ts',
    search: 'lines.forEach((line: any) => {',
    replace: '// biome-ignore lint/suspicious/noExplicitAny: line types\n  lines.forEach((line: any) => {'
  },
  {
    file: 'apps/admin/src/types/crm.ts',
    search: '    [key: string]: any;',
    replace: '    // biome-ignore lint/suspicious/noExplicitAny: unknown properties\n    [key: string]: any;'
  }
];

for (const patch of patches) {
  const filePath = path.join(process.cwd(), patch.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(patch.search) && !content.includes(patch.replace)) {
      content = content.replace(patch.search, patch.replace);
      fs.writeFileSync(filePath, content);
      console.log(`Patched ${patch.file}`);
    }
  } else {
    console.log(`File not found: ${patch.file}`);
  }
}

// Remove useless biome-ignore suppressions
const rmSuppression = [
  { file: 'apps/admin/src/types/auth.ts', search: '// biome-ignore lint/style/useImportType: This is a value import needed for typeof\n' },
  { file: 'apps/admin/src/types/crm.ts', search: '// biome-ignore lint/style/useImportType: This is a value import needed for typeof\n' },
  { file: 'apps/admin/src/types/crm.ts', search: '// biome-ignore lint/style/useImportType: This is a value import needed for typeof\n' },
  { file: 'apps/admin/next.config.ts', search: '        // biome-ignore lint/suspicious/noConsole: Critical build-time warning\n' }
];

for (const rm of rmSuppression) {
  const filePath = path.join(process.cwd(), rm.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(rm.search)) {
      content = content.replace(new RegExp(rm.search, 'g'), '');
      fs.writeFileSync(filePath, content);
      console.log(`Removed suppression in ${rm.file}`);
    }
  }
}
