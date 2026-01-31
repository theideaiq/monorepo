// biome-ignore lint/suspicious/noExplicitAny: Mock component
export const Button = ({ children, isLoading, ...props }: any) => (
  // biome-ignore lint/a11y/useButtonType: Mock component
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
