/**
 * @vitest-environment jsdom
 *
 * SF-27 · PageHeader. No Invariants stage (Low stakes): properties are the spec
 * acceptance scenarios, labelled P1..P5 below.
 *   P1 title is a heading, level configurable (default 1)
 *   P2 description / actions render when present, in the expected slots
 *   P3 empty description / actions render no container
 *   P4 responsive layout: stacked by default, side by side from `sm`
 *   P5 element contract: <header>, ref, className merge, attribute passthrough
 *   P6 block description: the description container is a div, so block content is valid
 *   P7 titleEnd slot: beside the heading, outside it, empty renders no row
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import * as ui from './index';
import { PageHeader, type PageHeaderTitleLevel } from './page-header';

describe('PageHeader (SF-27)', () => {
  describe('P1 title heading', () => {
    it('renders the title as a level-1 heading by default', () => {
      render(<PageHeader title="Settings" />);
      expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy();
    });

    it.each<PageHeaderTitleLevel>([1, 2, 3, 4, 5, 6])(
      'titleLevel=%i renders that heading',
      (level) => {
        render(<PageHeader title="Settings" titleLevel={level} />);
        expect(screen.getByRole('heading', { level, name: 'Settings' })).toBeTruthy();
        expect(screen.getAllByRole('heading')).toHaveLength(1);
      }
    );

    it('accepts composed ReactNode titles', () => {
      render(
        <PageHeader
          title={
            <>
              Role <em>Manager</em>
            </>
          }
        />
      );
      const heading = screen.getByRole('heading', { level: 1 });
      expect(within(heading).getByText('Manager').tagName).toBe('EM');
    });
  });

  describe('P2 description and actions present', () => {
    it('renders description and both actions', () => {
      render(
        <PageHeader
          title="Roles"
          description="Manage who can do what"
          actions={
            <>
              <button type="button">Export</button>
              <button type="button">Add role</button>
            </>
          }
        />
      );
      expect(screen.getByText('Manage who can do what')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Add role' })).toBeTruthy();
    });

    it('keeps title and description together, actions in a separate sibling slot', () => {
      const { container } = render(
        <PageHeader title="Roles" description="Desc" actions={<button type="button">Go</button>} />
      );
      const header = container.querySelector('header') as HTMLElement;
      expect(header.children).toHaveLength(2);
      const [text, actions] = Array.from(header.children);
      expect(within(text as HTMLElement).getByRole('heading')).toBeTruthy();
      expect(within(text as HTMLElement).getByText('Desc')).toBeTruthy();
      expect(within(actions as HTMLElement).getByRole('button', { name: 'Go' })).toBeTruthy();
    });

    it('treats 0 as present content (not empty)', () => {
      render(<PageHeader title="Count" description={0} />);
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  describe('P3 empty slots render no container', () => {
    it('title only: just the heading, no description or actions elements', () => {
      const { container } = render(<PageHeader title="Only title" />);
      const header = container.querySelector('header') as HTMLElement;
      expect(header.children).toHaveLength(1); // text wrapper only, no actions container
      const text = header.children[0] as HTMLElement;
      expect(text.children).toHaveLength(1); // heading only, no description container
      expect(text.children[0].tagName).toBe('H1');
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['false', false],
      ['empty string', ''],
    ])('description=%s and actions=%s render nothing', (_label, empty) => {
      const { container } = render(<PageHeader title="T" description={empty} actions={empty} />);
      const header = container.querySelector('header') as HTMLElement;
      expect(header.children).toHaveLength(1);
      expect((header.children[0] as HTMLElement).children).toHaveLength(1); // heading only
    });
  });

  describe('P4 responsive layout classes', () => {
    // jsdom does not evaluate media queries; assert the Tailwind contract instead.
    it('stacks by default and goes side by side from sm', () => {
      const { container } = render(
        <PageHeader title="T" actions={<button type="button">A</button>} />
      );
      const header = container.querySelector('header') as HTMLElement;
      expect(header.classList.contains('flex-col')).toBe(true);
      expect(header.classList.contains('sm:flex-row')).toBe(true);
      expect(header.classList.contains('sm:justify-between')).toBe(true);
    });

    it('lets the actions row wrap internally', () => {
      render(<PageHeader title="T" actions={<button type="button">A</button>} />);
      const actions = screen.getByRole('button', { name: 'A' }).parentElement as HTMLElement;
      expect(actions.classList.contains('flex-wrap')).toBe(true);
    });
  });

  describe('P5 element contract', () => {
    it('forwards ref to the header element', () => {
      const ref = React.createRef<HTMLElement>();
      render(<PageHeader ref={ref} title="T" />);
      expect(ref.current?.tagName).toBe('HEADER');
    });

    it('merges className and keeps base layout classes', () => {
      const { container } = render(<PageHeader title="T" className="custom-x" />);
      const header = container.querySelector('header') as HTMLElement;
      expect(header.classList.contains('custom-x')).toBe(true);
      expect(header.classList.contains('flex')).toBe(true);
    });

    it('passes through HTML attributes (data-*, id, aria-*)', () => {
      const { container } = render(
        <PageHeader title="T" id="ph" data-testid="page-header" aria-label="Page" />
      );
      const header = container.querySelector('header') as HTMLElement;
      expect(header.id).toBe('ph');
      expect(header.getAttribute('data-testid')).toBe('page-header');
      expect(header.getAttribute('aria-label')).toBe('Page');
    });

    it('does not leak the title into a native title attribute', () => {
      const { container } = render(<PageHeader title="Visible" />);
      expect(container.querySelector('header')?.hasAttribute('title')).toBe(false);
    });

    it('is exported from the ui barrel', () => {
      expect(ui.PageHeader).toBe(PageHeader);
    });
  });

  describe('P6 block description', () => {
    it('renders the description in a div, never a p', () => {
      const { container } = render(<PageHeader title="T" description="Plain text" />);
      expect(screen.getByText('Plain text').tagName).toBe('DIV');
      expect(container.querySelector('header p')).toBeNull();
    });

    it('keeps block content valid: paragraphs sit inside a div, not inside a p', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(
        <PageHeader
          title="T"
          description={
            <div>
              <p>First paragraph</p>
              <p>Second paragraph</p>
            </div>
          }
        />
      );
      const paragraphs = [...container.querySelectorAll('header p')];
      expect(paragraphs).toHaveLength(2);
      paragraphs.forEach((p) => expect(p.parentElement?.closest('p')).toBeNull());
      // React warns validateDOMNesting when a block element lands inside a p.
      expect(err).not.toHaveBeenCalled();
      err.mockRestore();
    });

    it('renders a list as the description', () => {
      render(
        <PageHeader
          title="T"
          description={
            <ul>
              <li>One</li>
            </ul>
          }
        />
      );
      expect(screen.getByRole('list')).toBeTruthy();
    });
  });

  describe('P7 titleEnd slot', () => {
    it('renders titleEnd beside the heading, in the same row', () => {
      render(<PageHeader title="Vault" titleEnd={<span data-testid="pill">Live</span>} />);
      const heading = screen.getByRole('heading', { name: 'Vault' });
      const pill = screen.getByTestId('pill');
      expect(heading.parentElement).toBe(pill.parentElement);
      expect(heading.parentElement?.classList.contains('flex')).toBe(true);
    });

    it('keeps titleEnd outside the heading element', () => {
      render(<PageHeader title="Vault" titleEnd={<span data-testid="pill">Live</span>} />);
      const heading = screen.getByRole('heading');
      expect(heading.contains(screen.getByTestId('pill'))).toBe(false);
    });

    it('keeps the heading accessible name to the title alone', () => {
      render(<PageHeader title="Vault" titleEnd={<span>Live</span>} />);
      expect(screen.getByRole('heading', { level: 1, name: 'Vault' })).toBeTruthy();
      expect(screen.getByRole('heading').textContent).toBe('Vault');
    });

    it('works with a custom titleLevel', () => {
      render(<PageHeader title="Vault" titleLevel={3} titleEnd={<span>Live</span>} />);
      expect(screen.getByRole('heading', { level: 3, name: 'Vault' })).toBeTruthy();
    });

    it('keeps the heading and description in the text column with titleEnd and actions', () => {
      const { container } = render(
        <PageHeader
          title="Vault"
          titleEnd={<span>Live</span>}
          description="Desc"
          actions={<button type="button">Go</button>}
        />
      );
      const header = container.querySelector('header') as HTMLElement;
      expect(header.children).toHaveLength(2);
      const text = header.children[0] as HTMLElement;
      expect(within(text).getByText('Live')).toBeTruthy();
      expect(within(text).getByText('Desc')).toBeTruthy();
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['false', false],
      ['empty string', ''],
    ])(
      'titleEnd=%s renders no title row: heading is a direct child of the text column',
      (_l, v) => {
        const { container } = render(<PageHeader title="Vault" titleEnd={v} />);
        const text = (container.querySelector('header') as HTMLElement).children[0] as HTMLElement;
        expect(text.children).toHaveLength(1);
        expect(text.children[0].tagName).toBe('H1');
      }
    );

    it('treats 0 as present titleEnd content', () => {
      render(<PageHeader title="Vault" titleEnd={0} />);
      expect(screen.getByText('0')).toBeTruthy();
    });
  });
});
