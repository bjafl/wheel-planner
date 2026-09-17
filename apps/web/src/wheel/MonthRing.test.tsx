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

  it('renders 12 month name labels, in order starting with January', () => {
    const { container } = render(
      <svg>
        <MonthRing year={2026} />
      </svg>
    );
    const labels = Array.from(container.querySelectorAll('text[data-month-label]'));
    expect(labels).toHaveLength(12);
    expect(labels[0].textContent).toBe('Jan');
    expect(labels[11].textContent).toBe('Des');
  });
});
