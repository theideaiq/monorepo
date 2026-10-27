import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// The IDEA Design: The IDEA brand v1.0 colours and font (docs/brand/tokens.json)
// in place of Storybook's own. Storybook's theme API takes literal values.
addons.setConfig({
  theme: create({
    appBg: "#fbf8ef",
    appBorderColor: "#e4dfd0",
    appBorderRadius: 10,
    appContentBg: "#ffffff",
    barBg: "#ffffff",
    barSelectedColor: "#d81b60",
    base: "light",
    brandTarget: "_self",
    brandTitle:
      '<span style="display:inline-flex;align-items:center;gap:8px;font-weight:700"><span style="display:inline-block;width:14px;height:14px;border-radius:22%;background:#d81b60"></span>The IDEA Design</span>',
    brandUrl: "/",
    colorPrimary: "#d81b60",
    colorSecondary: "#d81b60",
    fontBase:
      "'Readex Pro', Cairo, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    textColor: "#0f1014",
    textMutedColor: "#5b5d66",
  }),
});
