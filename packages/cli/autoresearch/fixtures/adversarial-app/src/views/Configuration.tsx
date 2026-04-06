import { Dialog, DialogContent, DialogTrigger } from '~/orbit/field/modal';
import { Select, SelectTrigger, SelectContent, SelectItem } from '~/orbit/field/picker';
import { Alert, AlertTitle, AlertDescription } from '~/orbit/field/notice';
import { Button } from '~/orbit/field/action-button';
import { Checkbox } from '~/orbit/field/tick-box';
import { Tooltip } from '~/orbit/field/hint';

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
