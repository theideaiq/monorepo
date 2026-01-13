import { notFound } from 'next/navigation';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ trap: ['not-found'] }];
}

export default function CatchAll() {
  // This tells Next.js: "This isn't a real page, show the Not Found UI"
  notFound();
}
