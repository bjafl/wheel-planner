import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MonthRing } from './MonthRing';

describe('MonthRing', () => {
  it('renders 12 month arcs', () => {
    const { container } = render(
      <svg>
        <MonthRing year={2026} />
      </svg>
    );
    expect(container.querySelectorAll('path[data-month]')).toHaveLength(12);
  });
});
