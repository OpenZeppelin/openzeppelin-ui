/**
 * @vitest-environment jsdom
 *
 * SF-3 Banner role opt-in. Scenarios: SC-1 (status/note carried, not alert),
 * SC-2 (default alert in every variant, as before).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Banner, type BannerRole, type BannerVariant } from './banner';

const VARIANTS: BannerVariant[] = ['info', 'success', 'warning', 'error', 'neutral'];
const OPT_IN_ROLES: Exclude<BannerRole, 'alert'>[] = ['status', 'note'];

describe('Banner role (SF-3)', () => {
  describe('SC-2: default role is alert', () => {
    it.each(VARIANTS)('SC-2 happy: %s variant without a role carries role="alert"', (variant) => {
      render(<Banner variant={variant}>Body</Banner>);

      expect(screen.getByRole('alert').textContent).toContain('Body');
    });

    it('SC-2 boundary: omitting variant too (implicit info) still carries alert', () => {
      const { container } = render(<Banner>Body</Banner>);

      expect(container.firstElementChild?.getAttribute('role')).toBe('alert');
    });

    it.each(['default', 'compact'] as const)(
      'SC-2 boundary: %s size, no title, not dismissible keeps alert',
      (size) => {
        render(
          <Banner size={size} dismissible={false}>
            Body
          </Banner>
        );

        expect(screen.getByRole('alert')).toBeTruthy();
      }
    );

    it('SC-2 regression: an explicit role="alert" is identical to the default', () => {
      const a = render(<Banner variant="warning">Body</Banner>);
      const b = render(
        <Banner variant="warning" role="alert">
          Body
        </Banner>
      );

      expect(b.container.innerHTML).toBe(a.container.innerHTML);
    });
  });

  describe('SC-1: opted-in role is carried and alert is not', () => {
    it.each(OPT_IN_ROLES)('SC-1 happy: role="%s" lands on the banner root', (role) => {
      const { container } = render(<Banner role={role}>Body</Banner>);

      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute('role')).toBe(role);
      expect(screen.getByRole(role).textContent).toContain('Body');
    });

    it.each(OPT_IN_ROLES)('SC-1 failure: role="%s" leaves no alert role anywhere', (role) => {
      const { container } = render(
        <Banner role={role} title="Heads up">
          Body
        </Banner>
      );

      expect(screen.queryByRole('alert')).toBeNull();
      expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    });

    it.each(VARIANTS.flatMap((v) => OPT_IN_ROLES.map((r) => [v, r] as const)))(
      'SC-1 boundary: %s variant can opt into %s (role is independent of variant)',
      (variant, role) => {
        render(
          <Banner variant={variant} role={role}>
            Body
          </Banner>
        );

        expect(screen.getByRole(role)).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
      }
    );

    it('SC-1 boundary: only the root carries the role; dismiss button and title are unaffected', () => {
      const { container } = render(
        <Banner role="status" title="Note">
          Body
        </Banner>
      );

      expect(container.querySelectorAll('[role]')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Dismiss banner' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Note' })).toBeTruthy();
    });

    it('SC-1 boundary: undefined role falls back to alert (not an absent attribute)', () => {
      const { container } = render(<Banner role={undefined}>Body</Banner>);

      expect(container.firstElementChild?.getAttribute('role')).toBe('alert');
    });

    it('SC-1 transition: rerendering from default to status swaps the role in place', () => {
      const { container, rerender } = render(<Banner>Body</Banner>);
      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute('role')).toBe('alert');

      rerender(<Banner role="status">Body</Banner>);

      expect(container.firstElementChild).toBe(root);
      expect(root.getAttribute('role')).toBe('status');
    });
  });
});
