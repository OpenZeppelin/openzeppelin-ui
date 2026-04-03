import { useState } from 'react';
import { Button } from '@openzeppelin/ui-components';

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
