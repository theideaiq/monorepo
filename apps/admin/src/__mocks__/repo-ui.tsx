// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const Button = ({ children, isLoading, ...props }: any) => (
  <button type="button" {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const Card = ({ children, className }: any) => (
  <div className={className}>{children}</div>
);

// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const Input = ({ label, ...props }: any) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const Sheet = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const SheetContent = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Mocking UI components
export const SheetTrigger = ({ children }: any) => <div>{children}</div>;
