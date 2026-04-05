import React from 'react';

export function Button({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}
