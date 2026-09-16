import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Header } from './header';

describe('Header', () => {
  it('keeps rendering the existing title API', () => {
    render(<Header title="Operator Console" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operator Console' })).toBeDefined();
  });

  it('renders breadcrumb content in place of the title', () => {
    render(
      <Header
        title="Operator Console"
        breadcrumb={<nav aria-label="Breadcrumb">Request queue</nav>}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Operator Console' })).toBeNull();
  });
});
