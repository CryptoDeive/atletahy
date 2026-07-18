import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccountView } from './AccountView';
import {
  defaultAthleteProfile,
  defaultDailyReadiness,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../../data/defaultAthleteState';
import type { AthleteProfile } from '../../types/athlete';

function LegacyCategoryHarness({ onSave = vi.fn() }: { onSave?: ReturnType<typeof vi.fn> }) {
  const [profile, setProfile] = useState<AthleteProfile>({
    ...defaultAthleteProfile,
    hyroxCategory: '',
    hyroxCategoryLegacy: { value: 'Legacy Elite', label: 'Categoría anterior: Legacy Elite', ambiguous: true },
  });
  const [physiology, setPhysiology] = useState(defaultPhysiologyMetrics);
  const [availability, setAvailability] = useState(defaultTrainingAvailability);
  const [equipment, setEquipment] = useState(defaultEquipmentAvailability);
  const [injuries, setInjuries] = useState([]);
  const [nutrition, setNutrition] = useState(defaultNutritionPreferences);
  const [dailyReadiness, setDailyReadiness] = useState(defaultDailyReadiness);

  return <AccountView
    profile={profile} setProfile={setProfile}
    physiology={physiology} setPhysiology={setPhysiology}
    availability={availability} setAvailability={setAvailability}
    equipment={equipment} setEquipment={setEquipment}
    injuries={injuries} setInjuries={setInjuries}
    nutrition={nutrition} setNutrition={setNutrition}
    dailyReadiness={dailyReadiness} setDailyReadiness={setDailyReadiness}
    onBackToTraining={vi.fn()} authSession={null} onAuthSessionChange={vi.fn()}
    onSaveAthleteState={onSave} onSaveDailyReadiness={vi.fn()} onSyncLocalToSupabase={vi.fn()}
    onboardingPending={false} onEditOnboarding={vi.fn()} storageContext={{ mode: 'guest' }}
  />;
}

describe('AccountView legacy category correction', () => {
  it('keeps the historical category visible and associates the correction error with the select', async () => {
    const onSave = vi.fn();
    render(<LegacyCategoryHarness onSave={onSave} />);

    expect(screen.getByText(/Categoría anterior: Legacy Elite\. Selecciona una categoría oficial antes de guardar/)).toBeVisible();
    const category = screen.getByRole('combobox', { name: 'Categoría HYROX' });
    expect(category).toHaveAttribute('aria-invalid', 'true');
    expect(category).toHaveAttribute('aria-describedby');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect((await screen.findAllByText(/Selecciona una categoría oficial/)).length).toBeGreaterThan(0);
    expect(category).toHaveAttribute('aria-invalid', 'true');
    expect(category).toHaveAttribute('aria-describedby');
    expect(screen.getAllByText(/Categoría anterior: Legacy Elite/).length).toBeGreaterThan(0);
    expect(onSave).not.toHaveBeenCalled();
  });
});
