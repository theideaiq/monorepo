export const Button = ({
  children,
  isLoading,
  ...props
}: Record<string, unknown>) => (
  <button {...props} disabled={isLoading as boolean}>
    {isLoading ? 'Loading...' : (children as React.ReactNode)}
  </button>
);

export const Card = ({ children, className }: Record<string, unknown>) => (
  <div className={className as string}>{children as React.ReactNode}</div>
);

export const Input = ({ label, ...props }: Record<string, unknown>) => (
  <label>
    {label as string}
    <input {...props} />
  </label>
);

export const Sheet = ({ children }: Record<string, unknown>) => (
  <div>{children as React.ReactNode}</div>
);
export const SheetContent = ({ children }: Record<string, unknown>) => (
  <div>{children as React.ReactNode}</div>
);
export const SheetTrigger = ({ children }: Record<string, unknown>) => (
  <div>{children as React.ReactNode}</div>
);
