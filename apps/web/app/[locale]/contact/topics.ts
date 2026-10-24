/** What a contact message is about; labels are in `web.contact.form.topics`. */
export const contactTopics = [
  "general",
  "store",
  "plus",
  "academy",
  "suite",
  "careers",
  "press",
] as const;

export type ContactTopic = (typeof contactTopics)[number];

/** The topic named in `?topic=`, if it is one of ours. */
export const parseTopic = (value: unknown): ContactTopic =>
  contactTopics.includes(value as ContactTopic)
    ? (value as ContactTopic)
    : "general";
