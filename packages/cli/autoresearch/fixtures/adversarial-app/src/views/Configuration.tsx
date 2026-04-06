import { Dialog, DialogContent, DialogTrigger } from '~/sleek/prism/modal';
import { Select, SelectTrigger, SelectContent, SelectItem } from '~/sleek/prism/picker';
import { Alert, AlertTitle, AlertDescription } from '~/sleek/prism/notice';
import { Button } from '~/sleek/prism/action-button';
import { Checkbox } from '~/sleek/prism/tick-box';
import { Tooltip } from '~/sleek/prism/hint';

export function Configuration() {
  return (
    <div>
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Check your settings</AlertDescription>
      </Alert>
      <Select>
        <SelectTrigger>Choose</SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
      <Tooltip><span>Hover me</span></Tooltip>
      <Checkbox />
      <Dialog>
        <DialogTrigger><Button>Open</Button></DialogTrigger>
        <DialogContent><p>Dialog body</p></DialogContent>
      </Dialog>
    </div>
  );
}
