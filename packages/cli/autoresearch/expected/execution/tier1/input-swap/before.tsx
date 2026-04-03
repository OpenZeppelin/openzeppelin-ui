import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SearchForm() {
  return (
    <div>
      <Label htmlFor="search">Search</Label>
      <Input id="search" placeholder="Type to search..." />
    </div>
  );
}
