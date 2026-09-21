/**
 * SF-14 · Chromium verification — INV-383, INV-396, INV-397, INV-408, INV-410.
 */
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createRef } from 'react';

import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

async function axeViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  });
  return results.violations;
}

describe('SF-14 Badge native keyboard contract', () => {
  it('INV-396/408: pointer, Enter, and Space each activate the real button once', async () => {
    const onActivate = vi.fn();
    render(<Badge label="Open role" variant="outline" onActivate={onActivate} />);
    const badge = screen.getByRole('button', { name: 'Open role' });

    await userEvent.click(badge);
    expect(onActivate).toHaveBeenCalledTimes(1);

    badge.focus();
    await userEvent.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(badge);

    await userEvent.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(badge);
  });

  it('INV-408: only an interactive badge participates in default tab order', async () => {
    render(
      <>
        <Badge label="Static status" variant="solid" tone="success" />
        <Badge label="View details" onActivate={() => undefined} />
      </>
    );

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByText('Static status').getAttribute('tabindex')).toBeNull();
  });
});

describe('SF-14 Badge overlay composition', () => {
  it.each([
    { label: 'Static trigger', onActivate: undefined, expectedTag: 'SPAN' },
    { label: 'Interactive trigger', onActivate: () => undefined, expectedTag: 'BUTTON' },
  ])(
    'INV-383/397: TooltipTrigger asChild forwards ref and props to $expectedTag',
    async ({ label, onActivate, expectedTag }) => {
      const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge ref={ref} label={label} onActivate={onActivate} />
            </TooltipTrigger>
            <TooltipContent>Role details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByText(label);
      expect(trigger.tagName).toBe(expectedTag);
      expect(ref.current).toBe(trigger);
      expect(trigger.hasAttribute('data-state')).toBe(true);

      const browserScreen = page.elementLocator(document.body);
      await browserScreen.getByText(label).hover();
      await expect.element(browserScreen.getByRole('tooltip')).toBeVisible();
      await expect.element(browserScreen.getByRole('tooltip')).toHaveTextContent('Role details');
    }
  );
});

describe('SF-14 Badge accessibility', () => {
  it('INV-410: representative Role Manager badge shapes are axe-clean', async () => {
    const { container } = render(
      <div>
        <Badge label="Active" variant="solid" tone="success" />
        <Badge label="Owner" variant="outline" onActivate={() => undefined} />
        <Badge
          label="You"
          variant="outline"
          aria-label="This is your account"
          className="consumer-palette"
        />
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge label="Capability" className="consumer-palette" />
            </TooltipTrigger>
            <TooltipContent>Capability details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Badge label="Admin" icon={<svg />} iconLabel="Contract Admin role" />
      </div>
    );

    expect(await axeViolations(container)).toEqual([]);
  });
});
