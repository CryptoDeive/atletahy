import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { trainingWeeks } from '../data/trainingWeeks';
import { WorkoutLogForm } from './WorkoutLogForm';

describe('WorkoutLogForm validation accessibility', () => {
  it('connects the first coherence error to its field and does not persist', async () => {
    const week = trainingWeeks[0]; const day = week.days[0]; const onSave = vi.fn();
    render(<WorkoutLogForm activeWeek={week} activeDay={day} date="2026-07-18" savedLog={null} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir registro/i }));
    fireEvent.change(screen.getByLabelText(/Duración \(min\)/i), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(/RPE sesión/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('FC media'), { target: { value: '190' } });
    fireEvent.change(screen.getByLabelText('FC máxima'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    const average = screen.getByLabelText('FC media');
    expect(average).toHaveAttribute('aria-invalid', 'true');
    expect(average).toHaveAttribute('aria-describedby');
    expect(onSave).not.toHaveBeenCalled();
  });
});
