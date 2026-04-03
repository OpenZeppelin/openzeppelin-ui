import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </Button>
    </div>
  );
}
