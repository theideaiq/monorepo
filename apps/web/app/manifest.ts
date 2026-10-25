import { project } from "@repo/config";
import { themeColor } from "@repo/design-system/lib/brand";
import type { MetadataRoute } from "next";

/**
 * Installing the website to a phone's home screen opens it full screen,
 * like an app, on the storefront.
 */
const manifest = (): MetadataRoute.Manifest => ({
  background_color: "#FBF8EF",
  display: "standalone",
  icons: [
    {
      purpose: "any",
      sizes: "any",
      src: "/brand/app-icon.svg",
      type: "image/svg+xml",
    },
  ],
  name: project.name,
  orientation: "portrait",
  short_name: project.name,
  start_url: "/",
  theme_color: themeColor,
});

export default manifest;
