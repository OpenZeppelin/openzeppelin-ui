import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <div>
      <label>Progress: {current}/{total}</label>
      <progress value={current} max={total} />
    </div>
  );
}
