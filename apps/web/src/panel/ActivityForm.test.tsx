import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityForm } from './ActivityForm';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

vi.mock('../store/wheelStore');

const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };

describe('ActivityForm', () => {
  it('calls addActivity with form values on submit', async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addActivity });
    const onDone = vi.fn();

    render(<ActivityForm ring={ring} onDone={onDone} />);

    await userEvent.type(screen.getByLabelText(/tittel/i), 'Sommerkampanje');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ringId: 'r1', title: 'Sommerkampanje' })
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('includes a recurrenceRule when a repeat interval is chosen', async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addActivity });

    render(<ActivityForm ring={ring} onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/tittel/i), 'Månedsmøte');
    await userEvent.selectOptions(screen.getByLabelText(/gjentakelse/i), 'monthly');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceRule: { type: 'monthly', interval: 1, until: null } })
    );
  });
});
