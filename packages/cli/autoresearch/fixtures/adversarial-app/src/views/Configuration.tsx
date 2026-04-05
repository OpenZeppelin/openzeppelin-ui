import { Dialog, DialogContent, DialogTrigger } from '~/vault/pulse/modal';
import { Select, SelectTrigger, SelectContent, SelectItem } from '~/vault/pulse/picker';
import { Alert, AlertTitle, AlertDescription } from '~/vault/pulse/notice';
import { Button } from '~/vault/pulse/action-button';
import { Checkbox } from '~/vault/pulse/tick-box';
import { Tooltip } from '~/vault/pulse/hint';

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
