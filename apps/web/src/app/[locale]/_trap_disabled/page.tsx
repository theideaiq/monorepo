import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [];
}

export default function CatchAll() {
  // This tells Next.js: "This isn't a real page, show the Not Found UI"
  notFound();
}
