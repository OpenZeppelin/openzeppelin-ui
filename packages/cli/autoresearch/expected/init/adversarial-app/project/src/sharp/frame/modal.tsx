import React from 'react';

export function Dialog({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function DialogContent({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function DialogTrigger({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

