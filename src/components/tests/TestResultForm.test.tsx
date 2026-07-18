import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { trainingTests } from '../../data/trainingTests';
import { TestResultForm } from './TestResultForm';

describe('TestResultForm accessibility', () => {
  it('associates validation feedback and focuses the first invalid control', () => {
    const test = trainingTests.find((item) => item.fields.some((field) => field.required && field.type !== 'boolean'))!;
    render(<TestResultForm test={test} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar resultado/i }));

    const requiredField = test.fields.find((field) => field.required && field.type !== 'boolean')!;
    const input = screen.getByLabelText(new RegExp(requiredField.label, 'i'));
    const alert = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(input).toHaveFocus();
  });
});
