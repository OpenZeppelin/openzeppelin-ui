import React from 'react';

export function Input({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}
