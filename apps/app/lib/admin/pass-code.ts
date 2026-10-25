const NON_DIGITS = /\D/g;

/**
 * What `check_pass` expects from a counter: the card's QR text as scanned
 * (`IDEA:<member number>:<code>`), or the member number and the 6-digit
 * code typed in.
 */
export const scannedPass = (
  scanned: string | undefined,
  code: string | undefined
) => {
  if (scanned?.startsWith("IDEA:")) {
    return scanned;
  }
  const digits = (value: string | undefined) =>
    (value ?? "").replace(NON_DIGITS, "");
  return `IDEA:${digits(scanned)}:${digits(code)}`;
};
