/**
 * WalletKitConfigPreview
 *
 * Displays configuration previews for the selected wallet UI kit.
 * Shows native config files, adapter-provided defaults, and runtime configuration.
 */

import { Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@openzeppelin/ui-components';
import type { AvailableUiKit } from '@openzeppelin/ui-types';

import { CodeBlock } from '../CodeBlock';
import { CUSTOM_KIT_EXPLANATION_CODE, CUSTOM_KIT_USAGE_CODE } from './code-snippets';
import {
  buildAppliedConfigSnippet,
  loadKitConfigModule,
  loadKitConfigSource,
} from './config-loaders';

export interface WalletKitConfigPreviewProps {
  selectedKit: AvailableUiKit | null;
  selectedKitName: string | null;
}

export function WalletKitConfigPreview({
  selectedKit,
  selectedKitName,
}: WalletKitConfigPreviewProps): React.ReactElement {
  const [nativeConfigSource, setNativeConfigSource] = useState<string | null>(null);
  const [nativeConfigObject, setNativeConfigObject] = useState<Record<string, unknown> | null>(
    null
  );

  // Check if this is a "zero-config" kit (custom, none)
  const isZeroConfigKit = selectedKitName === 'custom' || selectedKitName === 'none';

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!selectedKitName || isZeroConfigKit) {
        if (!isMounted) return;
        setNativeConfigSource(null);
        setNativeConfigObject(null);
        return;
      }

      const [src, mod] = await Promise.all([
        loadKitConfigSource(selectedKitName),
        loadKitConfigModule(selectedKitName),
      ]);

      if (!isMounted) return;
      setNativeConfigSource(src);
      setNativeConfigObject(mod);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedKitName, isZeroConfigKit]);

  const previews = useMemo(() => {
    if (!selectedKitName) return [];

    const items: Array<{ title: string; code: string; language: 'tsx' | 'typescript' | 'json' }> =
      [];

    // Always show the applied runtime config snippet (adapter-controlled).
    items.push({
      title: 'Applied kit selection (runtime)',
      code: buildAppliedConfigSnippet(selectedKitName),
      language: 'tsx',
    });

    // For zero-config kits, show the explanation and usage code
    if (isZeroConfigKit) {
      items.push({
        title: 'Custom kit configuration options',
        code: CUSTOM_KIT_EXPLANATION_CODE,
        language: 'typescript',
      });
      items.push({
        title: 'Direct wagmi usage (advanced)',
        code: CUSTOM_KIT_USAGE_CODE,
        language: 'tsx',
      });
      return items;
    }

    // Prefer adapter-provided default code (UI Builder uses this when available).
    if (selectedKit?.defaultCode) {
      items.push({
        title: 'Kit config (adapter-provided)',
        code: selectedKit.defaultCode,
        language: 'typescript',
      });
      return items;
    }

    // Fall back to the real native config file if present in the example app.
    if (nativeConfigSource) {
      items.push({
        title: `Native config file: src/config/wallet/${selectedKitName}.config.ts`,
        code: nativeConfigSource,
        language: 'typescript',
      });
      return items;
    }

    // Final fallback: show the imported module object if it exists.
    if (nativeConfigObject) {
      items.push({
        title: `Native config module (loaded): ${selectedKitName}.config.ts`,
        code: JSON.stringify(nativeConfigObject, null, 2),
        language: 'json',
      });
    }

    return items;
  }, [
    nativeConfigObject,
    nativeConfigSource,
    selectedKit?.defaultCode,
    selectedKitName,
    isZeroConfigKit,
  ]);

  if (!selectedKitName) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>Select a kit to view its configuration.</AlertDescription>
      </Alert>
    );
  }

  // Show informative message for zero-config kits instead of an error
  const showNoConfigWarning =
    !isZeroConfigKit && !selectedKit?.defaultCode && !nativeConfigSource && !nativeConfigObject;

  return (
    <div className="space-y-4">
      {isZeroConfigKit && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Info className="size-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            The <span className="font-medium">{selectedKitName}</span> kit uses wagmi directly
            without a native config file. You can still configure it at runtime to exclude
            components like <code className="text-xs">NetworkSwitcher</code> or{' '}
            <code className="text-xs">AccountDisplay</code>.
          </AlertDescription>
        </Alert>
      )}
      {showNoConfigWarning && (
        <Alert variant="destructive">
          <AlertDescription>
            No config preview is available for{' '}
            <span className="font-medium">{selectedKitName}</span>. The adapter did not provide{' '}
            <code>defaultCode</code> and there is no matching native config module under{' '}
            <code>src/config/wallet</code>.
          </AlertDescription>
        </Alert>
      )}
      {previews.map((p) => (
        <div key={p.title} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{p.title}</p>
          <CodeBlock code={p.code} language={p.language} />
        </div>
      ))}
    </div>
  );
}
