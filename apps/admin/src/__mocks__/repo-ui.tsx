export const Button = ({ children, isLoading, ...props }: any) => (
  <button {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

export const Card = ({ children, className }: any) => (
  <div className={className}>{children}</div>
);

export const Input = ({ label, ...props }: any) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

export const Sheet = ({ children }: any) => <div>{children}</div>;
export const SheetContent = ({ children }: any) => <div>{children}</div>;
export const SheetTrigger = ({ children }: any) => <div>{children}</div>;
