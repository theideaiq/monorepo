import type React from 'react';

export const Button = ({
  children,
  isLoading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) => (
  <button {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

export const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const Input = ({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

export const Sheet = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
export const SheetContent = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
export const SheetTrigger = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
