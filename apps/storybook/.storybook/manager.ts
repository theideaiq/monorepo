import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// The IDEA Design: The IDEA's colors and fonts
// (packages/design-system/styles/globals.css) in place of Storybook's own.
addons.setConfig({
  theme: create({
    appBg: "#fafafa",
    appBorderColor: "#e4e4e7",
    appBorderRadius: 10,
    appContentBg: "#ffffff",
    barBg: "#ffffff",
    barSelectedColor: "#e91e63",
    base: "light",
    brandTarget: "_self",
    brandTitle:
      '<span style="display:inline-flex;align-items:center;gap:8px;font-weight:700"><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#f4cf08"></span>The IDEA Design</span>',
    brandUrl: "/",
    colorPrimary: "#e91e63",
    colorSecondary: "#e91e63",
    fontBase:
      "Poppins, Cairo, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    textColor: "#0f1014",
    textMutedColor: "#71717a",
  }),
});
