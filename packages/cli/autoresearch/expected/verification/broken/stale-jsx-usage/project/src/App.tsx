import { Button } from '@openzeppelin/ui-components';
import { Card } from '@openzeppelin/ui-components';

export function App() {
  return (
    <Card>
      <Button onClick={() => console.log('hi')}>Click me</Button>
      <button className="text-sm text-red-500">Legacy button</button>
    </Card>
  );
}
