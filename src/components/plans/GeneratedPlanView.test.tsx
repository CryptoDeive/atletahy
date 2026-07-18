import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { validGeneratedTrainingPlan } from '../../test/planTestUtils';
import { GeneratedPlanView } from './GeneratedPlanView';

describe('GeneratedPlanView', () => {
  it('shows weeks and days', () => {
    render(<GeneratedPlanView plan={validGeneratedTrainingPlan} />);

    expect(screen.getByLabelText(/Plan generado/i)).toBeInTheDocument();
    expect(screen.getByText(/Semana 1/i)).toBeInTheDocument();
    expect(screen.getByText('Run Z2 + movilidad')).toBeInTheDocument();
    expect(screen.getAllByText('Rest')[0]).toBeInTheDocument();
  });
});
