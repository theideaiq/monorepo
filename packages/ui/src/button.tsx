import type { ReactNode } from 'react';

export const Button = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: '10px', backgroundColor: 'blue', color: 'white' }}
    >
      {children}
    </button>
  );
};
