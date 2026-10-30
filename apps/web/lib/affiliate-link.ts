const CODE = /^[A-Z0-9]{4,20}$/;

/** An affiliate's code as coupons store it, or null when it can't be one. */
export const affiliateCode = (value: string) => {
  const clean = value.trim().toUpperCase();
  return CODE.test(clean) ? clean : null;
};
