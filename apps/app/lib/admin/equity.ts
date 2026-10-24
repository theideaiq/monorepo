import { Constants, type Enums } from "@repo/database";
import { z } from "zod";
import {
  int,
  optionalDate,
  optionalDecimal,
  optionalUuid,
  text,
} from "./forms";

export type Instrument = Enums<"equity_instrument">;

export const instruments = Constants.public.Enums.equity_instrument;

/** SAFEs and convertible notes carry an investment, a cap and a discount. */
export const isConvertible = (instrument: string) =>
  instrument === "safe" || instrument === "convertible_note";

export const holderSchema = z
  .object({
    conversionCap: optionalDecimal(0),
    discountRate: optionalDecimal(0).pipe(z.number().max(100).nullable()),
    id: optionalUuid,
    instrument: z.enum(instruments).default("common"),
    investedAmount: optionalDecimal(0),
    name: text(200),
    roundId: optionalUuid,
    shares: int(0),
    type: z.enum(Constants.public.Enums.equity_holder_type),
    vestingStart: optionalDate,
  })
  // A SAFE or note needs the amount invested; shares come at conversion.
  .refine(
    (holder) =>
      !isConvertible(holder.instrument) || holder.investedAmount !== null,
    { path: ["investedAmount"] }
  )
  .transform((holder) =>
    isConvertible(holder.instrument)
      ? holder
      : {
          ...holder,
          conversionCap: null,
          discountRate: null,
          investedAmount: null,
        }
  );
