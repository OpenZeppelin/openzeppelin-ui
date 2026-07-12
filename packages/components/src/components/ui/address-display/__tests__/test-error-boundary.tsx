/**
 * Minimal error boundary for the SF-4 suite (INV-64: the ENS path never
 * throws). Kept in its own file so `helpers.tsx` exports no components
 * (react-refresh/only-export-components).
 */
import * as React from 'react';

interface ErrorBoundaryState {
  caught: boolean;
}

/**
 * Renders `data-testid="boundary-tripped"` if a descendant threw; otherwise
 * renders its children untouched.
 */
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { caught: false };

  /**
   * Flip to the caught state when a descendant throws during render.
   *
   * @returns The tripped state
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { caught: true };
  }

  /**
   * Render the trip marker or the children.
   *
   * @returns The boundary output
   */
  render(): React.ReactNode {
    if (this.state.caught) return <div data-testid="boundary-tripped" />;
    return this.props.children;
  }
}
