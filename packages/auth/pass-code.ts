const NON_DIGITS = /\D/g;
// A student check's code (from /verify): its QR text or the 8 characters
// typed, with or without the dash (always with a letter, unlike a Pass
// number).
const STUDENT_CODE =
  /^(student:)?(?=.*[a-hj-np-z])[a-hj-np-z2-9]{4}[\s-]?[a-hj-np-z2-9]{4}$/i;

/**
 * What `check_pass` expects from a counter: the card's QR text as scanned
 * (`IDEA:<member number>:<code>`), or the member number and the 6-digit
 * code typed in; or a student check's code, passed as it is.
 */
export const scannedPass = (
  scanned: string | undefined,
  code: string | undefined
) => {
  if (scanned?.startsWith("IDEA:")) {
    return scanned;
  }
  if (scanned && STUDENT_CODE.test(scanned.trim())) {
    return scanned.trim();
  }
  const digits = (value: string | undefined) =>
    (value ?? "").replace(NON_DIGITS, "");
  return `IDEA:${digits(scanned)}:${digits(code)}`;
};
