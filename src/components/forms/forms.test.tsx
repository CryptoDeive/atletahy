import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccessibleCombobox } from './AccessibleCombobox';
import { SelectField } from './SelectField';
import { DurationField } from './DurationField';

describe('accessible form primitives', () => {
  it('filters a large list, exposes errors and supports keyboard selection', () => {
    const onChange = vi.fn();
    render(<AccessibleCombobox label="Altura" value="" options={[{ value: 170, label: '170 cm' }, { value: 171, label: '171 cm' }]} onChange={onChange} error="Requerido" />);
    const input = screen.getByRole('combobox', { name: /altura/i });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.focus(input); fireEvent.change(input, { target: { value: '171' } }); fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(171);
  });

  it('associates labels, descriptions and units', () => {
    render(<SelectField label="Categoría" value="" options={[{ value: 'women_open', label: 'Women Open' }]} onChange={() => {}} error="Selecciona" />);
    expect(screen.getByRole('combobox', { name: /categoría/i })).toHaveAttribute('aria-describedby');
    render(<DurationField label="Tiempo" value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/tiempo/i)).toHaveAttribute('placeholder', 'hh:mm:ss');
  });

  it('invalidates the selected value as soon as the visible query stops matching it', () => {
    const onChange = vi.fn();
    render(<AccessibleCombobox label="Altura" value={170} options={[{ value: 170, label: '170 cm' }]} onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Altura' });
    fireEvent.change(input, { target: { value: '999' } });
    expect(input).toHaveValue('999');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenCalledWith('');
  });
});
