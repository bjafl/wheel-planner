import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RingManager } from './RingManager';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

vi.mock('../store/wheelStore');

describe('RingManager', () => {
  it('calls addRing when the add button is used', async () => {
    const addRing = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addRing, updateRing: vi.fn(), removeRing: vi.fn() });

    render(<RingManager rings={[]} />);
    await userEvent.type(screen.getByLabelText(/ringnavn/i), 'Kampanjer');
    await userEvent.click(screen.getByRole('button', { name: /legg til ring/i }));

    expect(addRing).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kampanjer' }));
  });

  it('calls removeRing when delete is clicked', async () => {
    const removeRing = vi.fn().mockResolvedValue(undefined);
    const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
    (useWheelStore as any).mockReturnValue({ addRing: vi.fn(), updateRing: vi.fn(), removeRing });

    render(<RingManager rings={[ring]} />);
    await userEvent.click(screen.getByRole('button', { name: /fjern/i }));

    expect(removeRing).toHaveBeenCalledWith('r1');
  });
});
