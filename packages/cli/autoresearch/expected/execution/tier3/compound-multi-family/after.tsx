import { Send } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface TransferFormProps {
  onSubmit: (amount: string) => void;
  error?: string;
  success?: string;
}

export function TransferForm({ onSubmit, error, success }: TransferFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Transfer</CardTitle>
        <CardDescription>Enter the amount and recipient to initiate a transfer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit('100');
          }}
        >
          <Button type="submit">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>

        {success && (
          <Alert>
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
