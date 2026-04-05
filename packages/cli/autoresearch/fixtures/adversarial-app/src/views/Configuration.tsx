import { Dialog, DialogContent, DialogTrigger } from '~/block/frame/modal';
import { Select, SelectTrigger, SelectContent, SelectItem } from '~/block/frame/picker';
import { Alert, AlertTitle, AlertDescription } from '~/block/frame/notice';
import { Button } from '~/block/frame/action-button';
import { Checkbox } from '~/block/frame/tick-box';
import { Tooltip } from '~/block/frame/hint';

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
