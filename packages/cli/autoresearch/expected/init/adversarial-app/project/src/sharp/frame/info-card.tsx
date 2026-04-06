import React from 'react';

export function Card({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function CardContent({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function CardHeader({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function CardTitle({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

export function CardFooter({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  return <div {...props}>{children}</div>;
}

