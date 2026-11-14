/**
 * @vitest-environment jsdom
 *
 * SF-30 · Timeline. No Invariants stage (Low stakes): properties are the spec acceptance
 * scenarios, labelled P1..P5 below.
 *   P1 ordered list: steps render in array order as an `ol` of `li`
 *   P2 tone without colour: each tone has its own icon and status text; default is pending
 *   P3 update without remount: a tone change keeps the other items' DOM nodes
 *   P4 active step is announced with aria-current="step"; others are not
 *   P5 element contract: ref, className merge, passthrough, descriptions, export
 *   P6 warning tone: own marker and icon, default status text "Paused"
 *   P7 empty statusLabel renders no status text; omitted keeps the default
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import * as ui from './index';
import { Timeline, type TimelineItem, type TimelineTone } from './timeline';

const mixed: TimelineItem[] = [
  { key: 'a', label: 'Compile', tone: 'success' },
  { key: 'b', label: 'Deploy', tone: 'active' },
  { key: 'c', label: 'Verify', tone: 'failure' },
  { key: 'd', label: 'Grant roles', tone: 'pending' },
];

const STATUS: Record<TimelineTone, string> = {
  pending: 'Pending',
  active: 'In progress',
  success: 'Completed',
  warning: 'Paused',
  failure: 'Failed',
};

afterEach(cleanup);

describe('Timeline (SF-30)', () => {
  describe('P1 ordered list', () => {
    it('renders four steps in order as an ordered list', () => {
      render(<Timeline items={mixed} aria-label="Job" />);
      const list = screen.getByRole('list', { name: 'Job' });
      expect(list.tagName).toBe('OL');
      const items = within(list).getAllByRole('listitem');
      expect(items.map((li) => li.textContent)).toEqual([
        'Compile: Completed',
        'Deploy: In progress',
        'Verify: Failed',
        'Grant roles: Pending',
      ]);
    });

    it('renders an empty list for empty items without crashing', () => {
      render(<Timeline items={[]} aria-label="Empty" />);
      expect(screen.getByRole('list', { name: 'Empty' }).children).toHaveLength(0);
    });

    it('renders a single item without a connector', () => {
      const { container } = render(<Timeline items={[{ label: 'Only' }]} />);
      expect(container.querySelectorAll('li')).toHaveLength(1);
      expect(container.querySelector('li span[aria-hidden="true"].w-px')).toBeNull();
    });

    it('draws a connector after every item except the last', () => {
      const { container } = render(<Timeline items={mixed} />);
      const lis = [...container.querySelectorAll('li')];
      const connectors = lis.map((li) => li.querySelector('span.w-px') !== null);
      expect(connectors).toEqual([true, true, true, false]);
    });
  });

  describe('P2 tone without colour', () => {
    it.each(Object.keys(STATUS) as TimelineTone[])('%s exposes status text', (tone) => {
      render(<Timeline items={[{ label: 'Step', tone }]} />);
      expect(screen.getByRole('listitem').textContent).toContain(`Step: ${STATUS[tone]}`);
      expect(screen.getByRole('listitem').getAttribute('data-tone')).toBe(tone);
    });

    it('gives each tone a distinct icon', () => {
      const { container } = render(<Timeline items={mixed} />);
      const icons = [...container.querySelectorAll('li')].map(
        (li) => li.querySelector('span.rounded-full svg')?.getAttribute('class') ?? ''
      );
      expect(icons.every((c) => c.length > 0)).toBe(true);
      expect(new Set(icons).size).toBe(4);
    });

    it('gives all five tones a distinct icon and marker', () => {
      const tones = Object.keys(STATUS) as TimelineTone[];
      const { container } = render(
        <Timeline items={tones.map((tone) => ({ label: tone, tone }))} />
      );
      const markers = [...container.querySelectorAll('li span.rounded-full')];
      expect(markers).toHaveLength(5);
      expect(new Set(markers.map((m) => m.querySelector('svg')?.getAttribute('class'))).size).toBe(
        5
      );
      expect(new Set(markers.map((m) => m.className)).size).toBe(5);
    });

    it('hides icon and connector from assistive tech, keeps status text readable', () => {
      const { container } = render(<Timeline items={mixed} />);
      const li = container.querySelector('li') as HTMLElement;
      expect(li.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
      expect(li.querySelector('.sr-only')?.textContent).toContain(': Completed');
    });

    it('defaults to pending when tone is omitted', () => {
      render(<Timeline items={[{ label: 'Step' }]} />);
      expect(screen.getByRole('listitem').textContent).toContain('Step: Pending');
      expect(screen.getByRole('listitem').getAttribute('data-tone')).toBe('pending');
    });

    it('statusLabel overrides the default text', () => {
      render(<Timeline items={[{ label: 'Etapa', tone: 'success', statusLabel: 'Hecho' }]} />);
      const li = screen.getByRole('listitem');
      expect(li.textContent).toContain('Etapa: Hecho');
      expect(li.textContent).not.toContain('Completed');
    });
  });

  describe('P3 update without remount', () => {
    it('keeps every item node when one step changes tone', () => {
      const { rerender, container } = render(<Timeline items={mixed} />);
      const before = [...container.querySelectorAll('li')];
      rerender(
        <Timeline items={mixed.map((i) => (i.key === 'b' ? { ...i, tone: 'success' } : i))} />
      );
      const after = [...container.querySelectorAll('li')];
      expect(after).toHaveLength(4);
      after.forEach((li, i) => expect(li).toBe(before[i]));
      expect(after[1].textContent).toContain('Deploy: Completed');
      expect(after[1].getAttribute('data-tone')).toBe('success');
      expect(after[0].textContent).toContain('Compile: Completed');
    });

    it('item.key keeps identity across reorder, without key warnings', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { rerender, container } = render(<Timeline items={mixed} />);
      const byLabel = new Map(
        [...container.querySelectorAll('li')].map((li) => [li.textContent, li])
      );
      rerender(<Timeline items={[...mixed].reverse()} />);
      const after = [...container.querySelectorAll('li')];
      expect(after.map((li) => li.textContent)).toEqual([...byLabel.keys()].reverse());
      after.forEach((li) => expect(li).toBe(byLabel.get(li.textContent)));
      expect(err).not.toHaveBeenCalled();
      err.mockRestore();
    });

    it('keyless items keep their nodes by index when tones change', () => {
      const keyless: TimelineItem[] = [{ label: 'One' }, { label: 'Two' }];
      const { rerender, container } = render(<Timeline items={keyless} />);
      const before = [...container.querySelectorAll('li')];
      rerender(<Timeline items={[{ label: 'One', tone: 'active' }, { label: 'Two' }]} />);
      [...container.querySelectorAll('li')].forEach((li, i) => expect(li).toBe(before[i]));
    });

    it('appending a step keeps existing nodes', () => {
      const { rerender, container } = render(<Timeline items={mixed.slice(0, 2)} />);
      const before = [...container.querySelectorAll('li')];
      rerender(<Timeline items={mixed} />);
      const after = [...container.querySelectorAll('li')];
      expect(after).toHaveLength(4);
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toBe(before[1]);
    });
  });

  describe('P4 current step', () => {
    it('marks only the active item aria-current="step"', () => {
      render(<Timeline items={mixed} />);
      const current = screen
        .getAllByRole('listitem')
        .filter((li) => li.getAttribute('aria-current') === 'step');
      expect(current).toHaveLength(1);
      expect(current[0].textContent).toContain('Deploy');
    });

    it('has no current item when none is active', () => {
      const { container } = render(<Timeline items={[{ label: 'A', tone: 'success' }]} />);
      expect(container.querySelector('[aria-current]')).toBeNull();
    });

    it('moves aria-current when the active step advances', () => {
      const { rerender } = render(<Timeline items={mixed} />);
      rerender(
        <Timeline
          items={mixed.map((i) =>
            i.key === 'b' ? { ...i, tone: 'success' } : i.key === 'c' ? { ...i, tone: 'active' } : i
          )}
        />
      );
      const current = screen
        .getAllByRole('listitem')
        .filter((li) => li.getAttribute('aria-current') === 'step');
      expect(current).toHaveLength(1);
      expect(current[0].textContent).toContain('Verify');
    });
  });

  describe('P5 element contract', () => {
    it('renders description under the label, and omits it when absent or null', () => {
      render(
        <Timeline
          items={[
            { label: 'A', description: 'details' },
            { label: 'B' },
            { label: 'C', description: null },
          ]}
        />
      );
      const [a, b, c] = screen.getAllByRole('listitem');
      expect(a.textContent).toContain('details');
      expect(a.querySelectorAll('.min-w-0 > div')).toHaveLength(2);
      expect(b.querySelectorAll('.min-w-0 > div')).toHaveLength(1);
      expect(c.querySelectorAll('.min-w-0 > div')).toHaveLength(1);
    });

    it('accepts ReactNode labels', () => {
      render(<Timeline items={[{ label: <a href="#x">Link step</a> }]} />);
      expect(screen.getByRole('link', { name: 'Link step' })).toBeTruthy();
    });

    it('forwards ref to the <ol>', () => {
      const ref = createRef<HTMLOListElement>();
      render(<Timeline ref={ref} items={mixed} />);
      expect(ref.current?.tagName).toBe('OL');
    });

    it('merges className and passes attributes through', () => {
      render(<Timeline items={mixed} className="custom" id="t" data-testid="tl" aria-label="X" />);
      const ol = screen.getByTestId('tl');
      expect(ol.classList.contains('custom') && ol.classList.contains('flex')).toBe(true);
      expect(ol.getAttribute('id')).toBe('t');
      expect(ol.getAttribute('aria-label')).toBe('X');
    });

    it('is exported from the ui barrel', () => {
      expect(ui.Timeline).toBe(Timeline);
    });
  });

  describe('P6 warning tone', () => {
    it('exposes "Paused" as default status text and data-tone=warning', () => {
      render(<Timeline items={[{ label: 'Deploy', tone: 'warning' }]} />);
      const li = screen.getByRole('listitem');
      expect(li.textContent).toBe('Deploy: Paused');
      expect(li.getAttribute('data-tone')).toBe('warning');
    });

    it('uses a marker and icon different from every other tone', () => {
      const others = (Object.keys(STATUS) as TimelineTone[]).filter((t) => t !== 'warning');
      const { container } = render(
        <Timeline
          items={[
            { label: 'W', tone: 'warning' },
            ...others.map((tone) => ({ label: tone, tone })),
          ]}
        />
      );
      const markers = [...container.querySelectorAll('li span.rounded-full')];
      const [warn, ...rest] = markers;
      const warnIcon = warn.querySelector('svg')?.getAttribute('class');
      expect(warnIcon).toBeTruthy();
      rest.forEach((m) => {
        expect(m.className).not.toBe(warn.className);
        expect(m.querySelector('svg')?.getAttribute('class')).not.toBe(warnIcon);
      });
    });

    it('is not the current step', () => {
      const { container } = render(<Timeline items={[{ label: 'W', tone: 'warning' }]} />);
      expect(container.querySelector('[aria-current]')).toBeNull();
    });

    it('statusLabel overrides the warning default', () => {
      render(<Timeline items={[{ label: 'Deploy', tone: 'warning', statusLabel: 'Stopped' }]} />);
      expect(screen.getByRole('listitem').textContent).toBe('Deploy: Stopped');
    });

    it('moves between warning and active without remounting the item', () => {
      const item = (tone: TimelineTone): TimelineItem => ({ key: 'a', label: 'Deploy', tone });
      const { rerender, container } = render(<Timeline items={[item('warning')]} />);
      const li = container.querySelector('li');
      rerender(<Timeline items={[item('active')]} />);
      expect(container.querySelector('li')).toBe(li);
      expect(li?.textContent).toBe('Deploy: In progress');
      expect(li?.getAttribute('aria-current')).toBe('step');
    });
  });

  describe('P7 empty statusLabel', () => {
    it('renders no sr-only node and no ": " text for statusLabel \'\'', () => {
      render(<Timeline items={[{ label: 'Rollback', tone: 'success', statusLabel: '' }]} />);
      const li = screen.getByRole('listitem');
      expect(li.querySelector('.sr-only')).toBeNull();
      expect(li.textContent).toBe('Rollback');
      expect(li.textContent).not.toContain(':');
    });

    it.each(Object.keys(STATUS) as TimelineTone[])("%s with '' is silent", (tone) => {
      render(<Timeline items={[{ label: 'Step', tone, statusLabel: '' }]} />);
      expect(screen.getByRole('listitem').textContent).toBe('Step');
    });

    it('still marks the active step with aria-current when silent', () => {
      render(<Timeline items={[{ label: 'Step', tone: 'active', statusLabel: '' }]} />);
      expect(screen.getByRole('listitem').getAttribute('aria-current')).toBe('step');
    });

    it('omitted statusLabel and explicit undefined keep the default text', () => {
      render(
        <Timeline
          items={[
            { label: 'A', tone: 'failure' },
            { label: 'B', tone: 'failure', statusLabel: undefined },
          ]}
        />
      );
      const [a, b] = screen.getAllByRole('listitem');
      expect(a.textContent).toBe('A: Failed');
      expect(b.textContent).toBe('B: Failed');
    });

    it('a whitespace-only statusLabel still renders (only "" opts out)', () => {
      render(<Timeline items={[{ label: 'Step', statusLabel: ' ' }]} />);
      expect(screen.getByRole('listitem').querySelector('.sr-only')).not.toBeNull();
    });

    it('silent step and spoken step coexist in one list', () => {
      render(
        <Timeline
          items={[
            { label: 'A', tone: 'success' },
            { label: 'B', tone: 'success', statusLabel: '' },
          ]}
        />
      );
      const [a, b] = screen.getAllByRole('listitem');
      expect(a.textContent).toBe('A: Completed');
      expect(b.textContent).toBe('B');
    });
  });
});
