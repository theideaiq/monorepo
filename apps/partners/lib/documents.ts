/** The printable documents of Partners, at /documents/<kind>/<id>. */
export const documentKinds = ["quote", "order", "invoice"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const isDocumentKind = (value: string): value is DocumentKind =>
  (documentKinds as readonly string[]).includes(value);
