import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const PASS_TYPE_ID = /^pass\.[\w.-]+$/;
const TEAM_ID = /^[A-Z0-9]{10}$/;

/**
 * Apple Wallet (Apple Developer → Certificates, Identifiers & Profiles):
 * a Pass Type ID, its certificate and private key, and Apple's WWDR
 * intermediate certificate (G4). Each PEM may be given as is or as base64
 * of it. "Add to Apple Wallet" is hidden while any is unset. See
 * ARCHITECTURE_AND_INTEGRATIONS.md, "Apple Wallet".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      APPLE_WALLET_CERTIFICATE: process.env.APPLE_WALLET_CERTIFICATE,
      APPLE_WALLET_KEY: process.env.APPLE_WALLET_KEY,
      APPLE_WALLET_PASS_TYPE_ID: process.env.APPLE_WALLET_PASS_TYPE_ID,
      APPLE_WALLET_TEAM_ID: process.env.APPLE_WALLET_TEAM_ID,
      APPLE_WALLET_WWDR: process.env.APPLE_WALLET_WWDR,
    },
    server: {
      // The Pass Type ID certificate (PEM, or base64 of it).
      APPLE_WALLET_CERTIFICATE: z.string().min(1).optional(),
      // Its private key, unencrypted (PEM, or base64 of it).
      APPLE_WALLET_KEY: z.string().min(1).optional(),
      // The Pass Type ID, e.g. pass.com.theideaiq.pass.
      APPLE_WALLET_PASS_TYPE_ID: z.string().regex(PASS_TYPE_ID).optional(),
      // The Apple Developer team ID (10 characters).
      APPLE_WALLET_TEAM_ID: z.string().regex(TEAM_ID).optional(),
      // Apple Worldwide Developer Relations G4 (PEM, or base64 of it).
      APPLE_WALLET_WWDR: z.string().min(1).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
