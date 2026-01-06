import { useState } from 'react';

import { Label, Textarea } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Textarea component variations and usage patterns
 */
export function TextareaDemo(): React.ReactElement {
  const [value, setValue] = useState('');
  const maxLength = 200;

  return (
    <DemoSection
      title="Textarea"
      description="A multi-line text input component for longer form content such as descriptions, comments, or messages."
      codeExample={`import { Textarea, Label } from '@openzeppelin/ui-components';

<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter a description..."
    rows={4}
  />
</div>`}
    >
      {/* Recommendation Note */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <p className="text-sm">
          <strong>💡 For forms:</strong> Use{' '}
          <code className="bg-muted rounded px-1">TextAreaField</code> from{' '}
          <code className="bg-muted rounded px-1">@openzeppelin/ui-components/fields</code> which
          includes built-in label, validation, and React Hook Form integration. The primitive{' '}
          <code className="bg-muted rounded px-1">Textarea</code> shown here is for custom
          compositions.
        </p>
      </div>

      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="basic">Description</Label>
            <Textarea id="basic" placeholder="Enter a description..." />
          </div>
        </div>
      </div>

      {/* Rows Variations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Rows</h3>
        <div className="grid max-w-md gap-6">
          <div className="space-y-2">
            <Label htmlFor="rows-2">2 Rows (Compact)</Label>
            <Textarea id="rows-2" placeholder="Short input..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rows-4">4 Rows (Default)</Label>
            <Textarea id="rows-4" placeholder="Standard height..." rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rows-8">8 Rows (Expanded)</Label>
            <Textarea id="rows-8" placeholder="More space for content..." rows={8} />
          </div>
        </div>
      </div>

      {/* With Character Count */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Character Count</h3>
        <div className="max-w-md space-y-2">
          <Label htmlFor="char-count">
            Bio ({value.length}/{maxLength})
          </Label>
          <Textarea
            id="char-count"
            placeholder="Tell us about yourself..."
            rows={3}
            maxLength={maxLength}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-muted-foreground text-sm">
            {maxLength - value.length} characters remaining
          </p>
        </div>
      </div>

      {/* States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">States</h3>
        <div className="grid max-w-md gap-6">
          <div className="space-y-2">
            <Label htmlFor="disabled">Disabled</Label>
            <Textarea id="disabled" disabled placeholder="This textarea is disabled" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="readonly">Read Only</Label>
            <Textarea
              id="readonly"
              readOnly
              defaultValue="This content cannot be edited. It is read-only."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prefilled">Pre-filled</Label>
            <Textarea
              id="prefilled"
              defaultValue="This is some pre-filled content that the user can edit."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Error State</h3>
        <div className="max-w-md space-y-2">
          <Label htmlFor="error" className="text-destructive">
            Description *
          </Label>
          <Textarea
            id="error"
            placeholder="Enter a description..."
            aria-invalid="true"
            className="border-destructive focus-visible:ring-destructive"
          />
          <p className="text-destructive text-sm">Description is required</p>
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Common Use Cases</h3>
        <div className="grid max-w-md gap-6">
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea id="comment" placeholder="Leave a comment..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="json">JSON Input</Label>
            <Textarea
              id="json"
              placeholder='{"key": "value"}'
              rows={5}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Transaction Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes for this transaction (optional)..."
              rows={2}
            />
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
