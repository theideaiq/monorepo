import { Toaster } from "@repo/design-system/components/ui/sonner";
import { TooltipProvider } from "@repo/design-system/components/ui/tooltip";
import { ThemeProvider } from "@repo/design-system/providers/theme";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";

import "@repo/design-system/styles/globals.css";

/**
 * Every story is checked on both themes (Theme) and in both reading
 * directions (Direction): The IDEA ships in Arabic (RTL, the default
 * language) and English (LTR).
 */
const preview: Preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: "light",
      themes: {
        dark: "dark",
        light: "light",
      },
    }),
    (Story, context) => {
      const dir = context.globals.direction === "rtl" ? "rtl" : "ltr";
      return (
        <div
          className="bg-background font-sans text-foreground"
          dir={dir}
          lang={dir === "rtl" ? "ar" : "en"}
        >
          <ThemeProvider>
            <TooltipProvider>
              <Story />
            </TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </div>
      );
    },
  ],
  globalTypes: {
    direction: {
      description: "Text direction",
      toolbar: {
        dynamicTitle: true,
        icon: "transfer",
        items: [
          { title: "LTR (English)", value: "ltr" },
          { title: "RTL (Arabic)", value: "rtl" },
        ],
      },
    },
  },
  initialGlobals: { direction: "ltr" },
  parameters: {
    chromatic: {
      modes: {
        dark: {
          className: "dark",
          theme: "dark",
        },
        light: {
          className: "light",
          theme: "light",
        },
        "light rtl": {
          direction: "rtl",
          theme: "light",
        },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ["The IDEA Design", ["Introduction", "Emails"], "*"],
      },
    },
  },
};

export default preview;
