// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const Button = ({ children, isLoading, ...props }: any) => (
  // biome-ignore lint/a11y/useButtonType: mocked component
  <button {...props} disabled={isLoading}>
    {isLoading ? 'Loading...' : children}
  </button>
);

// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const Card = ({ children, className }: any) => (
  <div className={className}>{children}</div>
);

// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const Input = ({ label, ...props }: any) => (
  <label>
    {label}
    <input {...props} />
  </label>
);

// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const Sheet = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const SheetContent = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: bypassed
export const SheetTrigger = ({ children }: any) => <div>{children}</div>;
