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
    await userEvent.type(screen.getByLabelText(/startdato/i), '2026-06-01');
    await userEvent.type(screen.getByLabelText(/sluttdato/i), '2026-08-01');
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
    await userEvent.type(screen.getByLabelText(/startdato/i), '2026-06-01');
    await userEvent.type(screen.getByLabelText(/sluttdato/i), '2026-08-01');
    await userEvent.selectOptions(screen.getByLabelText(/gjentakelse/i), 'monthly');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceRule: { type: 'monthly', interval: 1, until: null } })
    );
  });

  it('rejects submission with an empty startDate instead of persisting an empty string', async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addActivity });
    const onDone = vi.fn();

    render(<ActivityForm ring={ring} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText(/tittel/i), 'Uten startdato');
    await userEvent.type(screen.getByLabelText(/sluttdato/i), '2026-08-01');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('rejects submission of a range activity with an empty endDate', async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addActivity });
    const onDone = vi.fn();

    render(<ActivityForm ring={ring} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText(/tittel/i), 'Uten sluttdato');
    await userEvent.type(screen.getByLabelText(/startdato/i), '2026-06-01');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('allows submission with an empty endDate for a milestone activity', async () => {
    const updateActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ updateActivity });
    const onDone = vi.fn();
    const milestone = {
      id: 'a1',
      ringId: 'r1',
      title: 'Lansering',
      notes: null,
      kind: 'milestone' as const,
      startDate: '',
      endDate: null,
      recurrenceRule: null,
      lane: 0,
      color: null,
    };

    render(<ActivityForm ring={ring} activity={milestone} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText(/startdato/i), '2026-06-01');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(updateActivity).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ kind: 'milestone', startDate: '2026-06-01', endDate: null })
    );
    expect(onDone).toHaveBeenCalled();
  });
});
