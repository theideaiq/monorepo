import React from 'react';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
      bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden
      hover:shadow-xl hover:-translate-y-1 transition-all duration-300
      ${className}
    `}
    >
      {children}
    </div>
  );
}
