import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCircle2, Code2 } from 'lucide-react';

interface SdkCodePanelProps {
  code: string;
  label?: string;
}

export default function SdkCodePanel({ code, label = 'SDK Code' }: SdkCodePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        <Code2 className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <div className="relative px-3 pb-3">
          <button
            onClick={handleCopy}
            className="absolute top-1 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <pre className="overflow-x-auto rounded-md bg-foreground/5 p-3 text-xs font-mono text-foreground/80">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
