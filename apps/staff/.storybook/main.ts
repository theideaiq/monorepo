import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
const getAbsolutePath = (value: string) =>
  dirname(require.resolve(join(value, "package.json")));

/**
 * The build is served at staff.theideaiq.com/design (apps/partners copies
 * storybook-static/ into public/design), so its relative URLs resolve
 * against /design/ whether the page is /design or /design/.
 */
const DESIGN_BASE = '<base href="/design/">';

const withBase = (head: string, { configType }: { configType?: string }) =>
  configType === "PRODUCTION" ? `${DESIGN_BASE}\n${head}` : head;

const config: StorybookConfig = {
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-themes"),
  ],
  // No vendor notices or usage reporting in The IDEA Design.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  framework: {
    name: getAbsolutePath("@storybook/nextjs"),
    options: {},
  },
  managerHead: (head, options) => withBase(head, options),
  previewHead: (head, options) => withBase(head, options),
  staticDirs: ["../assets"],
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
};

export default config;
