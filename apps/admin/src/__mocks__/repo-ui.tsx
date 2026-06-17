export const Button = ({ children, isLoading, ...props }: { children: React.ReactNode, isLoading?: boolean, [key: string]: unknown }) => (
  <button type="button" {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

export const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

export const Input = ({ label, ...props }: { label: string, [key: string]: unknown }) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

export const Sheet = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SheetContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SheetTrigger = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
