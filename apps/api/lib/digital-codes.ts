import type { createAdminClient } from "@repo/database/admin";
import { env } from "@/env";
import {
  createReloadlyClient,
  type ReloadlyClient,
  ReloadlyError,
} from "./reloadly/client";

type AdminClient = ReturnType<typeof createAdminClient>;

interface Logger {
  error: (message: string) => void;
}

export interface DigitalCodesRun {
  delivered: number;
  failed: number;
  skipped: number;
}

/** The Reloadly client, or null while its keys are unset. */
export const reloadlyFromEnv = (): ReloadlyClient | null =>
  env.RELOADLY_CLIENT_ID && env.RELOADLY_CLIENT_SECRET
    ? createReloadlyClient({
        clientId: env.RELOADLY_CLIENT_ID,
        clientSecret: env.RELOADLY_CLIENT_SECRET,
        environment: env.RELOADLY_ENVIRONMENT,
      })
    : null;

const reason = (error: unknown) => {
  if (error instanceof ReloadlyError) {
    return `Reloadly ${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
};

interface TakenCode {
  code_id: string;
  face_value: number;
  supplier: string;
  supplier_product_id: string;
}

/** Buys one code from its supplier and stores it, or records why not. */
const buyOne = async ({
  admin,
  code,
  logger,
  reloadly,
}: {
  admin: AdminClient;
  code: TakenCode;
  logger: Logger;
  reloadly: ReloadlyClient;
}): Promise<keyof DigitalCodesRun> => {
  if (code.supplier !== "reloadly") {
    // LikeCard and Golden Codes come later: Staff see it as failed.
    await admin.rpc("fail_digital_code", {
      reason: `No client for ${code.supplier} yet`,
      target: code.code_id,
    });
    return "skipped";
  }
  try {
    const order = await reloadly.order({
      customIdentifier: code.code_id,
      productId: code.supplier_product_id,
      unitPrice: Number(code.face_value),
    });
    if (order.status !== "SUCCESSFUL") {
      // Not ready (or refused): Staff check it in Reloadly and retry.
      throw new Error(`Order ${order.transactionId} is ${order.status}`);
    }
    const [card] = await reloadly.cards(order.transactionId);
    if (!card?.cardNumber) {
      throw new Error(`Order ${order.transactionId} has no code`);
    }
    const delivered = await admin.rpc("deliver_digital_code", {
      code: card.cardNumber,
      pin: card.pinCode ?? undefined,
      target: code.code_id,
      transaction_id: String(order.transactionId),
    });
    if (delivered.error) {
      throw new Error(`deliver_digital_code: ${delivered.error.message}`);
    }
    return "delivered";
  } catch (error) {
    const why = reason(error);
    logger.error(`Digital code ${code.code_id} failed: ${why}`);
    await admin.rpc("fail_digital_code", { reason: why, target: code.code_id });
    return "failed";
  }
};

/**
 * Buys the paid codes waiting to be bought (`take_digital_codes`), one
 * card each, and stores what the supplier sends (`deliver_digital_code`)
 * or why it couldn't (`fail_digital_code`, which Staff retry). Runs after
 * a payment, from Staff and once a day. Without a supplier's keys, its
 * codes are left as they are.
 */
export const buyDigitalCodes = async ({
  admin,
  logger,
  reloadly,
}: {
  admin: AdminClient;
  logger: Logger;
  reloadly: ReloadlyClient | null;
}): Promise<DigitalCodesRun> => {
  const run: DigitalCodesRun = { delivered: 0, failed: 0, skipped: 0 };
  if (!reloadly) {
    return run;
  }
  const taken = await admin.rpc("take_digital_codes", { batch: 20 });
  if (taken.error) {
    throw new Error(`take_digital_codes: ${taken.error.message}`);
  }

  for (const code of taken.data ?? []) {
    // biome-ignore lint/performance/noAwaitInLoops: one supplier order at a time, so a failure stops nothing else
    const outcome = await buyOne({ admin, code, logger, reloadly });
    run[outcome] += 1;
  }
  return run;
};
