import { Loader2 } from 'lucide-react';
import { Button } from '@openzeppelin/ui-components';

interface SubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
  label: string;
}

export function SubmitButton({ loading, disabled, label }: SubmitButtonProps) {
  return (
    <Button
      variant="default"
      size="lg"
      disabled={loading || disabled}
      asSlot={false}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
