import {
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../data/defaultAthleteState';
import type { AthleteState, Injury } from '../types/athlete';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { validateAthleteState } from '../domain/fields/schemas';
import { normalizeHyroxCategory, preserveLegacyOption } from '../domain/fields/legacy';
import { DIET_VALUES } from '../../supabase/functions/_shared/inputDomains';
import { athleteStorageResources, guestStorageContext, storageKey, type StorageContext } from './storageKeys';

export async function getAthleteState(context: StorageContext = guestStorageContext): Promise<AthleteState> {
  const rawProfile = readFromLocalStorage(storageKey(context, athleteStorageResources.profile), defaultAthleteProfile) as typeof defaultAthleteProfile & { hyroxCategory?: unknown };
  const category = normalizeHyroxCategory(rawProfile.hyroxCategory, rawProfile.sex);
  const profile = typeof category === 'string' ? { ...rawProfile, hyroxCategory: category, hyroxCategoryLegacy: undefined } : { ...rawProfile, hyroxCategory: '' as const, hyroxCategoryLegacy: category };
  const rawNutrition = { ...defaultNutritionPreferences, ...readFromLocalStorage(storageKey(context, athleteStorageResources.nutrition), defaultNutritionPreferences) };
  const diet = preserveLegacyOption(rawNutrition.dietType, DIET_VALUES);
  return {
    profile,
    physiology: readFromLocalStorage(storageKey(context, athleteStorageResources.physiology), defaultPhysiologyMetrics),
    availability: readFromLocalStorage(storageKey(context, athleteStorageResources.availability), defaultTrainingAvailability),
    equipment: readFromLocalStorage(storageKey(context, athleteStorageResources.equipment), defaultEquipmentAvailability),
    injuries: readFromLocalStorage<Injury[]>(storageKey(context, athleteStorageResources.injuries), []),
    nutrition: { ...rawNutrition, dietType: diet.value, dietTypeLegacy: diet.legacy },
  };
}

export async function saveAthleteState(state: AthleteState, context: StorageContext = guestStorageContext): Promise<void> {
  const validation = validateAthleteState(state); if (!validation.ok) throw new Error(validation.issues[0]?.message ?? 'Datos del atleta no válidos.');
  state = validation.value;
  writeToLocalStorage(storageKey(context, athleteStorageResources.profile), state.profile);
  writeToLocalStorage(storageKey(context, athleteStorageResources.physiology), state.physiology);
  writeToLocalStorage(storageKey(context, athleteStorageResources.availability), state.availability);
  writeToLocalStorage(storageKey(context, athleteStorageResources.equipment), state.equipment);
  writeToLocalStorage(storageKey(context, athleteStorageResources.injuries), state.injuries);
  writeToLocalStorage(storageKey(context, athleteStorageResources.nutrition), state.nutrition);
}
