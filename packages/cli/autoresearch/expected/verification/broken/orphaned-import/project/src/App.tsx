import { Button } from '@/components/ui/button';
import { Card } from '@openzeppelin/ui-components';

export function App() {
  return (
    <Card>
      <Button onClick={() => console.log('click')}>Click me</Button>
    </Card>
  );
}
