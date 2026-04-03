import { useState } from 'react';
import { Terminal, Copy, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import type { DemoType } from '../hooks/useDemoSession';

const CLI_COMMANDS: Record<DemoType, string[]> = {
  'fhe-basics': [
    'npx oz-zama init --module basic',
    '# edit zama.config.yaml (token addresses, observer addresses)',
    'npx oz-zama deploy',
  ],
  'session-keys': [
    'npx oz-zama init --module session-keys --name agents',
    '# edit zama/agents.yaml (agent addresses, token addresses, limits, renewal periods, observer addresses)',
    'npx oz-zama deploy agents',
  ],
  'multisig': [
    'npx oz-zama init --module multisig --name treasury',
    '# edit zama/treasury.yaml (signers, threshold, admin addresses, financial addresses, governance addresses)',
    'npx oz-zama deploy treasury',
  ],
  'weighted-multisig': [
    'npx oz-zama init --module weighted-multisig --name treasury',
    '# edit zama/treasury.yaml (signers, weights, threshold, admin addresses, financial addresses, governance addresses)',
    'npx oz-zama deploy treasury',
  ],
};

export default function CliBanner({ demoType }: { demoType: DemoType }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const lines = CLI_COMMANDS[demoType];
  const fullText = lines.join('\n');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        <Terminal className="h-3.5 w-3.5" />
        <span className="font-medium">Build this</span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-1 right-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy commands"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre className="overflow-x-auto rounded-md bg-foreground/5 p-3 pr-8 text-xs font-mono text-foreground/80">
              <code>{lines.map((line) => line.startsWith('#') ? line : `$ ${line}`).join('\n')}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
