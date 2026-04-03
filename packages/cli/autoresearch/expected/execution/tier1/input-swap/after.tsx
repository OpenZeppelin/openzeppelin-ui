import { Label } from '@/components/ui/label';
import { Input } from '@openzeppelin/ui-components';

export function SearchForm() {
  return (
    <div>
      <Label htmlFor="search">Search</Label>
      <Input id="search" placeholder="Type to search..." />
    </div>
  );
}
