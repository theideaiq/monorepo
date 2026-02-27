// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
import React from 'react';

// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const Button = ({ children, isLoading, ...props }: any) => (
  <button type="button" {...props}>
    {isLoading ? 'Loading...' : children}
  </button>
);

// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const Input = (props: any) => <input {...props} />;

// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const Badge = ({ children }: any) => <span>{children}</span>;

// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const Card = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const CardHeader = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const CardContent = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const CardFooter = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const CardTitle = ({ children }: any) => <div>{children}</div>;

// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const Sheet = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const SheetContent = ({ children }: any) => <div>{children}</div>;
// biome-ignore lint/suspicious/noExplicitAny: Test mock utility
export const SheetTrigger = ({ children }: any) => <div>{children}</div>;
