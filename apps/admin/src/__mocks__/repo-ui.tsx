// biome-ignore lint/style/useImportType: React is used as a value
import React from 'react';

// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const Button = ({ children, isLoading, ...props }: any) => (
  <button {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const Card = ({ children, className }: any) => (
  <div className={className}>{children}</div>
);

// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const Input = ({ label, ...props }: any) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const Sheet = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const SheetContent = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const SheetTrigger = ({ children }: any) => <div>{children}</div>;
