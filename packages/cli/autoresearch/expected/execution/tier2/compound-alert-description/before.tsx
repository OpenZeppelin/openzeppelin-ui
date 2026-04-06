import { AlertCircle, CheckCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StatusBannerProps {
  variant: 'success' | 'error';
  title: string;
  message: string;
}

export function StatusBanner({ variant, title, message }: StatusBannerProps) {
  const Icon = variant === 'success' ? CheckCircle : AlertCircle;

  return (
    <Alert variant={variant === 'error' ? 'destructive' : 'default'}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
